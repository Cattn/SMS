import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';

interface Tag {
	id: string;
	name: string;
	color: string;
	created_at: number;
}

interface FileInfo {
	id: string;
	name: string;
	relative_path: string;
	size: number;
	created_at: number;
}

interface FolderInfo {
	id: string;
	name: string;
	relative_path: string;
	parent_path: string;
	is_excluded: boolean;
	created_at: number;
}

export const getTags = async (req: Request, res: Response): Promise<void> => {
	try {
		const tags = await db.all<Tag>('SELECT * FROM tags ORDER BY name ASC');
		res.json({ tags });
	} catch (error) {
		console.error('Error fetching tags:', error);
		res.status(500).json({ error: 'Unable to fetch tags' });
	}
};

export const createTag = async (req: Request, res: Response): Promise<void> => {
	try {
		const { name, color = '#6366f1' } = req.body;

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			res.status(400).json({ error: 'Tag name is required' });
			return;
		}

		const normalizedName = name.trim().toLowerCase();
		
		if (normalizedName.length > 50) {
			res.status(400).json({ error: 'Tag name too long (max 50 characters)' });
			return;
		}

		const existingTag = await db.get<Tag>('SELECT * FROM tags WHERE LOWER(name) = ?', [normalizedName]);
		if (existingTag) {
			res.status(409).json({ error: 'Tag already exists' });
			return;
		}

		const tagId = crypto.randomUUID();
		await db.run(
			'INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
			[tagId, name.trim(), color, Date.now()]
		);

		const newTag = await db.get<Tag>('SELECT * FROM tags WHERE id = ?', [tagId]);
		res.json({ message: 'Tag created successfully', tag: newTag });
	} catch (error) {
		console.error('Error creating tag:', error);
		res.status(500).json({ error: 'Unable to create tag' });
	}
};

export const deleteTag = async (req: Request, res: Response): Promise<void> => {
	try {
		const { tagId } = req.params;

		if (!tagId) {
			res.status(400).json({ error: 'Tag ID is required' });
			return;
		}

		const tag = await db.get<Tag>('SELECT * FROM tags WHERE id = ?', [tagId]);
		if (!tag) {
			res.status(404).json({ error: 'Tag not found' });
			return;
		}

		await db.run('DELETE FROM tags WHERE id = ?', [tagId]);
		res.json({ message: 'Tag deleted successfully' });
	} catch (error) {
		console.error('Error deleting tag:', error);
		res.status(500).json({ error: 'Unable to delete tag' });
	}
};

export const addTagToFile = async (req: Request, res: Response): Promise<void> => {
	try {
		const { filePath } = req.params;
		const { tagId } = req.body;

		if (!filePath || !tagId) {
			res.status(400).json({ error: 'File path and tag ID are required' });
			return;
		}

		let file = await db.get<FileInfo>('SELECT * FROM files WHERE relative_path = ?', [filePath]);
		
		if (!file) {
			const fileId = crypto.randomUUID();
			await db.run(
				'INSERT INTO files (id, name, relative_path, size, created_at) VALUES (?, ?, ?, ?, ?)',
				[fileId, filePath.split('/').pop() || filePath, filePath, 0, Date.now()]
			);
			file = await db.get<FileInfo>('SELECT * FROM files WHERE id = ?', [fileId]);
		}

		const tag = await db.get<Tag>('SELECT * FROM tags WHERE id = ?', [tagId]);
		if (!tag) {
			res.status(404).json({ error: 'Tag not found' });
			return;
		}

		const existingAssignment = await db.get(
			'SELECT * FROM file_tags WHERE file_id = ? AND tag_id = ?',
			[file!.id, tagId]
		);

		if (existingAssignment) {
			res.status(409).json({ error: 'Tag already assigned to file' });
			return;
		}

		const assignmentId = crypto.randomUUID();
		await db.run(
			'INSERT INTO file_tags (id, file_id, tag_id, created_at) VALUES (?, ?, ?, ?)',
			[assignmentId, file!.id, tagId, Date.now()]
		);

		res.json({ message: 'Tag added to file successfully' });
	} catch (error) {
		console.error('Error adding tag to file:', error);
		res.status(500).json({ error: 'Unable to add tag to file' });
	}
};

export const removeTagFromFile = async (req: Request, res: Response): Promise<void> => {
	try {
		const { filePath, tagId } = req.params;

		if (!filePath || !tagId) {
			res.status(400).json({ error: 'File path and tag ID are required' });
			return;
		}

		const file = await db.get<FileInfo>('SELECT * FROM files WHERE relative_path = ?', [filePath]);
		if (!file) {
			res.status(404).json({ error: 'File not found' });
			return;
		}

		await db.run('DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?', [file.id, tagId]);
		res.json({ message: 'Tag removed from file successfully' });
	} catch (error) {
		console.error('Error removing tag from file:', error);
		res.status(500).json({ error: 'Unable to remove tag from file' });
	}
};

export const addTagToFolder = async (req: Request, res: Response): Promise<void> => {
	try {
		const { folderPath } = req.params;
		const { tagId } = req.body;

		if (!folderPath || !tagId) {
			res.status(400).json({ error: 'Folder path and tag ID are required' });
			return;
		}

		const folder = await db.get<FolderInfo>('SELECT * FROM folders WHERE relative_path = ?', [folderPath]);
		if (!folder) {
			res.status(404).json({ error: 'Folder not found' });
			return;
		}

		const tag = await db.get<Tag>('SELECT * FROM tags WHERE id = ?', [tagId]);
		if (!tag) {
			res.status(404).json({ error: 'Tag not found' });
			return;
		}

		const existingAssignment = await db.get(
			'SELECT * FROM folder_tags WHERE folder_id = ? AND tag_id = ?',
			[folder.id, tagId]
		);

		if (existingAssignment) {
			res.status(409).json({ error: 'Tag already assigned to folder' });
			return;
		}

		const assignmentId = crypto.randomUUID();
		await db.run(
			'INSERT INTO folder_tags (id, folder_id, tag_id, created_at) VALUES (?, ?, ?, ?)',
			[assignmentId, folder.id, tagId, Date.now()]
		);

		res.json({ message: 'Tag added to folder successfully' });
	} catch (error) {
		console.error('Error adding tag to folder:', error);
		res.status(500).json({ error: 'Unable to add tag to folder' });
	}
};

export const removeTagFromFolder = async (req: Request, res: Response): Promise<void> => {
	try {
		const { folderPath, tagId } = req.params;

		if (!folderPath || !tagId) {
			res.status(400).json({ error: 'Folder path and tag ID are required' });
			return;
		}

		const folder = await db.get<FolderInfo>('SELECT * FROM folders WHERE relative_path = ?', [folderPath]);
		if (!folder) {
			res.status(404).json({ error: 'Folder not found' });
			return;
		}

		await db.run('DELETE FROM folder_tags WHERE folder_id = ? AND tag_id = ?', [folder.id, tagId]);
		res.json({ message: 'Tag removed from folder successfully' });
	} catch (error) {
		console.error('Error removing tag from folder:', error);
		res.status(500).json({ error: 'Unable to remove tag from folder' });
	}
};

export const getFileTags = async (req: Request, res: Response): Promise<void> => {
	try {
		const { filePath } = req.params;

		if (!filePath) {
			res.status(400).json({ error: 'File path is required' });
			return;
		}

		const file = await db.get<FileInfo>('SELECT * FROM files WHERE relative_path = ?', [filePath]);
		if (!file) {
			res.json({ tags: [] });
			return;
		}

		const tags = await db.all<Tag>(
			`SELECT t.* FROM tags t 
			 JOIN file_tags ft ON t.id = ft.tag_id 
			 WHERE ft.file_id = ? 
			 ORDER BY t.name ASC`,
			[file.id]
		);

		res.json({ tags });
	} catch (error) {
		console.error('Error fetching file tags:', error);
		res.status(500).json({ error: 'Unable to fetch file tags' });
	}
};

export const getFolderTags = async (req: Request, res: Response): Promise<void> => {
	try {
		const { folderPath } = req.params;

		if (!folderPath) {
			res.status(400).json({ error: 'Folder path is required' });
			return;
		}

		const folder = await db.get<FolderInfo>('SELECT * FROM folders WHERE relative_path = ?', [folderPath]);
		if (!folder) {
			res.json({ tags: [] });
			return;
		}

		const tags = await db.all<Tag>(
			`SELECT t.* FROM tags t 
			 JOIN folder_tags ft ON t.id = ft.tag_id 
			 WHERE ft.folder_id = ? 
			 ORDER BY t.name ASC`,
			[folder.id]
		);

		res.json({ tags });
	} catch (error) {
		console.error('Error fetching folder tags:', error);
		res.status(500).json({ error: 'Unable to fetch folder tags' });
	}
};

export const searchByTags = async (req: Request, res: Response): Promise<void> => {
	try {
		const { tags: tagNames } = req.query;

		if (!tagNames || typeof tagNames !== 'string') {
			res.status(400).json({ error: 'Tag names are required' });
			return;
		}

		const tagArray = tagNames.split(',').map(t => t.trim()).filter(t => t.length > 0);
		if (tagArray.length === 0) {
			res.status(400).json({ error: 'At least one tag name is required' });
			return;
		}

		const placeholders = tagArray.map(() => '?').join(',');
		
		const filesWithTags = await db.all(
			`SELECT DISTINCT f.*, GROUP_CONCAT(t.name) as tag_names
			 FROM files f
			 JOIN file_tags ft ON f.id = ft.file_id
			 JOIN tags t ON ft.tag_id = t.id
			 WHERE t.name IN (${placeholders})
			 GROUP BY f.id`,
			tagArray
		);

		const foldersWithTags = await db.all(
			`SELECT DISTINCT f.*, GROUP_CONCAT(t.name) as tag_names
			 FROM folders f
			 JOIN folder_tags ft ON f.id = ft.folder_id
			 JOIN tags t ON ft.tag_id = t.id
			 WHERE t.name IN (${placeholders})
			 GROUP BY f.id`,
			tagArray
		);

		res.json({ 
			files: filesWithTags,
			folders: foldersWithTags 
		});
	} catch (error) {
		console.error('Error searching by tags:', error);
		res.status(500).json({ error: 'Unable to search by tags' });
	}
}; 