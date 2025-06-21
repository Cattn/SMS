import { Router } from 'express';

const router = Router();

import { uploadFile } from '../handlers/file';
import { deleteFile } from '../handlers/delete';
import { getFile, getFiles } from '../handlers/get';
import { getUploadProgress } from '../handlers/progress';

router.post('/upload', uploadFile);
router.get('/delete/:filename', deleteFile);
router.get('/getFiles', getFiles);
router.get('/getFile/:filename', getFile);
router.get('/upload-progress/:token', getUploadProgress);

export default router;
