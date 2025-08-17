interface ConfigType {
	general: {
		darkModeEnabled: boolean;
	};
	theme: {
		sourceColor: string;
		isDarkMode: boolean;
	};
	upload: {
		defaultExpirationEnabled: boolean;
		defaultExpiration: string;
		autoCopyLinks: boolean;
	};
	display: {
		showFileSize: boolean;
	};
	server: {
		domain: string;
		fileServingEnabled: boolean;
	};
	system?: {
		version: string;
		storageUsed: string;
		totalFiles: number;
	};
}

const defaultConfig: ConfigType = {
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
};

export const configState = $state<ConfigType>(defaultConfig);

export function updateConfig(newConfig: ConfigType) {
	Object.assign(configState, newConfig);
}

export function initializeConfig(initialConfig: ConfigType) {
	Object.assign(configState, initialConfig);
}

export async function updateThemeConfig(sourceColor: string, isDarkMode: boolean) {
	configState.theme.sourceColor = sourceColor;
	configState.theme.isDarkMode = isDarkMode;
	
	if (typeof window === 'undefined') return;
	
	try {
		const response = await fetch(`${window.location.protocol}//${window.location.hostname}:5823/api/config`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(configState),
		});
		
		if (!response.ok) {
			console.error('Failed to update theme config on server');
		}
	} catch (error) {
		console.error('Error updating theme config:', error);
	}
}
