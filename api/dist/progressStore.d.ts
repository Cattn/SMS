interface UploadProgress {
    token: string;
    progress: number;
    filename?: string;
    timestamp: number;
}
declare class ProgressStore {
    private store;
    setProgress(token: string, progress: number, filename?: string): void;
    getProgress(token: string): UploadProgress | undefined;
    deleteProgress(token: string): void;
    cleanup(): void;
}
export declare const progressStore: ProgressStore;
export {};
//# sourceMappingURL=progressStore.d.ts.map