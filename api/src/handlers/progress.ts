import { Request, Response } from 'express';
import { progressStore } from '../progressStore';

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

    let notFoundCount = 0;
    const maxNotFoundAttempts = 3600; 
    let gracePeroidRemaining = 240; 

    let lastProgress = initialProgress?.progress ?? 0;

    const progressInterval = setInterval(() => {
        const progress = progressStore.getProgress(token);
        
        if (!progress) {
            if (gracePeroidRemaining > 0) {
                gracePeroidRemaining--;
                return;
            }
            
            notFoundCount++;
            if (notFoundCount >= maxNotFoundAttempts) {
                res.write(`data: ${JSON.stringify({ progress: -1, error: 'Upload not found' })}\n\n`);
                clearInterval(progressInterval);
                res.end();
            }
            return;
        }

        notFoundCount = 0;
        gracePeroidRemaining = 0;

        if (progress.progress !== lastProgress) {
            lastProgress = progress.progress;
            res.write(`data: ${JSON.stringify(progress)}\n\n`);
        }

        if (progress.progress >= 100 || progress.progress < 0) {
            clearInterval(progressInterval);
            res.end();
        }
    }, 250);

    req.on('close', () => {
        clearInterval(progressInterval);
        res.end();
    });
}; 