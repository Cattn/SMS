import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db/db';

interface FileInfo {
	name: string;
	size: number;
	relative_path: string;
	is_directory: boolean;
}

export const getFiles = async (req: Request, res: Response): Promise<void> => {
	try {
		const uploadsDir = path.join(process.cwd(), '../uploads');

		const excludedFolders = await db.all<{ relative_path: string }>(
			'SELECT relative_path FROM folders WHERE is_excluded = 1'
		);
		const excludedPaths = new Set(excludedFolders.map((folder) => folder.relative_path));

		const getAllFiles = (
			dir: string,
			relativePath: string = ''
		): Array<{ name: string; size: number; relative_path: string }> => {
			const items = fs.readdirSync(dir);
			const files: Array<{ name: string; size: number; relative_path: string }> = [];

			for (const item of items) {
				const itemPath = path.join(dir, item);
				const itemRelativePath = relativePath ? path.posix.join(relativePath, item) : item;
				const stats = fs.statSync(itemPath);

				if (stats.isDirectory()) {
					if (!excludedPaths.has(itemRelativePath)) {
						files.push(...getAllFiles(itemPath, itemRelativePath));
					}
				} else {
					const fileFolder = relativePath;
					let isInExcludedFolder = false;

					for (const excludedPath of excludedPaths) {
						if (fileFolder === excludedPath || fileFolder.startsWith(excludedPath + '/')) {
							isInExcludedFolder = true;
							break;
						}
					}

					if (!isInExcludedFolder) {
						files.push({
							name: item,
							size: stats.size,
							relative_path: itemRelativePath
						});
					}
				}
			}

			return files;
		};

		const allFiles = getAllFiles(uploadsDir);

		const filesWithSizes = allFiles.map((file) => ({
			name: file.name,
			size: file.size,
			relative_path: file.relative_path
		}));

		res.json({ files: filesWithSizes });
	} catch (error) {
		console.error('Error reading files:', error);
		res.status(500).json({ error: 'Unable to read uploads directory' });
	}
};

export const getFilesInPath = async (req: Request, res: Response): Promise<void> => {
	try {
		const { folderPath = '' } = req.query;
		const folderPathStr = typeof folderPath === 'string' ? folderPath : '';

		const uploadsDir = path.join(process.cwd(), '../uploads');
		const targetDir = folderPathStr ? path.join(uploadsDir, folderPathStr) : uploadsDir;

		const normalizedUploadsDir = path.resolve(uploadsDir);
		const normalizedTargetDir = path.resolve(targetDir);

		if (!normalizedTargetDir.startsWith(normalizedUploadsDir)) {
			res.status(403).json({ error: 'Access denied: path must be within uploads directory' });
			return;
		}

		if (!fs.existsSync(targetDir)) {
			res.status(404).json({ error: 'Directory not found' });
			return;
		}

		const items = fs.readdirSync(targetDir);
		const filesAndFolders: FileInfo[] = [];

		for (const item of items) {
			const itemPath = path.join(targetDir, item);
			const stats = fs.statSync(itemPath);
			const relativePath = folderPathStr ? path.posix.join(folderPathStr, item) : item;

			if (!stats.isDirectory()) {
				filesAndFolders.push({
					name: item,
					size: stats.size,
					relative_path: relativePath,
					is_directory: false
				});
			}
		}

		res.json({ files: filesAndFolders, currentPath: folderPathStr });
	} catch (error) {
		console.error('Error reading directory:', error);
		res.status(500).json({ error: 'Unable to read directory' });
	}
};

export const getFile = async (req: Request, res: Response): Promise<void> => {
	const filePath = path.join(process.cwd(), '../uploads', req.params.filename);
	res.sendFile(filePath);
};

export const getFileExpiration = async (req: Request, res: Response): Promise<void> => {
	try {
		const filename = req.params.filename;

		const row = await db.get<{ scheduled_at: number; status: string }>(
			'SELECT scheduled_at, status FROM scheduled_deletions WHERE filename = ? AND status = "PENDING"',
			[filename]
		);

		if (row) {
			const expiresAt = new Date(row.scheduled_at);
			res.json({
				hasExpiration: true,
				expiresAt: expiresAt.toISOString(),
				timeRemaining: Math.max(0, expiresAt.getTime() - Date.now())
			});
		} else {
			res.json({
				hasExpiration: false
			});
		}
	} catch (error) {
		console.error('Error checking file expiration:', error);
		res.status(500).json({ error: 'Unable to check file expiration' });
	}
};
