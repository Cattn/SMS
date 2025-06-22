<script lang="ts">
    import type { PageData } from './$types';
    import { Button, TextField, Snackbar, Chip } from 'm3-svelte';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms';
    import { configState } from '$lib/config.svelte';
    
    let { data }: { data: PageData } = $props();
    
    let snackbar: ReturnType<typeof Snackbar>;
    let createFolderDialog = $state({ open: false, folderName: '' });
    
    let folderTree = $derived(data.folderTree);
    let allFiles = $derived(data.files);
    let currentPath = $derived(data.currentPath);
    
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
            const response = await fetch('http://localhost:5823/api/folders', {
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
    
    const deleteFolder = async (folderPath: string) => {
        if (!confirm(`Are you sure you want to delete the folder "${folderPath}"?`)) return;
        
        try {
            const response = await fetch(`http://localhost:5823/api/folders/${encodeURIComponent(folderPath)}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const removeFolderFromTree = (folders: any[]): any[] => {
                    return folders.filter(folder => folder.relative_path !== folderPath)
                        .map(folder => {
                            if (folder.children) {
                                return { ...folder, children: removeFolderFromTree(folder.children) };
                            }
                            return folder;
                        });
                };
                
                data.folderTree = removeFolderFromTree(data.folderTree);
                
                snackbar.show({ message: 'Folder deleted successfully', closable: true });
            } else {
                const error = await response.json();
                snackbar.show({ message: error.error || 'Failed to delete folder', closable: true });
            }
        } catch (error) {
            snackbar.show({ message: 'Error deleting folder', closable: true });
        }
    };
    
    const toggleExcludeFolder = async (folderPath: string, excluded: boolean) => {
        try {
            const response = await fetch(`http://localhost:5823/api/folders/${encodeURIComponent(folderPath)}/exclusion`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ excluded })
            });
            
            if (response.ok) {
                const updateFolderInTree = (folders: any[]): any[] => {
                    return folders.map(folder => {
                        if (folder.relative_path === folderPath) {
                            return { ...folder, is_excluded: excluded };
                        }
                        if (folder.children) {
                            return { ...folder, children: updateFolderInTree(folder.children) };
                        }
                        return folder;
                    });
                };
                
                data.folderTree = updateFolderInTree(data.folderTree);
                
                const action = excluded ? 'excluded from' : 'included in';
                snackbar.show({ message: `Folder ${action} library successfully`, closable: true });
            } else {
                const error = await response.json();
                snackbar.show({ message: error.error || 'Failed to toggle folder exclusion', closable: true });
            }
        } catch (error) {
            snackbar.show({ message: 'Error toggling folder exclusion', closable: true });
        }
    };

    const copyFileLink = async (file: any) => {
        const link = configState.server.domain + '/SMS/uploads/' + file.relative_path;
        try {
            await navigator.clipboard.writeText(link);
            snackbar.show({ message: 'Link copied to clipboard!', closable: true });
        } catch (err) {
            snackbar.show({ message: 'Failed to copy link', closable: true });
        }
    };
</script>

<div class="mt-12 ml-32">
    <div class="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6 pr-10">
        <h1 class="text-4xl font-bold">Browse Files</h1>
        <Button variant="filled" onclick={() => createFolderDialog = { open: true, folderName: '' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="mr-2">
                <path fill="currentColor" d="M12 2c-.41 0-.75.34-.75.75v8.5h-8.5c-.41 0-.75.34-.75.75s.34.75.75.75h8.5v8.5c0 .41.34.75.75.75s.75-.34.75-.75v-8.5h8.5c.41 0 .75-.34.75-.75s-.34-.75-.75-.75h-8.5v-8.5c0-.41-.34-.75-.75-.75z" />
            </svg>
            New Folder
        </Button>
    </div>
    
    {#if breadcrumbs.length > 0 || currentPath}
        <div class="flex items-center mb-4 pr-10">
            <Button variant="text" onclick={() => goto('/browse')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="mr-1">
                    <path fill="currentColor" d="M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1" />
                </svg>
                Home
            </Button>
            
            {#each breadcrumbs as segment, index}
                <span class="mx-2 text-outline">/</span>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="mr-2">
                    <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20v-2z" />
                </svg>
                Back
            </Button>
        </div>
    {/if}
    
    {#if folders.length > 0}
        <section class="mb-8 mr-10">
            <h2 class="text-2xl font-semibold mb-4">Folders</h2>
            <div class="space-y-2">
                {#each folders as folder}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between p-3 border rounded-lg hover:shadow-md transition-shadow gap-3">
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <div class="flex items-center flex-1 min-w-0 cursor-pointer" onclick={() => navigateToFolder(folder.relative_path)}>
                            <div class="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="text-on-primary-container">
                                    <path fill="currentColor" d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8z" />
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium text-on-surface truncate">{folder.name}</p>
                                <p class="text-xs text-on-surface-variant">
                                    {new Date(folder.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        
                        <div class="flex gap-2 justify-end">
                            <form method="POST" action="?/toggleExclusion" use:enhance={() => {
                                return async ({ result, update }) => {
                                    if (result.type === 'success') {
                                        await update({ invalidateAll: true });
                                        const action = !folder.is_excluded ? 'excluded from' : 'included in';
                                        snackbar.show({ message: `Folder ${action} library successfully`, closable: true });
                                    } else {
                                        snackbar.show({ message: 'Failed to toggle folder exclusion', closable: true });
                                    }
                                };
                            }}>
                                <input type="hidden" name="folderPath" value={folder.relative_path} />
                                <input type="hidden" name="excluded" value={!folder.is_excluded} />
                                <Button type="submit" variant={folder.is_excluded ? "filled" : "outlined"}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3" />
                                        <path fill="currentColor" d="m2 2l20 20l-1.41 1.41L3.59 6.41z" />
                                    </svg>
                                </Button>
                            </form>
                            <form method="POST" action="?/deleteFolder" use:enhance={() => {
                                return async ({ result }) => {
                                    if (result.type === 'success') {
                                        const removeFolderFromTree = (folders: any[]): any[] => {
                                            return folders.filter(f => f.relative_path !== folder.relative_path)
                                                .map(f => {
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
                            }}>
                                <input type="hidden" name="folderPath" value={folder.relative_path} />
                                <Button type="submit" variant="filled" onclick={(e: Event) => {
                                    if (!confirm(`Are you sure you want to delete the folder "${folder.relative_path}"?`)) {
                                        e.preventDefault();
                                    }
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zm3-4q.425 0 .713-.288T11 16V9q0-.425-.288-.712T10 8t-.712.288T9 9v7q0 .425.288.713T10 17m4 0q.425 0 .713-.288T15 16V9q0-.425-.288-.712T14 8t-.712.288T13 9v7q0 .425.288.713T14 17" />
                                    </svg>
                                </Button>
                            </form>
                            </div>
                    </div>
                {/each}
            </div>
        </section>
    {/if}
    
    {#if files.length > 0}
        <section class="mr-10 mb-20">
            <h2 class="text-2xl font-semibold mb-4">Files</h2>
            <div class="space-y-2">
                {#each files as file}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div onclick={(event) => {
                        // show a snackbar for mobile, don't show when button clicked. bec text will likely be truncated.
                        const target = event.target as HTMLElement;
                        const isButton = target.closest('button') !== null;
                        
                        if (!isButton) {
                            snackbar.show({message: `Filename: ${file.name}`, closable: true });
                        }
                    }} class="flex flex-col md:flex-row md:items-center md:justify-between p-3 border rounded-lg hover-bg-secondary-container gap-3">
                        <div class="flex items-center space-x-1 flex-1 min-w-0">
                            {#if isImageFile(file.name)}
                                <div class="w-10 h-10 bg-secondary-container rounded flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-on-secondary-container">
                                        <path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13.5z" />
                                    </svg>
                                </div>
                            {:else if isVideoFile(file.name)}
                                <div class="w-10 h-10 bg-tertiary-container rounded flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-on-tertiary-container">
                                        <path fill="currentColor" d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            {:else}
                                <div class="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                                    <span class="text-xs font-medium text-blue-600">{getFileExtension(file.name)}</span>
                                </div>
                            {/if}
                            
                            <div class="flex-1 min-w-0 ml-1">
                                <span class="font-medium block truncate">{file.name}</span>
                                {#if configState.display.showFileSize}
                                    <span class="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                                {/if}
                            </div>
                        </div>
                        
                        <div class="flex gap-2">
                            <Button variant="outlined" onclick={() => copyFileLink(file)}>Copy Link</Button>
                            <Button variant="tonal" href={`${page.url.protocol}//${page.url.hostname}:5823/api/getFile/${file.name}`} download={file.name}>Download</Button>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    {/if}
    
    {#if folders.length === 0 && files.length === 0}
        <div class="text-center py-12 mr-10">
            <div class="w-24 h-24 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" class="text-on-surface-variant">
                    <path fill="currentColor" d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8z" />
                </svg>
            </div>
            <h3 class="text-xl font-semibold text-on-surface mb-2">Empty folder</h3>
            <p class="text-on-surface-variant">This folder contains no files or subfolders</p>
        </div>
    {/if}
</div>


    {#if createFolderDialog.open}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
            class="fixed inset-0 bg-scrim/50 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ease-out"
            onclick={(e) => {
                if (e.target === e.currentTarget) {
                    createFolderDialog = { open: false, folderName: '' };
                }
            }}
        >
            <div class="bg-surface-container-high rounded-3xl shadow-lg max-w-sm w-full mx-4 transform transition-all duration-200 ease-out scale-100">
                <div class="px-6 pt-6 pb-4">
                    <h2 class="text-xl font-medium text-on-surface">Create New Folder</h2>
                </div>
                
                <div class="px-6 pb-4 w-max">
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
                    <Button variant="text" onclick={() => createFolderDialog = { open: false, folderName: '' }}>
                        Cancel
                    </Button>
                    <Button variant="filled" onclick={createFolder}>
                        Create
                    </Button>
                </div>
            </div>
        </div>
    {/if}

<Snackbar bind:this={snackbar} />

