interface UploadProgress {
    token: string;
    progress: number;
    filename?: string;
    timestamp: number;
}

class ProgressStore {
    private store = new Map<string, UploadProgress>();

    setProgress(token: string, progress: number, filename?: string) {
        this.store.set(token, {
            token,
            progress,
            filename,
            timestamp: Date.now()
        });
    }

    getProgress(token: string): UploadProgress | undefined {
        return this.store.get(token);
    }

    deleteProgress(token: string) {
        this.store.delete(token);
    }

    cleanup() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [token, progress] of this.store.entries()) {
            if (progress.timestamp < oneHourAgo) {
                this.store.delete(token);
            }
        }
    }
}

export const progressStore = new ProgressStore();

setInterval(() => progressStore.cleanup(), 30 * 60 * 1000); 