import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	const currentPath = url.searchParams.get('path') || '';

	try {
		const [foldersResponse, filesResponse, tagsResponse] = await Promise.all([
			fetch('http://' + url.hostname + ':5823/api/folders/tree?includeExcluded=true'),
			fetch((() => {
				const filesUrl = new URL('http://' + url.hostname + ':5823/api/getFilesInPath');
				if (currentPath) {
					filesUrl.searchParams.set('folderPath', currentPath);
				}
				return filesUrl.toString();
			})()),
			fetch('http://' + url.hostname + ':5823/api/tags')
		]);

		const [foldersData, filesData, tagsData] = await Promise.all([
			foldersResponse.json(),
			filesResponse.json(),
			tagsResponse.json()
		]);

		return {
			folderTree: foldersData.folders || [],
			files: filesData.files || [],
			currentPath: filesData.currentPath || currentPath,
			tags: tagsData.tags || []
		};
	} catch (error) {
		console.error('Error loading browse data:', error);
		return {
			folderTree: [],
			files: [],
			currentPath,
			tags: []
		};
	}
};

export const actions: Actions = {
	toggleExclusion: async ({ request, url }) => {
		const data = await request.formData();
		const folderPath = data.get('folderPath') as string;
		const excluded = data.get('excluded') === 'true';

		try {
			const response = await fetch(
				'http://' + url.hostname + `:5823/api/folders/${encodeURIComponent(folderPath)}/exclusion`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ excluded })
				}
			);

			if (!response.ok) {
				const error = await response.json();
				return fail(400, { error: error.error || 'Failed to toggle folder exclusion' });
			}

			return { success: true };
		} catch {
			return fail(500, { error: 'Error toggling folder exclusion' });
		}
	},

	deleteFolder: async ({ request, url }) => {
		const data = await request.formData();
		const folderPath = data.get('folderPath') as string;

		try {
			const response = await fetch(
				'http://' + url.hostname + `:5823/api/folders/${encodeURIComponent(folderPath)}`,
				{
					method: 'DELETE'
				}
			);

			if (!response.ok) {
				const error = await response.json();
				return fail(400, { error: error.error || 'Failed to delete folder' });
			}

			return { success: true };
		} catch {
			return fail(500, { error: 'Error deleting folder' });
		}
	},

	createTag: async ({ request, url }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const color = data.get('color') as string;

		try {
			const response = await fetch('http://' + url.hostname + ':5823/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, color })
			});

			if (!response.ok) {
				const error = await response.json();
				return fail(400, { error: error.error || 'Failed to create tag' });
			}

			return { success: true, message: 'Tag created successfully' };
		} catch {
			return fail(500, { error: 'Error creating tag' });
		}
	},

	addTagToFile: async ({ request, url }) => {
		const data = await request.formData();
		const filePath = data.get('filePath') as string;
		const tagId = data.get('tagId') as string;

		try {
			const response = await fetch(
				'http://' + url.hostname + `:5823/api/files/${encodeURIComponent(filePath)}/tags`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ tagId })
				}
			);

			if (!response.ok) {
				const error = await response.json();
				return fail(400, { error: error.error || 'Failed to add tag to file' });
			}

			return { success: true, message: 'Tag added to file successfully' };
		} catch {
			return fail(500, { error: 'Error adding tag to file' });
		}
	},

	removeTagFromFile: async ({ request, url }) => {
		const data = await request.formData();
		const filePath = data.get('filePath') as string;
		const tagId = data.get('tagId') as string;

		try {
			const response = await fetch(
				'http://' + url.hostname + `:5823/api/files/${encodeURIComponent(filePath)}/tags/${tagId}`,
				{
					method: 'DELETE'
				}
			);

			if (!response.ok) {
				const error = await response.json();
				return fail(400, { error: error.error || 'Failed to remove tag from file' });
			}

			return { success: true, message: 'Tag removed from file successfully' };
		} catch {
			return fail(500, { error: 'Error removing tag from file' });
		}
	},

	addTagToFolder: async ({ request, url }) => {
		const data = await request.formData();
		const folderPath = data.get('folderPath') as string;
		const tagId = data.get('tagId') as string;

		try {
			const response = await fetch(
				'http://' + url.hostname + `:5823/api/folders/${encodeURIComponent(folderPath)}/tags`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ tagId })
				}
			);

			if (!response.ok) {
				const error = await response.json();
				return fail(400, { error: error.error || 'Failed to add tag to folder' });
			}

			return { success: true, message: 'Tag added to folder successfully' };
		} catch {
			return fail(500, { error: 'Error adding tag to folder' });
		}
	},

	removeTagFromFolder: async ({ request, url }) => {
		const data = await request.formData();
		const folderPath = data.get('folderPath') as string;
		const tagId = data.get('tagId') as string;

		try {
			const response = await fetch(
				'http://' + url.hostname + `:5823/api/folders/${encodeURIComponent(folderPath)}/tags/${tagId}`,
				{
					method: 'DELETE'
				}
			);

			if (!response.ok) {
				const error = await response.json();
				return fail(400, { error: error.error || 'Failed to remove tag from folder' });
			}

			return { success: true, message: 'Tag removed from folder successfully' };
		} catch {
			return fail(500, { error: 'Error removing tag from folder' });
		}
	}
};
