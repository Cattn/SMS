interface ConfigType {
	general: {
		darkModeEnabled: boolean;
	};
	theme: {
		sourceColor: string;
		isDarkMode: boolean;
		schemeType: 'vibrant' | 'tonal';
		hdrEnabled: boolean;
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
		isDarkMode: true,
		schemeType: 'vibrant',
		hdrEnabled: true
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

function normalizeConfig(config: Partial<ConfigType>): ConfigType {
	return {
		general: {
			darkModeEnabled: config.general?.darkModeEnabled ?? defaultConfig.general.darkModeEnabled
		},
		theme: {
			sourceColor: config.theme?.sourceColor ?? defaultConfig.theme.sourceColor,
			isDarkMode: config.theme?.isDarkMode ?? defaultConfig.theme.isDarkMode,
			schemeType: config.theme?.schemeType ?? defaultConfig.theme.schemeType,
			hdrEnabled: config.theme?.hdrEnabled ?? defaultConfig.theme.hdrEnabled
		},
		upload: {
			defaultExpirationEnabled:
				config.upload?.defaultExpirationEnabled ?? defaultConfig.upload.defaultExpirationEnabled,
			defaultExpiration: config.upload?.defaultExpiration ?? defaultConfig.upload.defaultExpiration,
			autoCopyLinks: config.upload?.autoCopyLinks ?? defaultConfig.upload.autoCopyLinks
		},
		display: {
			showFileSize: config.display?.showFileSize ?? defaultConfig.display.showFileSize
		},
		server: {
			domain: config.server?.domain ?? defaultConfig.server.domain,
			fileServingEnabled: config.server?.fileServingEnabled ?? defaultConfig.server.fileServingEnabled
		},
		system: {
			version: config.system?.version ?? defaultConfig.system?.version ?? '1.0.0',
			storageUsed: config.system?.storageUsed ?? defaultConfig.system?.storageUsed ?? '0 B',
			totalFiles: config.system?.totalFiles ?? defaultConfig.system?.totalFiles ?? 0
		}
	};
}

export async function updateConfig(newConfig: ConfigType) {
	Object.assign(configState, normalizeConfig(newConfig));
	if (typeof window !== 'undefined') {
		try {
			window.localStorage.setItem('smsConfig', JSON.stringify(configState));
		} catch { void 0; }
		try {
			const { system, ...configToSave } = configState;
			await fetch(`${window.location.protocol}//${window.location.hostname}:5823/api/config`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(configToSave)
			});
		} catch (error) {
			console.error('Failed to update config:', error);
		}
	}
}

export function initializeConfig(initialConfig: ConfigType) {
	Object.assign(configState, normalizeConfig(initialConfig));
	if (typeof window !== 'undefined') {
		try {
			window.localStorage.setItem('smsConfig', JSON.stringify(configState));
		} catch { void 0; }
	}
}

export async function updateThemeConfig(sourceColor: string, isDarkMode: boolean) {
	configState.theme.sourceColor = sourceColor;
	configState.theme.isDarkMode = isDarkMode;
	if (typeof window !== 'undefined') {
		try {
			window.localStorage.setItem('smsConfig', JSON.stringify(configState));
		} catch { void 0; }
	}
	
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

if (typeof window !== 'undefined') {
	try {
		const stored = window.localStorage.getItem('smsConfig');
		if (stored) {
			const parsed = JSON.parse(stored) as Partial<ConfigType>;
			Object.assign(configState, normalizeConfig(parsed));
		}
	} catch { void 0; }
}
