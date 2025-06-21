interface UploadProgress {
    token: string;
    progress: number;
    filename?: string;
    timestamp: number;
}

class ProgressStore {
    private store = new Map<string, UploadProgress>();
    private listeners = new Map<string, Set<(progress: UploadProgress) => void>>();

    setProgress(token: string, progress: number, filename?: string) {
        const progressObj: UploadProgress = {
            token,
            progress,
            filename,
            timestamp: Date.now()
        };

        this.store.set(token, progressObj);
        console.log(`Setting progress for ${token}: ${progress}%`);

        const subs = this.listeners.get(token);
        if (subs) {
            console.log(`Notifying ${subs.size} subscribers for token ${token}`);
            for (const cb of subs) {
                cb(progressObj);
            }
        }
    }

    getProgress(token: string): UploadProgress | undefined {
        return this.store.get(token);
    }

    deleteProgress(token: string) {
        this.store.delete(token);
        this.listeners.delete(token);
    }

    cleanup() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [token, progress] of this.store.entries()) {
            if (progress.timestamp < oneHourAgo) {
                this.store.delete(token);
            }
        }
    }

    subscribe(token: string, cb: (progress: UploadProgress) => void) {
        let subs = this.listeners.get(token);
        if (!subs) {
            subs = new Set();
            this.listeners.set(token, subs);
        }
        subs.add(cb);
    }

    unsubscribe(token: string, cb: (progress: UploadProgress) => void) {
        const subs = this.listeners.get(token);
        if (subs) {
            subs.delete(cb);
            if (subs.size === 0) {
                this.listeners.delete(token);
            }
        }
    }
}

export const progressStore = new ProgressStore();

setInterval(() => progressStore.cleanup(), 30 * 60 * 1000); 