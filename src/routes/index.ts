import { Router } from 'express';

const router = Router();

import {
  uploadFile,
} from '../handlers/file';



router.post('/upload', uploadFile);

export default router;
