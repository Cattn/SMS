import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db } from '../db/db';

interface FolderInfo {
	id: string;
	name: string;
	relative_path: string;
	parent_path: string;
	is_excluded: boolean;
	created_at: number;
}

interface FolderTreeNode extends FolderInfo {
	children: FolderTreeNode[];
}

export const createFolder = async (req: Request, res: Response): Promise<void> => {
	try {
		const { folderName, parentPath = '' } = req.body;

		console.log('Creating folder:', { folderName, parentPath });

		if (!folderName) {
			res.status(400).json({ error: 'Folder name is required' });
			return;
		}

		const invalidChars = /[<>:"/\\|?*]/;
		const hasControlChars = folderName.split('').some((char: string) => char.charCodeAt(0) <= 31);
		if (invalidChars.test(folderName) || hasControlChars) {
			res.status(400).json({ error: 'Folder name contains invalid characters' });
			return;
		}

		if (folderName.length > 255) {
			res.status(400).json({ error: 'Folder name too long' });
			return;
		}

		const reservedNames = [
			'CON',
			'PRN',
			'AUX',
			'NUL',
			'COM1',
			'COM2',
			'COM3',
			'COM4',
			'COM5',
			'COM6',
			'COM7',
			'COM8',
			'COM9',
			'LPT1',
			'LPT2',
			'LPT3',
			'LPT4',
			'LPT5',
			'LPT6',
			'LPT7',
			'LPT8',
			'LPT9'
		];
		if (reservedNames.includes(folderName.toUpperCase())) {
			res.status(400).json({ error: 'Folder name is reserved' });
			return;
		}

		const relativePath = parentPath ? path.posix.join(parentPath, folderName) : folderName;

		console.log('Calculated relativePath:', relativePath);

		const pathDepth = relativePath.split('/').length;
		if (pathDepth > 10) {
			res.status(400).json({ error: 'Maximum folder depth exceeded (10 levels)' });
			return;
		}

		const existingFolder = await db.get<FolderInfo>(
			'SELECT * FROM folders WHERE relative_path = ?',
			[relativePath]
		);

		console.log('Existing folder check result:', existingFolder);

		if (existingFolder) {
			console.log('Folder already exists with relative_path:', existingFolder.relative_path);
			res.status(409).json({ error: 'Folder already exists' });
			return;
		}

		const uploadsDir = path.join(process.cwd(), '../uploads');
		const fullFolderPath = path.join(uploadsDir, relativePath);

		const normalizedUploadsDir = path.resolve(uploadsDir);
		const normalizedFolderPath = path.resolve(fullFolderPath);

		if (!normalizedFolderPath.startsWith(normalizedUploadsDir)) {
			res.status(403).json({ error: 'Access denied: folder must be within uploads directory' });
			return;
		}

		try {
			let targetPath = fullFolderPath;

			if (parentPath) {
				const parentInUploads = path.join(uploadsDir, parentPath);
				if (fs.existsSync(parentInUploads)) {
					const realParentPath = fs.realpathSync(parentInUploads);
					targetPath = path.join(realParentPath, folderName);
				} else {
					res.status(404).json({ error: 'Parent folder not found' });
					return;
				}
			}

			if (!fs.existsSync(targetPath)) {
				fs.mkdirSync(targetPath, { recursive: true });
			}
		} catch (symlinkError) {
			console.error('Error creating folder (possible symlink issue):', symlinkError);
			res
				.status(500)
				.json({ error: 'Unable to create folder - check if parent directory is accessible' });
			return;
		}

		const folderId = crypto.randomUUID();
		await db.run(
			'INSERT INTO folders (id, name, relative_path, parent_path, created_at) VALUES (?, ?, ?, ?, ?)',
			[folderId, folderName, relativePath, parentPath, Date.now()]
		);

		res.json({
			message: 'Folder created successfully',
			folder: {
				id: folderId,
				name: folderName,
				relative_path: relativePath,
				parent_path: parentPath
			}
		});
	} catch (error) {
		console.error('Folder creation error:', error);
		res.status(500).json({ error: 'Unable to create folder' });
	}
};

export const getFolders = async (req: Request, res: Response): Promise<void> => {
	try {
		const { parentPath = '', includeExcluded = 'false' } = req.query;
		const parentPathStr = typeof parentPath === 'string' ? parentPath : '';
		const includeExcludedStr = typeof includeExcluded === 'string' ? includeExcluded : 'false';

		let sql = 'SELECT * FROM folders WHERE parent_path = ?';
		const params: (string | number | boolean | null)[] = [parentPathStr];

		if (includeExcludedStr !== 'true') {
			sql += ' AND is_excluded = 0';
		}

		sql += ' ORDER BY name ASC';

		const folders = await db.all<FolderInfo>(sql, params);

		res.json({ folders });
	} catch (error) {
		console.error('Error fetching folders:', error);
		res.status(500).json({ error: 'Unable to fetch folders' });
	}
};

export const deleteFolder = async (req: Request, res: Response): Promise<void> => {
	try {
		const { folderPath } = req.params;

		if (!folderPath) {
			res.status(400).json({ error: 'Folder path is required' });
			return;
		}

		const folder = await db.get<FolderInfo>('SELECT * FROM folders WHERE relative_path = ?', [
			folderPath
		]);

		if (!folder) {
			res.status(404).json({ error: 'Folder not found' });
			return;
		}

		const subfolders = await db.all<FolderInfo>(
			'SELECT * FROM folders WHERE parent_path = ? OR parent_path LIKE ?',
			[folderPath, `${folderPath}/%`]
		);

		const uploadsDir = path.join(process.cwd(), '../uploads');
		const fullFolderPath = path.join(uploadsDir, folderPath);

		const normalizedUploadsDir = path.resolve(uploadsDir);
		const normalizedFolderPath = path.resolve(fullFolderPath);

		if (!normalizedFolderPath.startsWith(normalizedUploadsDir)) {
			res.status(403).json({ error: 'Access denied: folder must be within uploads directory' });
			return;
		}

		if (fs.existsSync(fullFolderPath)) {
			const contents = fs.readdirSync(fullFolderPath);
			if (contents.length > 0) {
				res.status(409).json({ error: 'Folder is not empty' });
				return;
			}
		}

		if (subfolders.length > 0) {
			res.status(409).json({ error: 'Folder contains subfolders' });
			return;
		}

		await db.run('DELETE FROM folders WHERE relative_path = ?', [folderPath]);

		if (fs.existsSync(fullFolderPath)) {
			fs.rmdirSync(fullFolderPath);
		}

		res.json({ message: 'Folder deleted successfully' });
	} catch (error) {
		console.error('Folder deletion error:', error);
		res.status(500).json({ error: 'Unable to delete folder' });
	}
};

export const toggleFolderExclusion = async (req: Request, res: Response): Promise<void> => {
	try {
		const { folderPath } = req.params;
		const { excluded } = req.body;

		if (!folderPath) {
			res.status(400).json({ error: 'Folder path is required' });
			return;
		}

		if (typeof excluded !== 'boolean') {
			res.status(400).json({ error: 'Excluded must be a boolean' });
			return;
		}

		const folder = await db.get<FolderInfo>('SELECT * FROM folders WHERE relative_path = ?', [
			folderPath
		]);

		if (!folder) {
			res.status(404).json({ error: 'Folder not found' });
			return;
		}

		await db.run('UPDATE folders SET is_excluded = ? WHERE relative_path = ?', [
			excluded ? 1 : 0,
			folderPath
		]);

		res.json({
			message: `Folder ${excluded ? 'excluded from' : 'included in'} library`,
			folder: {
				...folder,
				is_excluded: excluded
			}
		});
	} catch (error) {
		console.error('Error toggling folder exclusion:', error);
		res.status(500).json({ error: 'Unable to update folder exclusion' });
	}
};

export const getFolderTree = async (req: Request, res: Response): Promise<void> => {
	try {
		const { includeExcluded = 'false' } = req.query;

		let sql = 'SELECT * FROM folders';
		const params: (string | number | boolean | null)[] = [];

		if (includeExcluded !== 'true') {
			sql += ' WHERE is_excluded = 0';
		}

		sql += ' ORDER BY relative_path ASC';

		const folders = await db.all<FolderInfo>(sql, params);

		const folderMap = new Map<string, FolderTreeNode>();
		const rootFolders: FolderTreeNode[] = [];

		folders.forEach((folder) => {
			folderMap.set(folder.relative_path, {
				...folder,
				children: []
			});
		});

		folders.forEach((folder) => {
			const folderNode = folderMap.get(folder.relative_path);
			if (folderNode) {
				if (folder.parent_path === '') {
					rootFolders.push(folderNode);
				} else {
					const parent = folderMap.get(folder.parent_path);
					if (parent) {
						parent.children.push(folderNode);
					}
				}
			}
		});

		res.json({
			folders: rootFolders,
			total: folders.length
		});
	} catch (error) {
		console.error('Error fetching folder tree:', error);
		res.status(500).json({ error: 'Unable to fetch folder tree' });
	}
};

export const scanAndSyncFolders = async (): Promise<void> => {
	try {
		console.log('Scanning existing folders in uploads directory...');

		const uploadsDir = path.join(process.cwd(), '../uploads');

		if (!fs.existsSync(uploadsDir)) {
			console.log('Uploads directory does not exist, creating it...');
			fs.mkdirSync(uploadsDir, { recursive: true });
			return;
		}

		const existingFolders = await db.all<FolderInfo>('SELECT relative_path FROM folders');
		const existingPaths = new Set(existingFolders.map((f) => f.relative_path));

		const scannedFolders: Array<{ name: string; relativePath: string; parentPath: string }> = [];
		const visitedRealPaths = new Set<string>();

		function scanDirectory(currentPath: string, relativePath: string = ''): void {
			try {
				const realPath = fs.realpathSync(currentPath);

				if (visitedRealPaths.has(realPath)) {
					console.log(
						`Skipping already visited path (circular symlink): ${currentPath} -> ${realPath}`
					);
					return;
				}
				visitedRealPaths.add(realPath);

				const items = fs.readdirSync(currentPath, { withFileTypes: true });

				for (const item of items) {
					const itemPath = path.join(currentPath, item.name);
					let isDirectory = false;

					if (item.isDirectory()) {
						isDirectory = true;
					} else if (item.isSymbolicLink()) {
						try {
							const linkTarget = fs.statSync(itemPath);
							if (linkTarget.isDirectory()) {
								isDirectory = true;
								console.log(
									`Found symbolic link to directory: ${item.name} -> ${fs.readlinkSync(itemPath)}`
								);
							}
						} catch (linkError) {
							console.warn(`Warning: Could not resolve symbolic link ${itemPath}:`, linkError);
							continue;
						}
					}

					if (isDirectory) {
						const itemName = item.name;
						const itemRelativePath = relativePath
							? path.posix.join(relativePath, itemName)
							: itemName;
						const itemParentPath = relativePath;

						scannedFolders.push({
							name: itemName,
							relativePath: itemRelativePath,
							parentPath: itemParentPath
						});

						scanDirectory(itemPath, itemRelativePath);
					}
				}
			} catch (error) {
				console.error(`Error scanning directory ${currentPath}:`, error);
			}
		}

		scanDirectory(uploadsDir);

		let addedCount = 0;

		for (const folder of scannedFolders) {
			if (!existingPaths.has(folder.relativePath)) {
				try {
					const folderId = crypto.randomUUID();
					await db.run(
						'INSERT INTO folders (id, name, relative_path, parent_path, is_excluded, created_at) VALUES (?, ?, ?, ?, ?, ?)',
						[folderId, folder.name, folder.relativePath, folder.parentPath, 0, Date.now()]
					);
					addedCount++;
					console.log(`Added folder to database: ${folder.relativePath}`);
				} catch (error) {
					console.error(`Error adding folder ${folder.relativePath} to database:`, error);
				}
			}
		}

		console.log(
			`Folder scan complete. Found ${scannedFolders.length} folders, added ${addedCount} new folders to database.`
		);
	} catch (error) {
		console.error('Error during folder scan and sync:', error);
	}
};
