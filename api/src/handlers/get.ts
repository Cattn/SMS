import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db/db';

export const getFiles = async (req: Request, res: Response): Promise<void> => {
    try {
        const uploadsDir = path.join(process.cwd(), '../uploads');
        const files = fs.readdirSync(uploadsDir);
        
        const filesWithSizes = files.map(filename => {
            const filePath = path.join(uploadsDir, filename);
            const stats = fs.statSync(filePath);
            return {
                name: filename,
                size: stats.size
            };
        });
        
        res.json({ files: filesWithSizes });
    } catch {
        res.status(500).json({ error: 'Unable to read uploads directory' });
    }
};

export const getFile = async (req: Request, res: Response): Promise<void> => {
    const filePath = path.join(process.cwd(), '../uploads', req.params.filename);
    res.sendFile(filePath);
};

export const getFileExpiration = async (req: Request, res: Response): Promise<void> => {
    try {
        const filename = req.params.filename;
        
        const row = await db.get<{scheduled_at: number, status: string}>(
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