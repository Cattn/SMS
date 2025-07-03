interface ConfigType {
	general: {
		darkModeEnabled: boolean;
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
		darkModeEnabled: false
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
