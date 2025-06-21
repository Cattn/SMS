import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
    try {
        const filename = req.params.filename;
        
        if (!filename) {
            res.status(400).json({ error: 'Filename is required' });
            return;
        }

        const uploadsDir = path.join(process.cwd(), '../uploads');
        const filePath = path.join(uploadsDir, filename);
        
        const normalizedUploadsDir = path.resolve(uploadsDir);
        const normalizedFilePath = path.resolve(filePath);
        
        if (!normalizedFilePath.startsWith(normalizedUploadsDir)) {
            res.status(403).json({ error: 'Access denied: file must be within uploads directory' });
            return;
        }

        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        fs.unlinkSync(filePath);
        
        res.json({ message: 'File deleted successfully', filename });
    } catch {
        res.status(500).json({ error: 'Unable to delete file' });
    }
};
