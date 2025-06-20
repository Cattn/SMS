import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export const getFiles = async (req: Request, res: Response): Promise<void> => {
    try {
        const uploadsDir = path.join(process.cwd(), '../uploads');
        const files = fs.readdirSync(uploadsDir);
        res.json({ files });
    } catch {
        res.status(500).json({ error: 'Unable to read uploads directory' });
    }
};

export const getFile = async (req: Request, res: Response): Promise<void> => {
    const filePath = path.join(process.cwd(), '../uploads', req.params.filename);
    res.sendFile(filePath);
};