import { Request, Response } from 'express';
export interface AppError extends Error {
    status?: number;
}
export declare const errorHandler: (err: AppError, req: Request, res: Response) => void;
//# sourceMappingURL=errorHandker.d.ts.map