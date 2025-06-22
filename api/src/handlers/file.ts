import { Request, Response } from 'express';
import path from 'path';
import { progressStore } from '../services/progressStore';
import { DeletionManager } from '../services/timer';
import fs from 'fs';
import Busboy from 'busboy';

function parseDuration(duration: string): Date {
	const match = duration.match(/^(\d+)([smhdw])$/);
	if (!match) {
		throw new Error('Invalid duration format. Use format like "1h", "30m", "1d"');
	}

	const [, amount, unit] = match;
	const now = new Date();
	const value = parseInt(amount, 10);

	switch (unit) {
		case 's':
			return new Date(now.getTime() + value * 1000);
		case 'm':
			return new Date(now.getTime() + value * 60 * 1000);
		case 'h':
			return new Date(now.getTime() + value * 60 * 60 * 1000);
		case 'd':
			return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
		case 'w':
			return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
		default:
			throw new Error('Invalid duration unit');
	}
}

function normalizeUploadPath(uploadPath: string): string {
	if (!uploadPath || uploadPath.trim() === '') {
		return '';
	}

	let normalized = uploadPath.trim();

	if (normalized.startsWith('/')) {
		normalized = normalized.substring(1);
	}

	if (normalized.endsWith('/')) {
		normalized = normalized.substring(0, normalized.length - 1);
	}

	return normalized;
}

function validateUploadPath(uploadPath: string): string | null {
	if (!uploadPath) return null;

	const invalidChars = /[<>:"/\\|?*]/;
	const hasControlChars = uploadPath.split('').some((char: string) => char.charCodeAt(0) <= 31);
	if (invalidChars.test(uploadPath) || hasControlChars) {
		return 'Upload path contains invalid characters';
	}

	const pathDepth = uploadPath.split('/').length;
	if (pathDepth > 10) {
		return 'Maximum folder depth exceeded (10 levels)';
	}

	const reservedNames = [
		'CON',
		'PRN',
		'AUX',
		'NUL',
		'COM1',
		'COM2',
		'COM3',
		'COM4',
		'COM5',
		'COM6',
		'COM7',
		'COM8',
		'COM9',
		'LPT1',
		'LPT2',
		'LPT3',
		'LPT4',
		'LPT5',
		'LPT6',
		'LPT7',
		'LPT8',
		'LPT9'
	];
	const pathParts = uploadPath.split('/');
	for (const part of pathParts) {
		if (reservedNames.includes(part.toUpperCase())) {
			return 'Upload path contains reserved folder name';
		}
		if (part.length > 255) {
			return 'Folder name too long in upload path';
		}
	}

	return null;
}

export const uploadFile = (req: Request, res: Response): void => {
	const totalSizeHeader = parseInt(req.headers['content-length'] || '0', 10);
	let totalBytesReceived = 0;
	let uploadToken = '';
	let lastProgressUpdate = 0;
	let lastProgressTime = 0;
	let expiresIn = '';
	let expiresAt = '';
	let uploadPath = '';

	req.on('data', (chunk: Buffer) => {
		totalBytesReceived += chunk.length;
		if (totalSizeHeader > 0) {
			const percent = Math.min(99, Math.floor((totalBytesReceived / totalSizeHeader) * 100));
			const now = Date.now();

			if (
				percent !== lastProgressUpdate &&
				(now - lastProgressTime > 500 || percent - lastProgressUpdate >= 5)
			) {
				lastProgressUpdate = percent;
				lastProgressTime = now;

				if (uploadToken) {
					progressStore.setProgress(uploadToken, percent);
				}
			}
		}
	});

	const busboy = Busboy({
		headers: req.headers,
		highWaterMark: 16 * 1024
	});

	let filename = '';
	const fileBuffers: Buffer[] = [];
	const uploadsDir = path.join(process.cwd(), '../uploads');
	if (!fs.existsSync(uploadsDir)) {
		fs.mkdirSync(uploadsDir, { recursive: true });
	}

	busboy.on('field', (fieldname, val) => {
		if (fieldname === 'uploadToken') {
			uploadToken = val;
			const currentPercent =
				totalSizeHeader > 0
					? Math.min(99, Math.floor((totalBytesReceived / totalSizeHeader) * 100))
					: 1;
			progressStore.setProgress(uploadToken, Math.max(currentPercent, 1));
		} else if (fieldname === 'expiresIn') {
			expiresIn = val;
		} else if (fieldname === 'expiresAt') {
			expiresAt = val;
		} else if (fieldname === 'uploadPath') {
			uploadPath = normalizeUploadPath(val);
			console.log('Upload path received:', val, '-> normalized:', uploadPath);
		}
	});

	busboy.on('file', (fieldname, file, info) => {
		filename = info.filename || 'uploaded_file';

		file.on('data', (chunk: Buffer) => {
			fileBuffers.push(chunk);
		});

		file.on('end', () => {
			if (uploadToken) {
				progressStore.setProgress(uploadToken, 99, filename);
			}
		});
	});

	busboy.on('finish', async () => {
		try {
			if (uploadPath) {
				const validationError = validateUploadPath(uploadPath);
				if (validationError) {
					return res.status(400).json({ error: validationError });
				}
			}

			const targetDir = uploadPath ? path.join(uploadsDir, uploadPath) : uploadsDir;

			if (!fs.existsSync(targetDir)) {
				try {
					fs.mkdirSync(targetDir, { recursive: true });
					console.log('Created directory:', targetDir);
				} catch (error) {
					console.error('Failed to create directory:', error);
					return res.status(500).json({ error: 'Failed to create upload directory' });
				}
			}

			const normalizedUploadsDir = path.resolve(uploadsDir);
			const normalizedTargetDir = path.resolve(targetDir);
			if (!normalizedTargetDir.startsWith(normalizedUploadsDir)) {
				return res
					.status(403)
					.json({ error: 'Access denied: upload path must be within uploads directory' });
			}

			const finalUploadPath = path.join(targetDir, filename);
			const fileBuffer = Buffer.concat(fileBuffers);
			fs.writeFileSync(finalUploadPath, fileBuffer);
			console.log('File written to:', finalUploadPath);

			if (uploadToken) {
				progressStore.setProgress(uploadToken, 100, filename);
				setTimeout(() => progressStore.deleteProgress(uploadToken), 5000);
			}

			if (expiresIn || expiresAt) {
				let deletionTime: Date;

				if (expiresIn) {
					deletionTime = parseDuration(expiresIn);
				} else {
					deletionTime = new Date(expiresAt);
				}

				if (deletionTime <= new Date()) {
					return res.status(400).json({ error: 'Expiration time must be in the future' });
				}

				const scheduleId = await DeletionManager.scheduleFileDeletion(
					filename,
					finalUploadPath,
					deletionTime
				);

				res.json({
					message: 'File uploaded successfully',
					filename,
					uploadPath: uploadPath || '',
					expiresAt: deletionTime,
					scheduleId
				});
			} else {
				res.json({
					message: 'File uploaded successfully',
					filename,
					uploadPath: uploadPath || ''
				});
			}
		} catch (error) {
			console.error('Upload error:', error);
			if (uploadToken) {
				progressStore.setProgress(uploadToken, -1);
			}
			const message =
				error && typeof error === 'object' && 'message' in error
					? (error as { message: string }).message
					: 'Upload failed';
			res.status(500).json({ error: 'Upload failed', details: message });
		}
	});

	busboy.on('error', (err: unknown) => {
		console.error('Busboy error:', err);
		if (uploadToken) {
			progressStore.setProgress(uploadToken, -1);
		}
		const message =
			err && typeof err === 'object' && 'message' in err
				? (err as { message: string }).message
				: 'Unknown error';
		res.status(500).json({ error: 'Upload failed', details: message });
	});

	req.pipe(busboy);
};

// prob won't use this
/* export const getFile = (req: Request, res: Response, next: NextFunction): void => {
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    res.sendFile(filePath);
}; */
