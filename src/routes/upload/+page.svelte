<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, LinearProgress } from 'm3-svelte';
	import { onDestroy } from 'svelte';
	import { configState } from '#lib/config.svelte.js';
	import { resumableUpload, type UploadProgress } from '#lib/resumableUpload.js';
	import { hdrifyBackground } from '@cattn/hdr';

	let files = $state<FileList | undefined>();
	let progress = $state<UploadProgress | null>(null);
	let isUploading = $state(false);
	let uploadError = $state('');
	let uploadController: AbortController | null = null;

	onDestroy(() => uploadController?.abort());

	const percent = $derived(
		progress && progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0
	);

	function formatBytes(bytes: number) {
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		let i = 0;
		while (bytes >= 1024 && i < units.length - 1) {
			bytes /= 1024;
			i++;
		}
		return `${bytes.toFixed(i === 0 || bytes >= 100 ? 0 : 1)} ${units[i]}`;
	}

	function formatEta(seconds: number) {
		if (seconds < 60) return `${Math.ceil(seconds)}s`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ${Math.round(seconds % 60)}s`;
		return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
	}

	let enableCopy = $state(configState.upload.autoCopyLinks);

	let enablePath = $state(false);
	let uploadPath = $state('');

	// Expiration settings
	let enableExpiration = $state(configState.upload.defaultExpirationEnabled);
	let expirationMode = $state<'duration' | 'datetime'>('duration');
	let expirationDuration = $state(configState.upload.defaultExpiration);
	let expirationDateTime = $state('');

	let selectedFileName = $derived.by(() => (files && files.length > 0 ? files[0].name : null));

	function getMinDateTime(): string {
		const now = new Date();
		now.setMinutes(now.getMinutes() + 1);
		return now.toISOString().slice(0, 16);
	}

	function getLink(fileName: string) {
		const base = (configState.server.domain ?? '').trim().replace(/\/+$/, '');
		const encodedFileName = encodeURIComponent(fileName);
		const pathSegments = ['SMS', 'uploads'];

		if (enablePath && uploadPath.trim()) {
			pathSegments.push(
				...uploadPath
					.trim()
					.replace(/\\/g, '/')
					.split('/')
					.filter(Boolean)
					.map((segment) => encodeURIComponent(segment))
			);
		}

		pathSegments.push(encodedFileName);
		return `${base}/${pathSegments.join('/')}`;
	}

	async function startUpload(file: File) {
		uploadError = '';
		progress = null;
		isUploading = true;
		uploadController = new AbortController();

		try {
			await resumableUpload(
				file,
				{
					uploadPath: enablePath ? uploadPath.trim() || undefined : undefined,
					expiresIn:
						enableExpiration && expirationMode === 'duration' ? expirationDuration : undefined,
					expiresAt:
						enableExpiration && expirationMode === 'datetime' && expirationDateTime
							? new Date(expirationDateTime).toISOString()
							: undefined
				},
				(update) => (progress = update),
				uploadController.signal
			);
			if (enableCopy) copyToClipboard(getLink(file.name));
		} catch (error) {
			if (!uploadController.signal.aborted) {
				console.error('Upload failed:', error);
				uploadError = error instanceof Error ? error.message : 'Upload failed. Please try again.';
			}
		} finally {
			isUploading = false;
			uploadController = null;
		}
	}

	async function copyToClipboard(text: string) {
		try {
			if (window.isSecureContext && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
				return;
			}

			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.setAttribute('readonly', '');
			textArea.style.position = 'fixed';
			textArea.style.left = '-9999px';
			textArea.style.top = '0';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			textArea.setSelectionRange(0, textArea.value.length);
			const copied = document.execCommand('copy');
			document.body.removeChild(textArea);

			if (!copied) {
				throw new Error('document.execCommand("copy") failed');
			}
		} catch (err) {
			console.error('Failed to copy link:', err);
			alert('Failed to copy link. Please try again.');
		}
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center p-4 pl-28 md:p-0">
	<form
		enctype="multipart/form-data"
		method="POST"
		class="button-mod flex w-full max-w-md flex-col items-center justify-center space-y-4 md:max-w-lg"
		use:enhance={({ cancel }) => {
			cancel();
			if (isUploading || !files?.length) return;
			startUpload(files[0]);
		}}
	>
		<input id="file" type="file" name="file" style="display: none;" bind:files />

		<label
			for="file"
			class="bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container w-full rounded-lg p-8 text-center hover:cursor-pointer md:p-20"
			{@attach hdrifyBackground()}
		>
			Select File
			<br />
			{#if selectedFileName}
				<p class="text-on-primary mt-2 text-center text-sm break-all md:text-lg">
					Selected: {selectedFileName}
				</p>
			{/if}
		</label>

		<div class="bg-surface-variant w-full space-y-3 rounded-lg p-4">
			<div class="items-left flex flex-col space-y-2">
				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="enablePath"
						bind:checked={enablePath}
						class="text-primary bg-surface border-outline focus:ring-primary h-4 w-4 rounded"
						{@attach hdrifyBackground()}
					/>
					<label for="enablePath" class="text-on-surface text-sm font-medium">
						Upload to path
					</label>
				</div>
				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="enableCopy"
						bind:checked={enableCopy}
						class="text-primary bg-surface border-outline focus:ring-primary h-4 w-4 rounded"
						{@attach hdrifyBackground()}
					/>
					<label for="enableCopy" class="text-on-surface text-sm font-medium">
						Copy link when done
					</label>
				</div>
				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="enableExpiration"
						bind:checked={enableExpiration}
						class="text-primary bg-surface border-outline focus:ring-primary h-4 w-4 rounded"
						{@attach hdrifyBackground()}
					/>
					<label for="enableExpiration" class="text-on-surface text-sm font-medium">
						Set file expiration
					</label>
				</div>
			</div>

			{#if enablePath}
				<div>
					<label for="uploadPath" class="text-on-surface mb-1 block text-sm font-medium">
						Upload to folder:
					</label>
					<input
						type="text"
						id="uploadPath"
						bind:value={uploadPath}
						placeholder="e.g., images/ or leave empty for root"
						class="bg-surface border-outline text-on-surface focus:ring-primary focus:border-primary w-full rounded-md border px-3 py-2 focus:ring-1"
					/>
					<p class="text-on-surface-variant mt-1 text-xs">
						Specify a relative path from the root. Use forward slashes (/) to separate folders.
					</p>
				</div>
			{/if}

			{#if enableExpiration}
				<div class="space-y-3">
					<div class="flex space-x-4">
						<label class="flex items-center space-x-2">
							<input
								type="radio"
								bind:group={expirationMode}
								value="duration"
								class="text-primary bg-surface border-outline h-4 w-4"
							/>
							<span class="text-on-surface text-sm">Duration</span>
						</label>
						<label class="flex items-center space-x-2">
							<input
								type="radio"
								bind:group={expirationMode}
								value="datetime"
								class="text-primary bg-surface border-outline h-4 w-4"
							/>
							<span class="text-on-surface text-sm">Specific Date & Time</span>
						</label>
					</div>

					{#if expirationMode === 'duration'}
						<div>
							<label for="duration" class="text-on-surface mb-1 block text-sm font-medium">
								Delete after:
							</label>
							<select
								id="duration"
								bind:value={expirationDuration}
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

					{#if expirationMode === 'datetime'}
						<div>
							<label for="datetime" class="text-on-surface mb-1 block text-sm font-medium">
								Delete at:
							</label>
							<input
								type="datetime-local"
								id="datetime"
								bind:value={expirationDateTime}
								min={getMinDateTime()}
								class="bg-surface border-outline text-on-surface focus:ring-primary focus:border-primary w-full rounded-md border px-3 py-2 focus:ring-1"
							/>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if isUploading}
			<div class="w-full space-y-2" aria-live="polite">
				<LinearProgress {percent} />
				<div class="text-on-surface-variant flex justify-between gap-4 text-xs tabular-nums">
					<span>
						{Math.floor(percent)}% · {formatBytes(progress?.loaded ?? 0)} of {formatBytes(
							progress?.total ?? files?.[0]?.size ?? 0
						)}
					</span>
					<span>
						{#if progress?.reconnecting}
							Reconnecting…
						{:else if progress?.speed}
							{formatBytes(progress.speed)}/s{progress.eta !== null
								? ` · ${formatEta(progress.eta)} left`
								: ''}
						{:else}
							Starting…
						{/if}
					</span>
				</div>
			</div>
		{/if}

		{#if uploadError}
			<p role="alert" class="text-error text-sm">{uploadError}</p>
		{/if}

		{#if isUploading}
			<Button square variant="tonal" type="button" onclick={() => uploadController?.abort()}>
				Cancel
			</Button>
		{:else}
			<Button square variant="filled" type="submit" disabled={!files || files.length === 0}>
				Upload
			</Button>
		{/if}
	</form>
</div>

<style>
	.button-mod :global(button) {
		margin-top: 20px;
		justify-content: center;
	}
</style>
