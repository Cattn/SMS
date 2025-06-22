import { Request, Response } from 'express';
import { progressStore } from '../services/progressStore';

export const getUploadProgress = (req: Request, res: Response): void => {
    const { token } = req.params;
    
    if (!token) {
        res.status(400).send('Upload token is required');
        return;
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    let initialProgress = progressStore.getProgress(token);
    if (!initialProgress) {
        progressStore.setProgress(token, 1);
        initialProgress = progressStore.getProgress(token);
    }

    if (initialProgress) {
        res.write(`data: ${JSON.stringify(initialProgress)}\n\n`);
    }

    const progressCallback = (progress: { progress: number }) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
        if (progress.progress >= 100 || progress.progress < 0) {
            progressStore.unsubscribe(token, progressCallback);
            res.end();
        }
    };

    progressStore.subscribe(token, progressCallback);

    req.on('close', () => {
        progressStore.unsubscribe(token, progressCallback);
        res.end();
    });
}; 