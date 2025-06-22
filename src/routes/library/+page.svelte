<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import { Button, Snackbar, ConnectedButtons, TogglePrimitive, Chip } from 'm3-svelte';
	import { configState } from '$lib/config.svelte';
	import { enhance } from '$app/forms';

	let { data, form }: PageProps = $props();

	let snackbar: ReturnType<typeof Snackbar>;

	let files = $derived(data.files.files);
	let loadedImages = $state(new Set<string>());
	let fileExpirations = $state(new Map<string, any>());
	let expirationRequestsInProgress = $state(new Set<string>());

	const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
	const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v'];
	const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

	const isImageFile = (filename: string) => {
		if (!filename) return false;
		const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
		return imageExtensions.includes(ext);
	};

	const isVideoFile = (filename: string) => {
		if (!filename) return false;
		const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
		return videoExtensions.includes(ext);
	};

	const loadImage = (relativePath: string) => {
		loadedImages.add(relativePath);
		loadedImages = new Set(loadedImages);
	};

	let processedFiles = $derived(
		files.map((file: any) => {
			const fileName = file.name || '';
			const relativePath = file.relative_path || fileName;
			const isImage = isImageFile(fileName);
			const isVideo = isVideoFile(fileName);
			const isLargeImage = isImage && file.size > MAX_SIZE_BYTES;
			const isLargeVideo = isVideo && file.size > MAX_SIZE_BYTES;
			const shouldShowLoadButton =
				(isLargeImage || isLargeVideo) && !loadedImages.has(relativePath);
			const expiration = fileExpirations.get(relativePath);

			return {
				name: fileName,
				relative_path: relativePath,
				size: file.size,
				isImage,
				isVideo,
				isLargeImage,
				isLargeVideo,
				shouldShowLoadButton,
				hasExpiration: expiration?.hasExpiration || false,
				url:
					page.url.protocol +
					'//' +
					page.url.hostname +
					':5823/api/getFile/' +
					encodeURIComponent(relativePath),
				extension: fileName ? fileName.substring(fileName.lastIndexOf('.') + 1).toUpperCase() : ''
			};
		})
	);

	let imageFiles = $derived(processedFiles.filter((file: any) => file.isImage));
	let videoFiles = $derived(processedFiles.filter((file: any) => file.isVideo));
	let nonImageFiles = $derived(
		processedFiles.filter((file: any) => !file.isImage && !file.isVideo)
	);

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	};

	let hoveredImage = $state<string | null>(null);
	let copiedFile = $state<string | null>(null);

	function getLink(relativePath: string) {
		return configState.server.domain + '/SMS/uploads/' + relativePath;
	}

	async function copyToClipboard(relativePath: string) {
		const link = getLink(relativePath);
		snackbar.show({ message: 'Link copied to clipboard!', closable: true });

		try {
			if (!navigator.clipboard) {
				const textArea = document.createElement('textarea');
				textArea.value = link;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand('copy');
				document.body.removeChild(textArea);
			} else {
				await navigator.clipboard.writeText(link);
			}

			copiedFile = relativePath;
			setTimeout(() => {
				copiedFile = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy link:', err);
			alert('Failed to copy link. Please try again.');
		}
	}

	$effect(() => {
		if (form?.success === true) {
			snackbar.show({ message: form.message, closable: true });
		} else if (form?.success === false) {
			snackbar.show({ message: form.error, closable: true });
		}
	});

	let showImage = $state(true);
	let showFile = $state(true);
	let showVideo = $state(true);

	async function getFileExpiration(relativePath: string) {
		if (fileExpirations.has(relativePath)) {
			return fileExpirations.get(relativePath);
		}

		if (expirationRequestsInProgress.has(relativePath)) {
			return { hasExpiration: false };
		}

		expirationRequestsInProgress.add(relativePath);

		try {
			const response = await fetch(
				`${page.url.protocol}//${page.url.hostname}:5823/api/getFileExpiration/${encodeURIComponent(relativePath)}`
			);
			const data = await response.json();
			fileExpirations.set(relativePath, data);
			fileExpirations = new Map(fileExpirations);
			return data;
		} catch (error) {
			console.error('Failed to fetch expiration:', error);
			return { hasExpiration: false };
		} finally {
			expirationRequestsInProgress.delete(relativePath);
		}
	}

	async function showExpirationInfo(relativePath: string) {
		const expiration = await getFileExpiration(relativePath);

		if (expiration.hasExpiration) {
			const expiresAt = new Date(expiration.expiresAt);
			const timeRemaining = expiration.timeRemaining;

			let timeText = '';
			if (timeRemaining > 0) {
				const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
				const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

				if (hours > 24) {
					const days = Math.floor(hours / 24);
					timeText = `${days} day${days !== 1 ? 's' : ''}`;
				} else if (hours > 0) {
					timeText = `${hours}h ${minutes}m`;
				} else {
					timeText = `${minutes}m`;
				}

				snackbar.show({
					message: `Expires in ${timeText} (${expiresAt.toLocaleString()})`,
					closable: true
				});
			} else {
				snackbar.show({
					message: 'File has expired',
					closable: true
				});
			}
		} else {
			snackbar.show({
				message: 'File does not expire',
				closable: true
			});
		}
	}

	let expirationLoaded = $state(false);

	async function loadFileExpirations() {
		if (expirationLoaded) return;
		expirationLoaded = true;

		for (const file of files) {
			const relativePath = file.relative_path || file.name;
			if (!fileExpirations.has(relativePath) && !expirationRequestsInProgress.has(relativePath)) {
				await getFileExpiration(relativePath);
			}
		}
	}

	$effect(() => {
		if (files.length > 0 && !expirationLoaded) {
			loadFileExpirations();
		}
	});
</script>

<div class="mt-12 ml-32">
	<h1 class="mb-6 pr-10 text-center text-4xl font-bold">Library</h1>
	<div class="mb-5 w-full pr-10">
		<div>
			<ConnectedButtons>
				<TogglePrimitive variant="tonal" bind:toggle={showImage}>Images</TogglePrimitive>
				<TogglePrimitive variant="tonal" bind:toggle={showVideo}>Videos</TogglePrimitive>
				<TogglePrimitive variant="tonal" bind:toggle={showFile}>Files</TogglePrimitive>
			</ConnectedButtons>
		</div>
	</div>
	{#if showImage && imageFiles.length > 0}
		<section class="mr-10 mb-8">
			<h2 class="mb-4 text-2xl font-semibold">Images</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
				{#each imageFiles as file}
					<div class="flex h-full flex-col justify-between rounded-lg border p-4 shadow-sm">
						<div class="flex-grow">
							{#if file.shouldShowLoadButton}
								<div
									class="mb-2 flex h-48 w-full flex-col items-center justify-center rounded bg-gray-100"
								>
									<div class="mb-3 text-center">
										{#if configState.display.showFileSize}
											<p class="mb-1 text-sm text-gray-600">
												Large image ({formatFileSize(file.size)})
											</p>
										{/if}
										<p class="text-xs text-gray-500">Click to load</p>
									</div>
									<Button variant="filled" onclick={() => loadImage(file.relative_path)}>
										Load Image
									</Button>
								</div>
							{:else}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="relative"
									onmouseenter={() => (hoveredImage = file.relative_path)}
									onmouseleave={() => (hoveredImage = null)}
								>
									{#if hoveredImage === file.relative_path || copiedFile === file.relative_path}
										<button
											onclick={() => copyToClipboard(file.relative_path)}
											class="absolute inset-0 z-50 flex cursor-pointer flex-col items-center justify-center rounded border-0 transition-all"
											style="background-color: rgba(0, 0, 0, 0.5);"
										>
											{#if copiedFile === file.relative_path}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="40"
													height="40"
													viewBox="0 0 24 24"
													class="mb-2 text-green-400"
												>
													<path
														fill="currentColor"
														d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
													/>
												</svg>
												<span class="text-tertiary text-sm font-medium">Copied!</span>
											{:else}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="40"
													height="40"
													viewBox="0 0 24 24"
													class="text-tertiary mb-2"
												>
													<path
														fill="currentColor"
														d="M17 7h-3c-.55 0-1 .45-1 1s.45 1 1 1h3c1.65 0 3 1.35 3 3s-1.35 3-3 3h-3c-.55 0-1 .45-1 1s.45 1 1 1h3c2.76 0 5-2.24 5-5s-2.24-5-5-5m-9 5c0 .55.45 1 1 1h6c.55 0 1-.45 1-1s-.45-1-1-1H9c-.55 0-1 .45-1 1m2 3H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h3c.55 0 1-.45 1-1s-.45-1-1-1H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h3c.55 0 1-.45 1-1s-.45-1-1-1"
													/>
												</svg>
												<span class="text-tertiary text-sm font-medium">Copy Link</span>
											{/if}
										</button>
									{/if}
									<img
										src={file.url}
										alt={file.name}
										class="object-fit mb-2 w-full rounded"
										loading="lazy"
									/>
								</div>
							{/if}
						</div>
						<div class="mt-2 flex items-end justify-between">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm text-gray-600">{file.name}</p>
								{#if configState.display.showFileSize}
									<p class="text-xs text-gray-400">{formatFileSize(file.size)}</p>
								{/if}
								{#if file.hasExpiration}
									<div class="button-flex-row mt-1">
										<Chip
											click={() => showExpirationInfo(file.relative_path)}
											variant="input"
											icon={undefined}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
											>
												<path
													fill="currentColor"
													d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1m1-8h-2V7h2z"
												/>
											</svg>
											<span>Expires</span>
										</Chip>
									</div>
								{/if}
							</div>
							<div>
								<form method="POST" action="?/delete" use:enhance>
									<input type="hidden" name="fileName" value={file.relative_path} />
									<Button type="submit" variant="filled">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
										>
											<path
												fill="currentColor"
												d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zm3-4q.425 0 .713-.288T11 16V9q0-.425-.288-.712T10 8t-.712.288T9 9v7q0 .425.288.713T10 17m4 0q.425 0 .713-.288T15 16V9q0-.425-.288-.712T14 8t-.712.288T13 9v7q0 .425.288.713T14 17"
											/>
										</svg>
									</Button>
								</form>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if showVideo && videoFiles.length > 0}
		<section class="mr-10 mb-8">
			<h2 class="mb-4 text-2xl font-semibold">Videos</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
				{#each videoFiles as file}
					<div class="flex h-full flex-col justify-between rounded-lg border p-4 shadow-sm">
						<div class="flex-grow">
							{#if file.shouldShowLoadButton}
								<div
									class="mb-2 flex h-48 w-full flex-col items-center justify-center rounded bg-gray-100"
								>
									<div class="mb-3 text-center">
										{#if configState.display.showFileSize}
											<p class="mb-1 text-sm text-gray-600">
												Large video ({formatFileSize(file.size)})
											</p>
										{/if}
										<p class="text-xs text-gray-500">Click to load</p>
									</div>
									<Button variant="filled" onclick={() => loadImage(file.relative_path)}>
										Load Video
									</Button>
								</div>
							{:else}
								<!-- svelte-ignore a11y_media_has_caption -->
								<video
									src={file.url}
									title={file.name}
									class="object-fit mb-2 w-full rounded"
									controls
								></video>
							{/if}
						</div>
						<div class="mt-2">
							<div class="mb-2 flex items-end justify-between">
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm text-gray-600">{file.name}</p>
									{#if configState.display.showFileSize}
										<p class="text-xs text-gray-400">{formatFileSize(file.size)}</p>
									{/if}
									{#if file.hasExpiration}
										<div class="button-flex-row mt-1">
											<Chip
												click={() => showExpirationInfo(file.relative_path)}
												variant="input"
												icon={undefined}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="24"
													height="24"
													viewBox="0 0 24 24"
												>
													<path
														fill="currentColor"
														d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1m1-8h-2V7h2z"
													/>
												</svg>
												<span>Expires</span>
											</Chip>
										</div>
									{/if}
								</div>
								<div class="pl-2">
									<form method="POST" action="?/delete" use:enhance>
										<input type="hidden" name="fileName" value={file.relative_path} />
										<Button type="submit" variant="filled">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
											>
												<path
													fill="currentColor"
													d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zm3-4q.425 0 .713-.288T11 16V9q0-.425-.288-.712T10 8t-.712.288T9 9v7q0 .425.288.713T10 17m4 0q.425 0 .713-.288T15 16V9q0-.425-.288-.712T14 8t-.712.288T13 9v7q0 .425.288.713T14 17"
												/>
											</svg>
										</Button>
									</form>
								</div>
							</div>
							<div class="flex gap-2 md:justify-end">
								<div class="min-w-0 flex-1 md:flex-initial">
									<Button variant="outlined" onclick={() => copyToClipboard(file.relative_path)}
										>Copy Link</Button
									>
								</div>
								<div class="min-w-0 flex-1 md:flex-initial">
									<Button variant="tonal" href={file.url} download={file.name}>Download</Button>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if showFile && nonImageFiles.length > 0}
		<section class="mr-10 mb-20">
			<h2 class="mb-4 text-2xl font-semibold">Files</h2>
			<div class="space-y-2">
				{#each nonImageFiles as file}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						onclick={(event) => {
							// show a snackbar for mobile, don't show when button clicked. bec text will likely be truncated.
							const target = event.target as HTMLElement;
							const isButton = target.closest('button') !== null;

							if (!isButton) {
								snackbar.show({ message: `Filename: ${file.name}`, closable: true });
							}
						}}
						class="hover-bg-secondary-container flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
					>
						<div class="flex min-w-0 flex-1 items-center space-x-1">
							<div class="flex h-10 w-10 items-center justify-center rounded bg-blue-100">
								<span class="text-xs font-medium text-blue-600">{file.extension}</span>
							</div>
							<div class="ml-1 min-w-0 flex-1">
								<span class="block truncate font-medium">{file.name}</span>
								{#if configState.display.showFileSize}
									<span class="text-xs text-gray-500">{formatFileSize(file.size)}</span>
								{/if}
								{#if file.hasExpiration}
									<div class="button-flex-row mt-2 hidden md:block">
										<Chip
											click={() => showExpirationInfo(file.relative_path)}
											variant="assist"
											icon={undefined}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="20"
												height="20"
												viewBox="0 0 24 24"
											>
												<path
													fill="currentColor"
													d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1m1-8h-2V7h2z"
												/>
											</svg>
											<span>Expires</span>
										</Chip>
									</div>
								{/if}
							</div>
							<form method="POST" action="?/delete" use:enhance class="hidden md:block">
								<input type="hidden" name="fileName" value={file.relative_path} />
								<Button type="submit" variant="filled">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
									>
										<path
											fill="currentColor"
											d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zm3-4q.425 0 .713-.288T11 16V9q0-.425-.288-.712T10 8t-.712.288T9 9v7q0 .425.288.713T10 17m4 0q.425 0 .713-.288T15 16V9q0-.425-.288-.712T14 8t-.712.288T13 9v7q0 .425.288.713T14 17"
										/>
									</svg>
								</Button>
							</form>
						</div>
						<div class="flex items-center justify-between md:hidden">
							{#if file.hasExpiration}
								<div class="button-flex-row">
									<Chip
										click={() => showExpirationInfo(file.relative_path)}
										variant="input"
										icon={undefined}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
										>
											<path
												fill="currentColor"
												d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1m1-8h-2V7h2z"
											/>
										</svg>
										<span>Expires</span>
									</Chip>
								</div>
							{/if}
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="fileName" value={file.relative_path} />
								<Button type="submit" variant="filled">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
									>
										<path
											fill="currentColor"
											d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zm3-4q.425 0 .713-.288T11 16V9q0-.425-.288-.712T10 8t-.712.288T9 9v7q0 .425.288.713T10 17m4 0q.425 0 .713-.288T15 16V9q0-.425-.288-.712T14 8t-.712.288T13 9v7q0 .425.288.713T14 17"
										/>
									</svg>
								</Button>
							</form>
						</div>
						<div class="flex gap-2">
							<Button variant="outlined" onclick={() => copyToClipboard(file.relative_path)}
								>Copy Link</Button
							>
							<Button variant="tonal" href={file.url} download={file.name}>Download</Button>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if files.length === 0}
		<p class="text-gray-500">No files uploaded yet.</p>
	{/if}
</div>

<Snackbar bind:this={snackbar} />

<style>
	.hover-bg-secondary-container:hover {
		background-color: rgb(var(--m3-scheme-primary, 0 123 255) / 0.05) !important;
	}

	.button-flex-row :global(button) :global(span) {
		display: flex;
		flex-direction: row;
	}

	.button-flex-row :global(button) :global(span) :global(svg) {
		margin-right: 5px;
	}

	.button-flex-row :global(button) :global(span) :global(span) {
		margin-top: 2px;
	}
</style>
