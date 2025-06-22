import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	const currentPath = url.searchParams.get('path') || '';

	try {
		const foldersResponse = await fetch(
			'http://' + url.hostname + ':5823/api/folders/tree?includeExcluded=true'
		);
		const foldersData = await foldersResponse.json();

		const filesUrl = new URL('http://' + url.hostname + ':5823/api/getFilesInPath');
		if (currentPath) {
			filesUrl.searchParams.set('folderPath', currentPath);
		}

		const filesResponse = await fetch(filesUrl.toString());
		const filesData = await filesResponse.json();

		return {
			folderTree: foldersData.folders || [],
			files: filesData.files || [],
			currentPath: filesData.currentPath || currentPath
		};
	} catch (error) {
		console.error('Error loading browse data:', error);
		return {
			folderTree: [],
			files: [],
			currentPath
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
	}
};
