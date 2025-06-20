import { Router } from 'express';

const router = Router();

import { uploadFile } from '../handlers/file';

import { getFile, getFiles } from '../handlers/get';

router.post('/upload', uploadFile);
router.get('/getFiles', getFiles);
router.get('/getFile/:filename', getFile);

export default router;
