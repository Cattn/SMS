import { Router } from 'express';

const router = Router();

import { uploadFile } from '../handlers/file';
import { deleteFile } from '../handlers/delete';
import { getFile, getFiles, getFilesInPath, getFileExpiration } from '../handlers/get';
import { getUploadProgress } from '../handlers/progress';
import { createFolder, getFolders, deleteFolder, toggleFolderExclusion, getFolderTree } from '../handlers/fs';

router.post('/upload', uploadFile);
router.get('/delete/:filename', deleteFile);
router.get('/getFiles', getFiles);
router.get('/getFilesInPath', getFilesInPath);
router.get('/getFile/:filename', getFile);
router.get('/getFileExpiration/:filename', getFileExpiration);
router.get('/upload-progress/:token', getUploadProgress);

router.post('/folders', createFolder);
router.get('/folders', getFolders);
router.get('/folders/tree', getFolderTree);
router.delete('/folders/:folderPath', deleteFolder);
router.patch('/folders/:folderPath/exclusion', toggleFolderExclusion);

export default router;
