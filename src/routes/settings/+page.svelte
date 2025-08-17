<script lang="ts">
	import { Button, Switch, Snackbar } from 'm3-svelte';
	import { configState, updateConfig } from '$lib/config.svelte';
	import { setDarkMode, getIsDark, getSourceColor, setThemeFromSourceColor } from '$lib/theme/store.svelte';
	import ThemeGenerator from '$lib/components/ThemeGenerator.svelte';
	
	let snackbar: ReturnType<typeof Snackbar>;

	// Use reactive getters to access global config state
	let darkModeEnabled = $derived(getIsDark());
	let defaultExpirationEnabled = $derived(configState.upload.defaultExpirationEnabled);
	let defaultExpiration = $derived(configState.upload.defaultExpiration);
	let autoCopyLinks = $derived(configState.upload.autoCopyLinks);
	let showFileSize = $derived(configState.display.showFileSize);
	let domain = $derived(configState.server.domain);
	let fileServingEnabled = $derived(configState.server.fileServingEnabled);
	let systemInfo = $derived(
		configState.system || {
			version: '0.0.1',
			storageUsed: '0 B',
			totalFiles: 0
		}
	);

	let currentThemeColor = $state(getSourceColor());
	let pendingThemeColor = $state(getSourceColor());
	let hasUnsavedThemeChanges = $derived(currentThemeColor !== pendingThemeColor);

	function handleThemeColorChange(hex: string) {
		pendingThemeColor = hex;
	}

	function saveThemeColor() {
		setThemeFromSourceColor(pendingThemeColor);
		currentThemeColor = pendingThemeColor;
		snackbar.show({ message: 'Theme color saved successfully!', closable: true });
	}

	function resetThemeColor() {
		pendingThemeColor = currentThemeColor;
	}

	async function saveSettings() {
		try {
			const config = {
				general: { darkModeEnabled },
				theme: { 
					sourceColor: configState.theme.sourceColor, 
					isDarkMode: darkModeEnabled,
					schemeType: configState.theme.schemeType
				},
				upload: { defaultExpirationEnabled, defaultExpiration, autoCopyLinks },
				display: { showFileSize },
				server: { domain, fileServingEnabled }
			};

			const response = await fetch(`${window.location.protocol}//${window.location.hostname}:5823/api/config`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(config)
			});

			if (response.ok) {
				updateConfig(config);
				snackbar.show({ message: 'Settings saved successfully!', closable: true });
			} else {
				snackbar.show({ message: 'Failed to save settings', closable: true });
			}
		} catch (error) {
			console.error('Failed to save settings:', error);
			snackbar.show({ message: 'Failed to save settings', closable: true });
		}
	}

	function resetSettings() {
		if (confirm('Are you sure you want to reset all settings to default values?')) {
			const defaultConfig = {
				general: { darkModeEnabled: true },
				theme: { sourceColor: '#8f4a4c', isDarkMode: true, schemeType: 'vibrant' as const },
				upload: { defaultExpirationEnabled: false, defaultExpiration: '1h', autoCopyLinks: true },
				display: { showFileSize: true },
				server: { domain: '', fileServingEnabled: false }
			};

			updateConfig(defaultConfig);
			snackbar.show({ message: 'Settings reset to defaults', closable: true });
		}
	}

	function exportSettings() {
		const settings = {
			general: { darkModeEnabled },
			theme: { 
				sourceColor: configState.theme.sourceColor, 
				isDarkMode: darkModeEnabled,
				schemeType: configState.theme.schemeType
			},
			upload: { defaultExpirationEnabled, defaultExpiration, autoCopyLinks },
			display: { showFileSize },
			server: { domain, fileServingEnabled }
		};

		const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'SMS_config.json';
		a.click();
		URL.revokeObjectURL(url);

		snackbar.show({ message: 'Settings exported successfully', closable: true });
	}

	function importSettings() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = (event) => {
			const file = (event.target as HTMLInputElement).files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (e) => {
					try {
						const settings = JSON.parse(e.target?.result as string);

						const newConfig = {
							general: {
								darkModeEnabled: settings.general?.darkModeEnabled ?? true
							},
							theme: {
								sourceColor: settings.theme?.sourceColor ?? '#8f4a4c',
								isDarkMode: settings.theme?.isDarkMode ?? true,
								schemeType: settings.theme?.schemeType ?? 'vibrant'
							},
							upload: {
								defaultExpirationEnabled: settings.upload?.defaultExpirationEnabled ?? false,
								defaultExpiration: settings.upload?.defaultExpiration ?? '1h',
								autoCopyLinks: settings.upload?.autoCopyLinks ?? true
							},
							display: {
								showFileSize: settings.display?.showFileSize ?? true
							},
							server: {
								domain: settings.server?.domain ?? '',
								fileServingEnabled: settings.server?.fileServingEnabled ?? false
							}
						};

						updateConfig(newConfig);
						snackbar.show({ message: 'Settings imported successfully', closable: true });
					} catch (error) {
						snackbar.show({
							message: 'Failed to import settings - Invalid file format',
							closable: true
						});
					}
				};
				reader.readAsText(file);
			}
		};
		input.click();
	}

	// Helper functions to update individual config values
	function updateDarkMode(e: Event) {
		const target = e.target as HTMLInputElement;
		setDarkMode(target.checked);
		snackbar.show({ message: 'Dark mode setting saved', closable: true });
	}

	function updateDefaultExpirationEnabled(e: Event) {
		const target = e.target as HTMLInputElement;
		updateConfig({
			...configState,
			upload: { ...configState.upload, defaultExpirationEnabled: target.checked }
		});
	}

	function updateDefaultExpiration(e: Event) {
		const target = e.target as HTMLSelectElement;
		updateConfig({
			...configState,
			upload: { ...configState.upload, defaultExpiration: target.value }
		});
	}

	function updateAutoCopyLinks(e: Event) {
		const target = e.target as HTMLInputElement;
		updateConfig({
			...configState,
			upload: { ...configState.upload, autoCopyLinks: target.checked }
		});
	}

	function updateShowFileSize(e: Event) {
		const target = e.target as HTMLInputElement;
		updateConfig({
			...configState,
			display: { ...configState.display, showFileSize: target.checked }
		});
	}

	function updateDomain(e: Event) {
		const target = e.target as HTMLInputElement;
		updateConfig({
			...configState,
			server: { ...configState.server, domain: target.value }
		});
	}

	function updateFileServingEnabled(e: Event) {
		const target = e.target as HTMLInputElement;
		updateConfig({
			...configState,
			server: { ...configState.server, fileServingEnabled: target.checked }
		});
	}
</script>

<div class="mt-12 ml-32">
	<div class="mb-6 flex flex-col gap-4 pr-10 md:flex-row md:items-center md:justify-between">
		<h1 class="text-4xl font-bold">Settings</h1>
		<div class="flex gap-2">
			<Button variant="outlined" onclick={importSettings}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					class="mr-2"
				>
					<path
						fill="currentColor"
						d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11Z"
					/>
				</svg>
				Import
			</Button>
			<Button variant="outlined" onclick={exportSettings}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					class="mr-2"
				>
					<path
						fill="currentColor"
						d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11Z"
					/>
				</svg>
				Export
			</Button>
			<Button variant="tonal" onclick={resetSettings}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					class="mr-2"
				>
					<path
						fill="currentColor"
						d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6c0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6c0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4l-4-4v3z"
					/>
				</svg>
				Reset
			</Button>
		</div>
	</div>

	<section class="mr-10 mb-8">
		<div class="bg-surface-container rounded-3xl p-6 shadow-sm">
			<h2 class="text-on-surface mb-4 flex items-center text-2xl font-semibold">
				<div class="bg-primary-container mr-3 flex h-8 w-8 items-center justify-center rounded-lg">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						class="text-on-primary-container"
					>
						<path
							fill="currentColor"
							d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"
						/>
					</svg>
				</div>
				General
			</h2>

			<div class="space-y-6">
				<div class="bg-surface-variant flex items-center justify-between rounded-2xl p-4">
					<div>
						<h3 class="text-on-surface font-medium">Dark Mode</h3>
						<p class="text-on-surface-variant text-sm">Switch between light and dark themes</p>
					</div>
					<label>
						<Switch checked={darkModeEnabled} onchange={updateDarkMode} />
					</label>
				</div>
				<ThemeGenerator 
					initialHex={pendingThemeColor}
					onColorChange={handleThemeColorChange}
				/>
				
				{#if hasUnsavedThemeChanges}
					<div class="bg-surface-variant mt-4 flex items-center justify-between rounded-2xl p-4">
						<div>
							<h3 class="text-on-surface font-medium">Unsaved Changes</h3>
							<p class="text-on-surface-variant text-sm">You have unsaved theme color changes</p>
						</div>
						<div class="flex gap-2">
							<Button variant="outlined" onclick={resetThemeColor}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									class="mr-2"
								>
									<path
										fill="currentColor"
										d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6c0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6c0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4l-4-4v3z"
									/>
								</svg>
								Reset
							</Button>
							<Button variant="filled" onclick={saveThemeColor}>
								<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><path fill="currentColor" d="M21 7v12q0 .825-.587 1.413T19 21H5q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h12zm-9 11q1.25 0 2.125-.875T15 15t-.875-2.125T12 12t-2.125.875T9 15t.875 2.125T12 18m-6-8h9V6H6z"/></svg>
								Save Theme
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="mr-10 mb-8">
		<div class="bg-surface-container rounded-3xl p-6 shadow-sm">
			<h2 class="text-on-surface mb-4 flex items-center text-2xl font-semibold">
				<div
					class="bg-secondary-container mr-3 flex h-8 w-8 items-center justify-center rounded-lg"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						class="text-on-secondary-container"
					>
						<path
							fill="currentColor"
							d="M6 20q-.825 0-1.412-.587T4 18v-2q0-.425.288-.712T5 15t.713.288T6 16v2h12v-2q0-.425.288-.712T19 15t.713.288T20 16v2q0 .825-.587 1.413T18 20zm5-12.15L9.125 9.725q-.3.3-.712.288T7.7 9.7q-.275-.3-.288-.7t.288-.7l3.6-3.6q.15-.15.325-.212T12 4.425t.375.063t.325.212l3.6 3.6q.3.3.288.7t-.288.7q-.3.3-.712.313t-.713-.288L13 7.85V15q0 .425-.288.713T12 16t-.712-.288T11 15z"
						/>
					</svg>
				</div>
				Upload Preferences
			</h2>

			<div class="space-y-6">
				<div class="bg-surface-variant rounded-2xl p-4">
					<div class="mb-3 flex items-center justify-between">
						<div>
							<h3 class="text-on-surface font-medium">Default Expiration</h3>
							<p class="text-on-surface-variant text-sm">Set automatic expiration for uploads</p>
						</div>
						<label>
							<Switch
								checked={defaultExpirationEnabled}
								onchange={updateDefaultExpirationEnabled}
							/>
						</label>
					</div>

					{#if defaultExpirationEnabled}
						<div class="mt-3">
							<label for="defaultExpiration" class="text-on-surface mb-2 block text-sm font-medium">
								Default duration:
							</label>
							<select
								id="defaultExpiration"
								value={defaultExpiration}
								onchange={updateDefaultExpiration}
								class="bg-surface border-outline text-on-surface focus:ring-primary focus:border-primary w-full rounded-md border px-3 py-2 focus:ring-1"
							>
								<option value="5m">5 minutes</option>
								<option value="15m">15 minutes</option>
								<option value="30m">30 minutes</option>
								<option value="1h">1 hour</option>
								<option value="2h">2 hours</option>
								<option value="6h">6 hours</option>
								<option value="12h">12 hours</option>
								<option value="1d">1 day</option>
								<option value="3d">3 days</option>
								<option value="1w">1 week</option>
								<option value="2w">2 weeks</option>
								<option value="30d">1 month (30 days)</option>
							</select>
						</div>
					{/if}
				</div>

				<div class="bg-surface-variant flex items-center justify-between rounded-2xl p-4">
					<div>
						<h3 class="text-on-surface font-medium">Auto Copy Links</h3>
						<p class="text-on-surface-variant text-sm">Automatically copy links after upload</p>
					</div>
					<label>
						<Switch checked={autoCopyLinks} onchange={updateAutoCopyLinks} />
					</label>
				</div>
			</div>
		</div>
	</section>

	<section class="mr-10 mb-8">
		<div class="bg-surface-container rounded-3xl p-6 shadow-sm">
			<h2 class="text-on-surface mb-4 flex items-center text-2xl font-semibold">
				<div class="bg-tertiary-container mr-3 flex h-8 w-8 items-center justify-center rounded-lg">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						class="text-on-tertiary-container"
					>
						<path
							fill="currentColor"
							d="M12 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5a5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Z"
						/>
					</svg>
				</div>
				Display Options
			</h2>

			<div class="space-y-6">
				<div class="bg-surface-variant flex items-center justify-between rounded-2xl p-4">
					<div>
						<h3 class="text-on-surface font-medium">Show File Sizes</h3>
						<p class="text-on-surface-variant text-sm">Display file sizes in library view</p>
					</div>
					<label>
						<Switch checked={showFileSize} onchange={updateShowFileSize} />
					</label>
				</div>
			</div>
		</div>
	</section>

	<section class="mr-10 mb-8">
		<div class="bg-surface-container rounded-3xl p-6 shadow-sm">
			<h2 class="text-on-surface mb-4 flex items-center text-2xl font-semibold">
				<div class="bg-error-container mr-3 flex h-8 w-8 items-center justify-center rounded-lg">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						class="text-on-error-container"
					>
						<path
							fill="currentColor"
							d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2zm3.5 6L12 10.5L8.5 8L12 5.5L15.5 8zM8.5 16L12 13.5L15.5 16L12 18.5L8.5 16z"
						/>
					</svg>
				</div>
				Server Configuration
			</h2>

			<div class="space-y-6">
				<div class="bg-surface-variant rounded-2xl p-4">
					<h3 class="text-on-surface mb-2 font-medium">Domain</h3>
					<p class="text-on-surface-variant mb-3 text-sm">
						The base domain URL for file sharing links
					</p>
					<input
						type="url"
						value={domain}
						oninput={updateDomain}
						placeholder=""
						class="bg-surface border-outline text-on-surface focus:ring-primary focus:border-primary w-full rounded-md border px-3 py-2 focus:ring-1"
					/>
				</div>

				<div class="bg-surface-variant flex items-center justify-between rounded-2xl p-4">
					<div>
						<h3 class="text-on-surface font-medium">File Serving</h3>
						<p class="text-on-surface-variant text-sm">
							Serve uploaded files on port 3000 (requires restart)
						</p>
					</div>
					<label>
						<Switch checked={fileServingEnabled} onchange={updateFileServingEnabled} />
					</label>
				</div>
			</div>
		</div>
	</section>

	<section class="mr-10 mb-20">
		<div class="bg-surface-container rounded-3xl p-6 shadow-sm">
			<h2 class="text-on-surface mb-4 flex items-center text-2xl font-semibold">
				<div class="bg-primary mr-3 flex h-8 w-8 items-center justify-center rounded-lg">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						class="text-on-primary"
					>
						<path
							fill="currentColor"
							d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
						/>
					</svg>
				</div>
				System Information
			</h2>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div class="bg-surface-variant rounded-2xl p-4 text-center">
					<h3 class="text-on-surface mb-1 font-medium">Version</h3>
					<p class="text-primary text-2xl font-bold">{systemInfo.version}</p>
				</div>

				<div class="bg-surface-variant rounded-2xl p-4 text-center">
					<h3 class="text-on-surface mb-1 font-medium">Storage Used</h3>
					<p class="text-primary text-2xl font-bold">{systemInfo.storageUsed}</p>
				</div>

				<div class="bg-surface-variant rounded-2xl p-4 text-center">
					<h3 class="text-on-surface mb-1 font-medium">Total Files</h3>
					<p class="text-primary text-2xl font-bold">{systemInfo.totalFiles}</p>
				</div>
			</div>

			<div class="bg-surface-variant mt-6 rounded-2xl p-4">
				<h3 class="text-on-surface mb-2 font-medium">About SMS</h3>
				<p class="text-on-surface-variant mb-3 text-sm">
					Simple Message System (SMS) is a lightweight file sharing application built with SvelteKit
					and Material 3 design principles.
				</p>
				<div class="flex gap-2">
					<Button
						variant="tonal"
						onclick={() => window.open('https://github.com/Cattn/SMS', '_blank')}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							class="mr-1"
						>
							<path
								fill="currentColor"
								d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z"
							/>
						</svg>
						GitHub
					</Button>
					<Button
						variant="tonal"
						onclick={() => window.open('https://github.com/Cattn/SMS/#readme', '_blank')}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							class="mr-1"
						>
							<path
								fill="currentColor"
								d="M11 17h2v-6h-2v6zm1-8q.425 0 .713-.288T13 8t-.288-.713T12 7t-.712.288T11 8t.288.713T12 9zm0 13q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22Z"
							/>
						</svg>
						Help
					</Button>
				</div>
			</div>
		</div>
	</section>
</div>

<Snackbar bind:this={snackbar} />
