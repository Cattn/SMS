import { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { once } from 'events';
import { pipeline } from 'stream/promises';
import { DeletionManager } from '../services/timer';
import { parseDuration, normalizeUploadPath, validateUploadPath, moveFile } from './file';

interface UploadSession {
	id: string;
	filename: string;
	size: number;
	uploadPath: string;
	expiresIn?: string;
	expiresAt?: string;
	createdAt: number;
}

const partialDir = path.join(process.cwd(), 'data', 'partial');
const uploadsDir = path.join(process.cwd(), '../uploads');
const SESSION_TTL = 24 * 60 * 60 * 1000;
const active = new Set<string>();

const metaPath = (id: string) => path.join(partialDir, `${id}.json`);
const dataPath = (id: string) => path.join(partialDir, `${id}.part`);

function loadSession(id: string): UploadSession | null {
	if (!/^[a-f0-9-]{36}$/.test(id) || !fs.existsSync(metaPath(id))) return null;
	return JSON.parse(fs.readFileSync(metaPath(id), 'utf8'));
}

const offsetOf = (id: string) => fs.statSync(dataPath(id)).size;

function removeSession(id: string) {
	fs.rmSync(metaPath(id), { force: true });
	fs.rmSync(dataPath(id), { force: true });
}

export const createUpload = (req: Request, res: Response): void => {
	const { filename, size, expiresIn, expiresAt } = req.body ?? {};
	const uploadPath = normalizeUploadPath(req.body?.uploadPath ?? '');
	const name = path.basename(String(filename ?? ''));

	if (!name || !Number.isSafeInteger(size) || size < 0) {
		res.status(400).json({ error: 'A filename and file size are required' });
		return;
	}
	const resolvedTarget = path.resolve(uploadsDir, uploadPath);
	const pathError =
		validateUploadPath(uploadPath) ??
		(resolvedTarget === path.resolve(uploadsDir) ||
		resolvedTarget.startsWith(path.resolve(uploadsDir) + path.sep)
			? null
			: 'Upload path must be within uploads directory');
	if (pathError) {
		res.status(400).json({ error: pathError });
		return;
	}
	try {
		const deletionTime = expiresIn ? parseDuration(expiresIn) : expiresAt && new Date(expiresAt);
		if (deletionTime && !(deletionTime > new Date())) {
			throw new Error('Expiration time must be in the future');
		}
	} catch (error) {
		res.status(400).json({ error: (error as Error).message });
		return;
	}

	const session: UploadSession = {
		id: crypto.randomUUID(),
		filename: name,
		size,
		uploadPath,
		expiresIn: expiresIn || undefined,
		expiresAt: expiresAt || undefined,
		createdAt: Date.now()
	};
	fs.mkdirSync(partialDir, { recursive: true });
	fs.writeFileSync(dataPath(session.id), '');
	fs.writeFileSync(metaPath(session.id), JSON.stringify(session));
	res.status(201).json({ id: session.id, offset: 0, size });
};

export const getUploadStatus = (req: Request<{ id: string }>, res: Response): void => {
	const session = loadSession(req.params.id);
	if (!session) {
		res.status(404).json({ error: 'Upload session not found' });
		return;
	}
	res.json({ id: session.id, offset: offsetOf(session.id), size: session.size });
};

export const appendUpload = async (req: Request<{ id: string }>, res: Response) => {
	const session = loadSession(req.params.id);
	if (!session) {
		res.status(404).json({ error: 'Upload session not found' });
		return;
	}
	const { id } = session;
	if (active.has(id)) {
		res.status(409).json({ error: 'Upload already in progress', offset: offsetOf(id) });
		return;
	}

	const offset = offsetOf(id);
	if (Number(req.headers['upload-offset']) !== offset) {
		res.status(409).json({ error: 'Offset mismatch', offset });
		return;
	}

	active.add(id);
	const out = fs.createWriteStream(dataPath(id), { flags: 'a' });
	await pipeline(req, out).catch(() => undefined);
	if (!out.closed) await once(out, 'close');

	try {
		const received = offsetOf(id);
		if (received > session.size) {
			removeSession(id);
			res.status(400).json({ error: 'Received more data than the declared file size' });
		} else if (received < session.size) {
			res.json({ offset: received, size: session.size });
		} else {
			res.json(await finalize(session));
		}
	} catch (error) {
		console.error('Finalizing upload failed:', error);
		if (!res.headersSent) res.status(500).json({ error: 'Failed to save upload' });
	} finally {
		active.delete(id);
	}
};

async function finalize(session: UploadSession) {
	const targetDir = path.join(uploadsDir, session.uploadPath);
	if (!path.resolve(targetDir).startsWith(path.resolve(uploadsDir))) {
		throw new Error('Upload path must be within uploads directory');
	}
	fs.mkdirSync(targetDir, { recursive: true });

	const finalPath = path.join(targetDir, session.filename);
	await moveFile(dataPath(session.id), finalPath);
	removeSession(session.id);
	console.log('File written to:', finalPath);

	const result = {
		message: 'File uploaded successfully',
		filename: session.filename,
		uploadPath: session.uploadPath,
		offset: session.size,
		size: session.size
	};
	if (!session.expiresIn && !session.expiresAt) return result;

	const deletionTime = session.expiresIn
		? parseDuration(session.expiresIn)
		: new Date(session.expiresAt!);
	if (deletionTime <= new Date()) return result;

	const scheduleId = await DeletionManager.scheduleFileDeletion(
		session.filename,
		finalPath,
		deletionTime
	);
	return { ...result, expiresAt: deletionTime, scheduleId };
}

function cleanupStaleSessions() {
	if (!fs.existsSync(partialDir)) return;
	for (const file of fs.readdirSync(partialDir).filter((f) => f.endsWith('.json'))) {
		const id = file.slice(0, -'.json'.length);
		const lastWrite = fs.existsSync(dataPath(id))
			? fs.statSync(dataPath(id)).mtimeMs
			: fs.statSync(metaPath(id)).mtimeMs;
		if (!active.has(id) && Date.now() - lastWrite > SESSION_TTL) removeSession(id);
	}
}

setInterval(cleanupStaleSessions, 60 * 60 * 1000).unref();
