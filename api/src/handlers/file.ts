import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import path from 'path';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
    if (!req.files || Object.keys(req.files).length === 0) {
        res.status(400).send('No files were uploaded.');
        return;
    }
    const file = req.files.file as UploadedFile;
    const uploadPath = path.join(process.cwd(), '../uploads', file.name);

    file.mv(uploadPath, (err) => {
        if (err) {
            res.status(500).send(err);
            return;
        }
        res.json({ message: 'File uploaded successfully', filename: file.name });
    });
};

// prob won't use this
/* export const getFile = (req: Request, res: Response, next: NextFunction): void => {
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    res.sendFile(filePath);
}; */
