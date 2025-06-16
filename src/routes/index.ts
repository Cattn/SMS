import { Router } from 'express';

const router = Router();

import {
  uploadFile,
  getFile,
} from '../handlers/file';



router.post('/upload', uploadFile);
router.get('/:filename', getFile);

export default router;
