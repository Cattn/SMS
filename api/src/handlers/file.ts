import { Request, Response } from 'express';
import path from 'path';
import { progressStore } from '../progressStore';
import fs from 'fs';
import Busboy from 'busboy';

export const uploadFile = (req: Request, res: Response): void => {
    const busboy = Busboy({ headers: req.headers });

    let uploadToken = '';
    let filename = '';
    const uploadsDir = path.join(process.cwd(), '../uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const totalSizeHeader = parseInt(req.headers['content-length'] || '0', 10);
    let bytesReceived = 0;

    busboy.on('field', (fieldname, val) => {
        if (fieldname === 'uploadToken') {
            uploadToken = val;
            progressStore.setProgress(uploadToken, 1);
        }
    });

    busboy.on('file', (fieldname, file, info) => {
        filename = info.filename || 'uploaded_file';
        const uploadPath = path.join(uploadsDir, filename);
        const writeStream = fs.createWriteStream(uploadPath);

        file.on('data', (data: Buffer) => {
            bytesReceived += data.length;
            if (uploadToken && totalSizeHeader) {
                const percent = Math.min(99, Math.floor((bytesReceived / totalSizeHeader) * 100));
                progressStore.setProgress(uploadToken, percent, filename);
            }
        });

        file.on('end', () => {
            if (uploadToken) {
                progressStore.setProgress(uploadToken, 99, filename);
            }
        });

        file.pipe(writeStream);
    });

    busboy.on('finish', () => {
        if (uploadToken) {
            progressStore.setProgress(uploadToken, 100, filename);
            setTimeout(() => progressStore.deleteProgress(uploadToken), 5000);
        }
        res.json({ message: 'File uploaded successfully', filename });
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
