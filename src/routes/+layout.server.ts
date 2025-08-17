import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, url }) => {
	try {
		const response = await fetch('http://' + url.hostname + ':5823/api/config');
		if (response.ok) {
			const config = await response.json();
			return {
				config
			};
		}
	} catch (error) {
		console.error('Failed to fetch config:', error);
	}

	return {
		config: {
			general: {
				darkModeEnabled: true
			},
			theme: {
				sourceColor: '#8f4a4c',
				isDarkMode: true
			},
			upload: {
				defaultExpirationEnabled: false,
				defaultExpiration: '1h',
				autoCopyLinks: true
			},
			display: {
				showFileSize: true
			},
			server: {
				domain: '',
				fileServingEnabled: false
			},
			system: {
				version: '1.0.0',
				storageUsed: '0 B',
				totalFiles: 0
			}
		}
	};
};
