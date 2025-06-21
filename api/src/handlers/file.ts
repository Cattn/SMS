import { Request, Response } from 'express';
import path from 'path';
import { progressStore } from '../progressStore';
import fs from 'fs';
import Busboy from 'busboy';

export const uploadFile = (req: Request, res: Response): void => {
    console.log('Upload started, content-length:', req.headers['content-length']);
    
    const totalSizeHeader = parseInt(req.headers['content-length'] || '0', 10);
    let totalBytesReceived = 0;
    let uploadToken = '';
    let lastProgressUpdate = 0;
    let lastProgressTime = 0;
    
    req.on('data', (chunk: Buffer) => {
        totalBytesReceived += chunk.length;
        if (totalSizeHeader > 0) {
            const percent = Math.min(99, Math.floor((totalBytesReceived / totalSizeHeader) * 100));
            const now = Date.now();
            
            if (percent !== lastProgressUpdate && (now - lastProgressTime > 100 || percent - lastProgressUpdate >= 1)) {
                console.log(`Raw request progress: ${percent}% (${totalBytesReceived}/${totalSizeHeader} bytes)`);
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
        console.log(`Field received: ${fieldname} = ${val}`);
        if (fieldname === 'uploadToken') {
            uploadToken = val;
            const currentPercent = totalSizeHeader > 0 ? Math.min(99, Math.floor((totalBytesReceived / totalSizeHeader) * 100)) : 1;
            progressStore.setProgress(uploadToken, Math.max(currentPercent, 1));
        }
    });

    busboy.on('file', (fieldname, file, info) => {
        console.log(`File stream started: ${info.filename}`);
        filename = info.filename || 'uploaded_file';
        const uploadPath = path.join(uploadsDir, filename);
        const writeStream = fs.createWriteStream(uploadPath);

        file.on('end', () => {
            console.log('File stream ended');
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
