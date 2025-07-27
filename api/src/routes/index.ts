import { Router } from 'express';

const router = Router();

import { uploadFile } from '../handlers/file';
import { deleteFile } from '../handlers/delete';
import { getFile, getFiles, getFilesInPath, getFileExpiration } from '../handlers/get';
import { getUploadProgress } from '../handlers/progress';
import {
	createFolder,
	getFolders,
	deleteFolder,
	toggleFolderExclusion,
	getFolderTree
} from '../handlers/fs';
import { getConfig, updateConfig } from '../handlers/config';
import {
	getTags,
	createTag,
	deleteTag,
	addTagToFile,
	removeTagFromFile,
	addTagToFolder,
	removeTagFromFolder,
	getFileTags,
	getFolderTags,
	searchByTags
} from '../handlers/tags';

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

router.get('/config', getConfig);
router.put('/config', updateConfig);

router.get('/tags', getTags);
router.post('/tags', createTag);
router.delete('/tags/:tagId', deleteTag);
router.post('/files/:filePath/tags', addTagToFile);
router.delete('/files/:filePath/tags/:tagId', removeTagFromFile);
router.get('/files/:filePath/tags', getFileTags);
router.post('/folders/:folderPath/tags', addTagToFolder);
router.delete('/folders/:folderPath/tags/:tagId', removeTagFromFolder);
router.get('/folders/:folderPath/tags', getFolderTags);
router.get('/search/tags', searchByTags);

export default router;
