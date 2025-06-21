import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import path from 'path';
import { progressStore } from '../progressStore';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
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

    const uploadPath = path.join(process.cwd(), '../uploads', file.name);

    progressStore.setProgress(uploadToken, 0, file.name);

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 8 + 3;
        if (currentProgress < 85) {
            progressStore.setProgress(uploadToken, Math.min(currentProgress, 85), file.name);
        }
    }, 150);

    file.mv(uploadPath, (err) => {
        clearInterval(progressInterval);
        
        if (err) {
            progressStore.setProgress(uploadToken, -1);
            res.status(500).send(err);
            return;
        }
        
        progressStore.setProgress(uploadToken, 100, file.name);
        
        setTimeout(() => {
            progressStore.deleteProgress(uploadToken);
        }, 2000);
        
        res.json({ message: 'File uploaded successfully', filename: file.name });
    });
};

// prob won't use this
/* export const getFile = (req: Request, res: Response, next: NextFunction): void => {
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    res.sendFile(filePath);
}; */
