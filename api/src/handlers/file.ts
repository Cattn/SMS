import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import path from 'path';
import { progressStore } from '../progressStore';
import fs from 'fs';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            res.status(400).send('No files were uploaded.');
            return;
        }

        const file = req.files.file as UploadedFile;
        const uploadToken = req.body.uploadToken as string;
        
        if (!uploadToken) {
            res.status(400).send('Upload token is required.');
            return;
        }

        const uploadsDir = path.join(process.cwd(), '../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const uploadPath = path.join(uploadsDir, file.name);

        progressStore.setProgress(uploadToken, 0, file.name);
        console.log(`Starting upload for token: ${uploadToken}, file: ${file.name}`);

        let currentProgress = 5;
        const progressInterval = setInterval(() => {
            if (currentProgress < 90) {
                currentProgress += Math.random() * 5 + 2;
                progressStore.setProgress(uploadToken, Math.min(currentProgress, 90), file.name);
            }
        }, 200);

        file.mv(uploadPath, (err) => {
            clearInterval(progressInterval);
            
            if (err) {
                console.error(`Upload failed for token ${uploadToken}:`, err);
                progressStore.setProgress(uploadToken, -1);
                res.status(500).json({ error: 'Upload failed', details: err.message });
                return;
            }
            
            console.log(`Upload completed for token: ${uploadToken}`);
            progressStore.setProgress(uploadToken, 100, file.name);
            
            setTimeout(() => {
                progressStore.deleteProgress(uploadToken);
            }, 5000);
            
            res.json({ message: 'File uploaded successfully', filename: file.name });
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed', details: error });
    }
};

// prob won't use this
/* export const getFile = (req: Request, res: Response, next: NextFunction): void => {
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    res.sendFile(filePath);
}; */
