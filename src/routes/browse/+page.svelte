<script lang="ts">
	import type { PageData } from './$types';
	import { Button, TextField, Snackbar, Chip } from 'm3-svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { configState } from '$lib/config.svelte';
	import { hdrifyBackground, hdrify } from '@cattn/hdr';

	let { data }: { data: PageData } = $props();

	let snackbar: ReturnType<typeof Snackbar>;
	let createFolderDialog = $state({ open: false, folderName: '' });
	const generateRandomColor = () => {
		const colors = [
			'#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
			'#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', 
			'#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', 
			'#ec4899', '#f43f5e'
		];
		return colors[Math.floor(Math.random() * colors.length)];
	};

	let createTagDialog = $state({ open: false, tagName: '', tagColor: generateRandomColor() });
	let manageTagsDialog = $state({ open: false });
	let tagMenus = $state<{ [key: string]: boolean }>({});
	let itemTags = $state<{ [key: string]: any[] }>({});
	let searchQuery = $state('');

	let folderTree = $derived(data.folderTree);
	let allFiles = $derived(data.files);
	let currentPath = $derived(data.currentPath);
	let allTags = $derived((data as any).tags || []);

	let folders = $derived.by(() => {
		const flattenFolders = (folders: any[], parentPath = ''): any[] => {
			let result: any[] = [];
			for (const folder of folders) {
				if (folder.parent_path === currentPath) {
					result.push(folder);
				}
				result = result.concat(flattenFolders(folder.children || [], folder.relative_path));
			}
			return result;
		};
		return flattenFolders(folderTree);
	});

	let files = $derived(allFiles);

	let filteredContent = $derived.by(() => {
		if (!searchQuery.trim()) {
			return { folders, files };
		}

		const query = searchQuery.toLowerCase();
		const filteredFolders = folders.filter((folder: any) => 
			folder.name.toLowerCase().includes(query) ||
			(itemTags[`folder-${folder.relative_path}`] || []).some((tag: any) => 
				tag.name.toLowerCase().includes(query)
			)
		);
		const filteredFiles = files.filter((file: any) => 
			file.name.toLowerCase().includes(query) ||
			(itemTags[`file-${file.relative_path}`] || []).some((tag: any) => 
				tag.name.toLowerCase().includes(query)
			)
		);

		return { folders: filteredFolders, files: filteredFiles };
	});

	const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
	const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v'];

	const isImageFile = (filename: string) => {
		const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
		return imageExtensions.includes(ext);
	};

	const isVideoFile = (filename: string) => {
		const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
		return videoExtensions.includes(ext);
	};

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	};

	const getFileExtension = (filename: string) => {
		return filename.substring(filename.lastIndexOf('.') + 1).toUpperCase();
	};

	const navigateToFolder = (folderPath: string) => {
		goto(`/browse?path=${encodeURIComponent(folderPath)}`);
	};

	const navigateUp = () => {
		if (currentPath) {
			const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
			goto(`/browse?path=${encodeURIComponent(parentPath)}`);
		}
	};

	const breadcrumbs = $derived.by(() => {
		if (!currentPath) return [];
		return currentPath.split('/').filter(Boolean);
	});

	const createFolder = async () => {
		if (!createFolderDialog.folderName.trim()) {
			snackbar.show({ message: 'Folder name is required', closable: true });
			return;
		}

		try {
			const response = await fetch('http://' + page.url.hostname + ':5823/api/folders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					folderName: createFolderDialog.folderName,
					parentPath: currentPath
				})
			});

			if (response.ok) {
				snackbar.show({ message: 'Folder created successfully', closable: true });
				createFolderDialog = { open: false, folderName: '' };
				goto(`/browse?path=${encodeURIComponent(currentPath)}`, { invalidateAll: true });
			} else {
				const error = await response.json();
				snackbar.show({ message: error.error || 'Failed to create folder', closable: true });
			}
		} catch (error) {
			snackbar.show({ message: 'Error creating folder', closable: true });
		}
	};

	const createTag = async () => {
		if (!createTagDialog.tagName.trim()) {
			snackbar.show({ message: 'Tag name is required', closable: true });
			return;
		}

		try {
			const response = await fetch('http://' + page.url.hostname + ':5823/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: createTagDialog.tagName,
					color: createTagDialog.tagColor
				})
			});

			if (response.ok) {
				snackbar.show({ message: 'Tag created successfully', closable: true });
				createTagDialog = { open: false, tagName: '', tagColor: generateRandomColor() };
				manageTagsDialog = { open: false };
				goto(`/browse?path=${encodeURIComponent(currentPath)}`, { invalidateAll: true });
			} else {
				const error = await response.json();
				snackbar.show({ message: error.error || 'Failed to create tag', closable: true });
			}
		} catch (error) {
			snackbar.show({ message: 'Error creating tag', closable: true });
		}
	};

	const loadItemTags = async (itemType: 'file' | 'folder', itemPath: string) => {
		const key = `${itemType}-${itemPath}`;
		if (itemTags[key]) return;

		try {
			const response = await fetch(
				`http://${page.url.hostname}:5823/api/${itemType}s/${encodeURIComponent(itemPath)}/tags`
			);
			if (response.ok) {
				const data = await response.json();
				itemTags[key] = data.tags;
			}
		} catch (error) {
			console.error(`Error loading ${itemType} tags:`, error);
		}
	};

	const addTagToItem = async (itemType: 'file' | 'folder', itemPath: string, tagId: string) => {
		try {
			const response = await fetch(
				`http://${page.url.hostname}:5823/api/${itemType}s/${encodeURIComponent(itemPath)}/tags`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ tagId })
				}
			);

			if (response.ok) {
				snackbar.show({ message: 'Tag added successfully', closable: true });
				
				const key = `${itemType}-${itemPath}`;
				const tagToAdd = allTags.find((tag: any) => tag.id === tagId);
				if (tagToAdd) {
					if (!itemTags[key]) {
						itemTags[key] = [];
					}
					if (!itemTags[key].some((tag: any) => tag.id === tagId)) {
						itemTags[key] = [...itemTags[key], tagToAdd];
					}
				}
				
				tagMenus = {};
			} else {
				const error = await response.json();
				snackbar.show({ message: error.error || 'Failed to add tag', closable: true });
			}
		} catch (error) {
			snackbar.show({ message: 'Error adding tag', closable: true });
		}
	};

	const removeTagFromItem = async (itemType: 'file' | 'folder', itemPath: string, tagId: string) => {
		try {
			const response = await fetch(
				`http://${page.url.hostname}:5823/api/${itemType}s/${encodeURIComponent(itemPath)}/tags/${tagId}`,
				{ method: 'DELETE' }
			);

			if (response.ok) {
				snackbar.show({ message: 'Tag removed successfully', closable: true });
				
				const key = `${itemType}-${itemPath}`;
				if (itemTags[key]) {
					itemTags[key] = itemTags[key].filter((tag: any) => tag.id !== tagId);
				}
			} else {
				const error = await response.json();
				snackbar.show({ message: error.error || 'Failed to remove tag', closable: true });
			}
		} catch (error) {
			snackbar.show({ message: 'Error removing tag', closable: true });
		}
	};

	const deleteTag = async (tagId: string) => {
		try {
			const response = await fetch(`http://${page.url.hostname}:5823/api/tags/${tagId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				snackbar.show({ message: 'Tag deleted successfully', closable: true });
				manageTagsDialog = { open: false };
				goto(`/browse?path=${encodeURIComponent(currentPath)}`, { invalidateAll: true });
			} else {
				const error = await response.json();
				snackbar.show({ message: error.error || 'Failed to delete tag', closable: true });
			}
		} catch (error) {
			snackbar.show({ message: 'Error deleting tag', closable: true });
		}
	};

	const getTagUsage = async (tagId: string) => {
		try {
			const tagName = allTags.find((tag: any) => tag.id === tagId)?.name || '';
			const response = await fetch(`http://${page.url.hostname}:5823/api/search/tags?tags=${encodeURIComponent(tagName)}`);

			if (response.ok) {
				const data = await response.json();
				return {
					files: data.files?.length || 0,
					folders: data.folders?.length || 0
				};
			}
		} catch (error) {
			console.error('Error getting tag usage:', error);
		}
		return { files: 0, folders: 0 };
	};

	const copyFileLink = async (file: any) => {
		const link = configState.server.domain + '/SMS/uploads/' + file.relative_path;
		try {
			await navigator.clipboard.writeText(link);
			snackbar.show({ message: 'Link copied to clipboard!', closable: true });
		} catch (err) {
			try {
				const textArea = document.createElement('textarea');
				textArea.value = link;
				textArea.style.position = 'fixed';
				textArea.style.left = '-999999px';
				textArea.style.top = '-999999px';
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				
				const successful = document.execCommand('copy');
				document.body.removeChild(textArea);
				
				if (successful) {
					snackbar.show({ message: 'Link copied to clipboard!', closable: true });
				} else {
					snackbar.show({ message: 'Failed to copy link', closable: true });
				}
			} catch (fallbackErr) {
				snackbar.show({ message: 'Failed to copy link', closable: true });
			}
		}
	};

	$effect(() => {
		folders.forEach((folder: any) => loadItemTags('folder', folder.relative_path));
		files.forEach((file: any) => loadItemTags('file', file.relative_path));
	});


</script>

<div class="mt-12 ml-32">
	<div class="mb-3 flex flex-col gap-4 pr-10 md:flex-row md:items-center md:justify-between">
		<h1 class="text-4xl font-bold" {@attach hdrify()}>Browse Files</h1>
		<div class="flex gap-2">
			<Button variant="outlined" onclick={() => (createTagDialog = { open: true, tagName: '', tagColor: generateRandomColor() })}>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m9 16l-.825 3.275q-.075.325-.325.525t-.6.2q-.475 0-.775-.375T6.3 18.8L7 16H4.275q-.5 0-.8-.387T3.3 14.75q.075-.35.35-.55t.625-.2H7.5l1-4H5.775q-.5 0-.8-.387T4.8 8.75q.075-.35.35-.55t.625-.2H9l.825-3.275Q9.9 4.4 10.15 4.2t.6-.2q.475 0 .775.375t.175.825L11 8h4l.825-3.275q.075-.325.325-.525t.6-.2q.475 0 .775.375t.175.825L17 8h2.725q.5 0 .8.387t.175.863q-.075.35-.35.55t-.625.2H16.5l-1 4h2.725q.5 0 .8.388t.175.862q-.075.35-.35.55t-.625.2H15l-.825 3.275q-.075.325-.325.525t-.6.2q-.475 0-.775-.375T12.3 18.8L13 16zm.5-2h4l1-4h-4z"/></svg>
				New Tag
			</Button>
			<Button variant="filled" onclick={() => (createFolderDialog = { open: true, folderName: '' })} {@attach hdrifyBackground()}>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="mr-2">
					<path fill="currentColor" d="M12 2c-.41 0-.75.34-.75.75v8.5h-8.5c-.41 0-.75.34-.75.75s.34.75.75.75h8.5v8.5c0 .41.34.75.75.75s.75-.34.75-.75v-8.5h8.5c.41 0 .75-.34.75-.75s-.34-.75-.75-.75h-8.5v-8.5c0-.41-.34-.75-.75-.75z"/>
				</svg>
				New Folder
			</Button>
		</div>
	</div>
	<div class="mb-3 md:mb-3 flex flex-col gap-4 pr-10 md:flex-row md:items-center md:justify-end">
		<div class="flex gap-2">
			<Button variant="text" onclick={() => (manageTagsDialog = { open: true })}>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="mr-2">
					<path fill="currentColor" d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64z"/>
				</svg>
				<p {@attach hdrify()}>Manage Tags</p>
			</Button>
		</div>
	</div>

	<div class="mb-6 pr-10">
		<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search files, folders, and tags..."
				class="bg-surface border-outline text-on-surface focus:ring-primary focus:border-primary w-full rounded-md border px-3 py-2 focus:ring-1"
			/>
	</div>

	{#if breadcrumbs.length > 0 || currentPath}
		<div class="mb-4 flex items-center pr-10">
			<Button variant="text" onclick={() => goto('/browse')}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					class="mr-1"
				>
					<path
						fill="currentColor"
						d="M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1"
					/>
				</svg>
				Home
			</Button>

			{#each breadcrumbs as segment, index}
				<span class="text-outline mx-2">/</span>
				<Button
					variant="text"
					onclick={() => {
						const path = breadcrumbs.slice(0, index + 1).join('/');
						navigateToFolder(path);
					}}
				>
					{segment}
				</Button>
			{/each}
		</div>
	{/if}

	{#if currentPath}
		<div class="mb-4 pr-10">
			<Button variant="outlined" onclick={navigateUp}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					class="mr-2"
				>
					<path
						fill="currentColor"
						d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20v-2z"
					/>
				</svg>
				Back
			</Button>
		</div>
	{/if}

	{#if filteredContent.folders.length > 0}
		<section class="mr-10 mb-8">
			<h2 class="mb-4 text-2xl font-semibold" {@attach hdrify()}>Folders</h2>
			<div class="space-y-2">
				{#each filteredContent.folders as folder}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="flex flex-col gap-3 rounded-lg border p-3 transition-shadow hover:shadow-md md:flex-row md:items-center md:justify-between"
					>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div
							class="flex min-w-0 flex-1 cursor-pointer items-center"
							onclick={() => navigateToFolder(folder.relative_path)}
						>
							<div
								class="bg-primary-container mr-3 flex h-10 w-10 items-center justify-center rounded-lg"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									class="text-on-primary-container"
								>
									<path
										fill="currentColor"
										d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8z"
									/>
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-on-surface truncate font-medium">{folder.name}</p>
								<p class="text-on-surface-variant text-xs">
									{new Date(folder.created_at).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})}
								</p>
								{#if itemTags[`folder-${folder.relative_path}`]?.length > 0}
									<div class="flex flex-wrap gap-1 mt-1">
										{#each itemTags[`folder-${folder.relative_path}`] as tag}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_static_element_interactions -->
											<div onclick={(e) => e.stopPropagation()}>
												<Chip
													variant="assist"
													style="background-color: {tag.color}20; color: {tag.color};"
													click={() => removeTagFromItem('folder', folder.relative_path, tag.id)}
												>
													{tag.name}
												</Chip>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>

						<div class="flex justify-end gap-2">
							<div class="relative">
								<Button 
									variant="text"
									onclick={() => {
										const key = `folder-${folder.relative_path}`;
										const wasOpen = tagMenus[key];
										tagMenus = {};
										if (!wasOpen) {
											tagMenus[key] = true;
										}
									}}
								>
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m9 16l-.825 3.275q-.075.325-.325.525t-.6.2q-.475 0-.775-.375T6.3 18.8L7 16H4.275q-.5 0-.8-.387T3.3 14.75q.075-.35.35-.55t.625-.2H7.5l1-4H5.775q-.5 0-.8-.387T4.8 8.75q.075-.35.35-.55t.625-.2H9l.825-3.275Q9.9 4.4 10.15 4.2t.6-.2q.475 0 .775.375t.175.825L11 8h4l.825-3.275q.075-.325.325-.525t.6-.2q.475 0 .775.375t.175.825L17 8h2.725q.5 0 .8.387t.175.863q-.075.35-.35.55t-.625.2H16.5l-1 4h2.725q.5 0 .8.388t.175.862q-.075.35-.35.55t-.625.2H15l-.825 3.275q-.075.325-.325.525t-.6.2q-.475 0-.775-.375T12.3 18.8L13 16zm.5-2h4l1-4h-4z"/></svg>
								</Button>
								{#if tagMenus[`folder-${folder.relative_path}`]}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div 
										class="tag-menu-popup absolute top-full right-0 mt-1 bg-surface border rounded-lg shadow-lg p-2 z-10 min-w-48"
										onclick={(e) => e.stopPropagation()}
									>
										<div class="max-h-40 overflow-y-auto">
											{#each allTags as tag}
												<button
													class="w-full text-left px-2 py-1 hover:bg-on-surface-variant hover:text-secondary-container rounded text-sm"
													onclick={() => addTagToItem('folder', folder.relative_path, tag.id)}
												>
													<span style="color: {tag.color};">●</span> {tag.name}
												</button>
											{/each}
										</div>
									</div>
								{/if}
							</div>
							<form
								method="POST"
								action="?/toggleExclusion"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											await update({ invalidateAll: true });
											const action = !folder.is_excluded ? 'excluded from' : 'included in';
											snackbar.show({
												message: `Folder ${action} library successfully`,
												closable: true
											});
										} else {
											snackbar.show({
												message: 'Failed to toggle folder exclusion',
												closable: true
											});
										}
									};
								}}
							>
								<input type="hidden" name="folderPath" value={folder.relative_path} />
								<input type="hidden" name="excluded" value={!folder.is_excluded} />
								<Button type="submit" variant={folder.is_excluded ? 'filled' : 'outlined'} {@attach hdrifyBackground()}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
									>
										<path
											fill="currentColor"
											d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3"
										/>
										<path fill="currentColor" d="m2 2l20 20l-1.41 1.41L3.59 6.41z" />
									</svg>
								</Button>
							</form>
							<form
								method="POST"
								action="?/deleteFolder"
								use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') {
											const removeFolderFromTree = (folders: any[]): any[] => {
												return folders
													.filter((f) => f.relative_path !== folder.relative_path)
													.map((f) => {
														if (f.children) {
															return { ...f, children: removeFolderFromTree(f.children) };
														}
														return f;
													});
											};

											data.folderTree = removeFolderFromTree(data.folderTree);

											snackbar.show({ message: 'Folder deleted successfully', closable: true });
										} else {
											snackbar.show({ message: 'Failed to delete folder', closable: true });
										}
									};
								}}
							>
								<input type="hidden" name="folderPath" value={folder.relative_path} />
								<Button
									type="submit"
									variant="filled"
									onclick={(e: Event) => {
										if (
											!confirm(
												`Are you sure you want to delete the folder "${folder.relative_path}"?`
											)
										) {
											e.preventDefault();
										}
									}}
									{@attach hdrifyBackground()}
								>
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
				{/each}
			</div>
		</section>
	{/if}

	{#if filteredContent.files.length > 0}
		<section class="mr-10 mb-20">
			<h2 class="mb-4 text-2xl font-semibold" {@attach hdrify()}>Files</h2>
			<div class="space-y-2">
				{#each filteredContent.files as file}
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
							{#if isImageFile(file.name)}
								<div
									class="bg-secondary-container flex h-10 w-10 items-center justify-center rounded"
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
											d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13.5z"
										/>
									</svg>
								</div>
							{:else if isVideoFile(file.name)}
								<div
									class="bg-tertiary-container flex h-10 w-10 items-center justify-center rounded"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="20"
										height="20"
										viewBox="0 0 24 24"
										class="text-on-tertiary-container"
									>
										<path fill="currentColor" d="M8 5v14l11-7z" />
									</svg>
								</div>
							{:else}
								<div class="flex h-10 w-10 items-center justify-center rounded bg-blue-100">
									<span class="text-xs font-medium text-blue-600"
										>{getFileExtension(file.name)}</span
									>
								</div>
							{/if}

							<div class="ml-1 min-w-0 flex-1">
								<span class="block truncate font-medium">{file.name}</span>
								{#if configState.display.showFileSize}
									<span class="text-xs text-gray-500">{formatFileSize(file.size)}</span>
								{/if}
								{#if itemTags[`file-${file.relative_path}`]?.length > 0}
									<div class="flex flex-wrap gap-1 mt-1">
										{#each itemTags[`file-${file.relative_path}`] as tag}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_static_element_interactions -->
											<div onclick={(e) => e.stopPropagation()}>
												<Chip
													variant="assist"
													style="background-color: {tag.color}20; color: {tag.color};"
													click={() => removeTagFromItem('file', file.relative_path, tag.id)}
													{@attach hdrifyBackground()}
												>
													{tag.name}
												</Chip>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>

						<div class="flex gap-2">
							<div class="relative">
								<Button 
									variant="text"
									onclick={() => {
										const key = `file-${file.relative_path}`;
										const wasOpen = tagMenus[key];
										tagMenus = {};
										if (!wasOpen) {
											tagMenus[key] = true;
										}
									}}
								>
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m9 16l-.825 3.275q-.075.325-.325.525t-.6.2q-.475 0-.775-.375T6.3 18.8L7 16H4.275q-.5 0-.8-.387T3.3 14.75q.075-.35.35-.55t.625-.2H7.5l1-4H5.775q-.5 0-.8-.387T4.8 8.75q.075-.35.35-.55t.625-.2H9l.825-3.275Q9.9 4.4 10.15 4.2t.6-.2q.475 0 .775.375t.175.825L11 8h4l.825-3.275q.075-.325.325-.525t.6-.2q.475 0 .775.375t.175.825L17 8h2.725q.5 0 .8.387t.175.863q-.075.35-.35.55t-.625.2H16.5l-1 4h2.725q.5 0 .8.388t.175.862q-.075.35-.35.55t-.625.2H15l-.825 3.275q-.075.325-.325.525t-.6.2q-.475 0-.775-.375T12.3 18.8L13 16zm.5-2h4l1-4h-4z"/></svg>
								</Button>
								{#if tagMenus[`file-${file.relative_path}`]}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div 
										class="tag-menu-popup absolute top-full right-0 mt-1 bg-surface border rounded-lg shadow-lg p-2 z-10 min-w-48"
										onclick={(e) => e.stopPropagation()}
									>
										<div class="max-h-40 overflow-y-auto">
											{#each allTags as tag}
												<button
													class="w-full text-left px-2 py-1 hover:bg-on-surface-variant hover:text-secondary-container rounded text-sm"
													onclick={() => addTagToItem('file', file.relative_path, tag.id)}
												>
													<span style="color: {tag.color};">●</span> {tag.name}
												</button>
											{/each}
										</div>
									</div>
								{/if}
							</div>
							<Button variant="outlined" onclick={() => copyFileLink(file)}>Copy Link</Button>
							<Button
								variant="tonal"
								href={`${page.url.protocol}//${page.url.hostname}:5823/api/getFile/${file.name}`}
								download={file.name}>Download</Button
							>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if filteredContent.folders.length === 0 && filteredContent.files.length === 0}
		<div class="mr-10 py-12 text-center">
			<div
				class="bg-surface-variant mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="48"
					height="48"
					viewBox="0 0 24 24"
					class="text-on-surface-variant"
				>
					<path
						fill="currentColor"
						d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8z"
					/>
				</svg>
			</div>
			<h3 class="text-on-surface mb-2 text-xl font-semibold">Empty folder</h3>
			<p class="text-on-surface-variant">This folder contains no files or subfolders</p>
		</div>
	{/if}
</div>

{#if createFolderDialog.open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="bg-scrim/50 fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ease-out"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				createFolderDialog = { open: false, folderName: '' };
			}
		}}
	>
		<div
			class="bg-surface-container-high mx-4 w-full max-w-sm scale-100 transform rounded-3xl shadow-lg transition-all duration-200 ease-out"
		>
			<div class="px-6 pt-6 pb-4">
				<h2 class="text-on-surface text-xl font-medium">Create New Folder</h2>
			</div>

			<div class="w-max px-6 pb-4">
				<TextField
					bind:value={createFolderDialog.folderName}
					label="Folder name"
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							createFolder();
						}
					}}
				/>
			</div>

			<div class="flex justify-end gap-2 px-6 pb-6">
				<Button
					variant="text"
					onclick={() => (createFolderDialog = { open: false, folderName: '' })}
				>
					Cancel
				</Button>
				<Button variant="filled" onclick={createFolder}>Create</Button>
			</div>
		</div>
	</div>
{/if}

{#if createTagDialog.open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="bg-scrim/50 fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ease-out"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				createTagDialog = { open: false, tagName: '', tagColor: generateRandomColor() };
			}
		}}
	>
		<div
			class="bg-surface-container-high mx-4 w-full max-w-sm scale-100 transform rounded-3xl shadow-lg transition-all duration-200 ease-out"
		>
			<div class="px-6 pt-6 pb-4">
				<h2 class="text-on-surface text-xl font-medium">Create New Tag</h2>
			</div>

			<div class="w-max px-6 pb-4">
				<TextField
					bind:value={createTagDialog.tagName}
					label="Tag name"
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							createTag();
						}
					}}
				/>
			</div>

			<div class="flex justify-end gap-2 px-6 pb-6">
				<Button
					variant="text"
					onclick={() => (createTagDialog = { open: false, tagName: '', tagColor: generateRandomColor() })}
				>
					Cancel
				</Button>
				<Button variant="filled" onclick={createTag}>Create</Button>
			</div>
		</div>
	</div>
{/if}

{#if manageTagsDialog.open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="bg-scrim/50 fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ease-out"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				manageTagsDialog = { open: false };
			}
		}}
	>
		<div
			class="bg-surface-container-high mx-4 w-full max-w-2xl scale-100 transform rounded-3xl shadow-lg transition-all duration-200 ease-out"
		>
			<div class="px-6 pt-6 pb-4">
				<h2 class="text-on-surface text-xl font-medium">Manage Tags</h2>
				<p class="text-on-surface-variant text-sm mt-1">View and manage all tags in your system</p>
			</div>

			<div class="px-6 pb-4 max-h-96 overflow-y-auto">
				{#if allTags.length > 0}
					<div class="space-y-2">
						{#each allTags as tag}
							<div class="flex items-center justify-between p-3 rounded-lg border">
								<div class="flex items-center gap-3">
									<div 
										class="w-4 h-4 rounded-full"
										style="background-color: {tag.color};"
									></div>
									<div>
										<span class="font-medium">{tag.name}</span>
										<p class="text-xs text-gray-500">
											Created {new Date(tag.created_at).toLocaleDateString()}
										</p>
									</div>
								</div>
								
								<div class="flex items-center gap-2">
									<Button
										variant="outlined"
										onclick={async () => {
											const usage = await getTagUsage(tag.id);
											const totalUsage = usage.files + usage.folders;
											if (totalUsage > 0) {
												if (confirm(`This tag is used on ${totalUsage} item(s). Are you sure you want to delete it?`)) {
													deleteTag(tag.id);
												}
											} else {
												if (confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
													deleteTag(tag.id);
												}
											}
										}}
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
											<path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zm3-4q.425 0 .713-.288T11 16V9q0-.425-.288-.712T10 8t-.712.288T9 9v7q0 .425.288.713T10 17m4 0q.425 0 .713-.288T15 16V9q0-.425-.288-.712T14 8t-.712.288T13 9v7q0 .425.288.713T14 17"/>
										</svg>
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-8">
						<div class="bg-surface-variant mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
							<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-on-surface-variant">
								<path fill="currentColor" d="M5.5 7A1.5 1.5 0 0 0 4 8.5v7A1.5 1.5 0 0 0 5.5 17h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 18.5 7h-13Z"/>
							</svg>
						</div>
						<h3 class="text-on-surface text-lg font-medium">No tags yet</h3>
						<p class="text-on-surface-variant">Create your first tag to get started</p>
					</div>
				{/if}
			</div>

			<div class="flex justify-between px-6 pb-6">
				<Button variant="text" onclick={() => {
					createTagDialog = { open: true, tagName: '', tagColor: generateRandomColor() };
					manageTagsDialog = { open: false };
				}}>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="mr-2">
						<path fill="currentColor" d="M12 2c-.41 0-.75.34-.75.75v8.5h-8.5c-.41 0-.75.34-.75.75s.34.75.75.75h8.5v8.5c0 .41.34.75.75.75s.75-.34.75-.75v-8.5h8.5c.41 0 .75-.34.75-.75s-.34-.75-.75-.75h-8.5v-8.5c0-.41-.34-.75-.75-.75z"/>
					</svg>
					New Tag
				</Button>
				<Button variant="filled" onclick={() => (manageTagsDialog = { open: false })}>
					Close
				</Button>
			</div>
		</div>
	</div>
{/if}

<Snackbar bind:this={snackbar} />
