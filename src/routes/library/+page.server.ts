import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return {
		files: await fetch('http://' + url.hostname + ':5823/api/getFiles').then(res => res.json())
	};
};

export const actions = {
	delete: async ({ request, url }) => {
		const formData = await request.formData();
		const fileName = formData.get('fileName') as string;
		
		if (!fileName) {
			return { success: false, error: 'Filename is required' };
		}

		try {
			const response = await fetch('http://' + url.hostname + ':5823/api/delete/' + fileName, {
				method: 'GET'
			});
			
			const data = await response.json();
			
			if (!response.ok) {
				return { success: false, error: data.error || 'Failed to delete file' };
			}
			
			return { success: true, message: data.message };
		} catch {
			return { success: false, error: 'Failed to delete file' };
		}
	}
} satisfies Actions;	