import { Request, Response, NextFunction } from 'express';
import path from 'path';

export const serveSite = (req: Request, res: Response, next: NextFunction) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
};
