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
        case 's': return new Date(now.getTime() + value * 1000);
        case 'm': return new Date(now.getTime() + value * 60 * 1000);
        case 'h': return new Date(now.getTime() + value * 60 * 60 * 1000);
        case 'd': return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
        case 'w': return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
        default: throw new Error('Invalid duration unit');
    }
}

export const uploadFile = (req: Request, res: Response): void => {
    const totalSizeHeader = parseInt(req.headers['content-length'] || '0', 10);
    let totalBytesReceived = 0;
    let uploadToken = '';
    let lastProgressUpdate = 0;
    let lastProgressTime = 0;
    let expiresIn = '';
    let expiresAt = '';
    
    req.on('data', (chunk: Buffer) => {
        totalBytesReceived += chunk.length;
        if (totalSizeHeader > 0) {
            const percent = Math.min(99, Math.floor((totalBytesReceived / totalSizeHeader) * 100));
            const now = Date.now();
            
            if (percent !== lastProgressUpdate && (now - lastProgressTime > 500 || percent - lastProgressUpdate >= 5)) {
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
        highWaterMark: 16 * 1024,
    });

    let filename = '';
    const uploadsDir = path.join(process.cwd(), '../uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    busboy.on('field', (fieldname, val) => {
        if (fieldname === 'uploadToken') {
            uploadToken = val;
            const currentPercent = totalSizeHeader > 0 ? Math.min(99, Math.floor((totalBytesReceived / totalSizeHeader) * 100)) : 1;
            progressStore.setProgress(uploadToken, Math.max(currentPercent, 1));
        } else if (fieldname === 'expiresIn') {
            expiresIn = val;
        } else if (fieldname === 'expiresAt') {
            expiresAt = val;
        }
    });

    busboy.on('file', (fieldname, file, info) => {
        filename = info.filename || 'uploaded_file';
        const uploadPath = path.join(uploadsDir, filename);
        const writeStream = fs.createWriteStream(uploadPath);

        file.on('end', () => {
            if (uploadToken) {
                progressStore.setProgress(uploadToken, 99, filename);
            }
        });

        file.pipe(writeStream);
    });

    busboy.on('finish', async () => {
        try {
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
                
                const filePath = path.join(uploadsDir, filename);
                const scheduleId = await DeletionManager.scheduleFileDeletion(
                    filename, 
                    filePath, 
                    deletionTime
                );
                
                res.json({ 
                    message: 'File uploaded successfully',
                    filename,
                    expiresAt: deletionTime,
                    scheduleId
                });
            } else {
                res.json({ 
                    message: 'File uploaded successfully',
                    filename
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            if (uploadToken) {
                progressStore.setProgress(uploadToken, -1);
            }
            const message = error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : 'Upload failed';
            res.status(500).json({ error: 'Upload failed', details: message });
        }
    });

    busboy.on('error', (err: unknown) => {
        console.error('Busboy error:', err);
        if (uploadToken) {
            progressStore.setProgress(uploadToken, -1);
        }
        const message = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Unknown error';
        res.status(500).json({ error: 'Upload failed', details: message });
    });

    req.pipe(busboy);
};

// prob won't use this
/* export const getFile = (req: Request, res: Response, next: NextFunction): void => {
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    res.sendFile(filePath);
}; */
