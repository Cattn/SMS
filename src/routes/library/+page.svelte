<script lang="ts">
    import type { PageProps } from './$types';
    import { page } from '$app/state';
    import { Button, Snackbar, ConnectedButtons, TogglePrimitive } from 'm3-svelte';
    import { config } from '$lib/config';
    import { enhance } from '$app/forms';
    
    let { data, form }: PageProps = $props();

    let snackbar: ReturnType<typeof Snackbar>;

    let files = $derived(data.files.files);
    let loadedImages = $state(new Set<string>());

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

    const loadImage = (filename: string) => {
        loadedImages.add(filename);
        loadedImages = new Set(loadedImages);
    };

    let processedFiles = $derived(files.map((file: any) => {
        const fileName = file.name || '';
        const isImage = isImageFile(fileName);
        const isVideo = isVideoFile(fileName);
        const isLargeImage = isImage && file.size > MAX_SIZE_BYTES;
        const isLargeVideo = isVideo && file.size > MAX_SIZE_BYTES;
        const shouldShowLoadButton = (isLargeImage || isLargeVideo) && !loadedImages.has(fileName);
        
        return {
            name: fileName,
            size: file.size,
            isImage,
            isVideo,
            isLargeImage,
            isLargeVideo,
            shouldShowLoadButton,
            url: page.url.protocol + '//' + page.url.hostname + ':5823/api/getFile/' + fileName,
            extension: fileName ? fileName.substring(fileName.lastIndexOf('.') + 1).toUpperCase() : ''
        }
    }));

    let imageFiles = $derived(processedFiles.filter((file: any) => file.isImage));
    let videoFiles = $derived(processedFiles.filter((file: any) => file.isVideo));
    let nonImageFiles = $derived(processedFiles.filter((file: any) => !file.isImage && !file.isVideo));

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    let hoveredImage = $state<string | null>(null);
    let copiedFile = $state<string | null>(null);

    function getLink(fileName: string) {
        return config.domain + '/SMS/uploads/' + fileName;
    }

    async function copyToClipboard(fileName: string) {
        const link = getLink(fileName);
        snackbar.show({message: 'Link copied to clipboard!', closable: true });
        
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
            
            copiedFile = fileName;
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
</script>

<div class="mt-12 ml-32">
    <h1 class="text-4xl font-bold mb-6 text-center pr-10">Library</h1>
        <div class="w-full pr-10 mb-5">
            <div>
            <ConnectedButtons>
                <TogglePrimitive variant="tonal" bind:toggle={showImage}>
                    Images
                </TogglePrimitive>
                <TogglePrimitive variant="tonal" bind:toggle={showVideo}>
                    Videos
                </TogglePrimitive>
                <TogglePrimitive variant="tonal" bind:toggle={showFile}>
                    Files
                </TogglePrimitive>
            </ConnectedButtons>
            </div>
        </div>
    {#if showImage && imageFiles.length > 0}
        <section class="mb-8 mr-10">
            <h2 class="text-2xl font-semibold mb-4">Images</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {#each imageFiles as file}
                    <div class="border rounded-lg p-4 shadow-sm flex flex-col justify-between h-full">
                        <div class="flex-grow">
                            {#if file.shouldShowLoadButton}
                                <div class="w-full h-48 bg-gray-100 rounded mb-2 flex flex-col items-center justify-center">
                                    <div class="text-center mb-3">
                                        <p class="text-sm text-gray-600 mb-1">Large image ({formatFileSize(file.size)})</p>
                                        <p class="text-xs text-gray-500">Click to load</p>
                                    </div>
                                    <Button variant="filled" onclick={() => loadImage(file.name)}>
                                        Load Image
                                    </Button>
                                </div>
                            {:else} 
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <div 
                                    class="relative"
                                    onmouseenter={() => hoveredImage = file.name}
                                    onmouseleave={() => hoveredImage = null}
                                >
                                    {#if hoveredImage === file.name || copiedFile === file.name}
                                        <button 
                                            onclick={() => copyToClipboard(file.name)} 
                                            class="absolute inset-0 flex flex-col items-center justify-center rounded cursor-pointer z-50 border-0 transition-all"
                                            style="background-color: rgba(0, 0, 0, 0.5);"
                                        >
                                            {#if copiedFile === file.name}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" class="text-green-400 mb-2">
                                                    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                                </svg>
                                                <span class="text-tertiary text-sm font-medium">Copied!</span>
                                            {:else}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" class="text-tertiary mb-2">
                                                    <path fill="currentColor" d="M17 7h-3c-.55 0-1 .45-1 1s.45 1 1 1h3c1.65 0 3 1.35 3 3s-1.35 3-3 3h-3c-.55 0-1 .45-1 1s.45 1 1 1h3c2.76 0 5-2.24 5-5s-2.24-5-5-5m-9 5c0 .55.45 1 1 1h6c.55 0 1-.45 1-1s-.45-1-1-1H9c-.55 0-1 .45-1 1m2 3H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h3c.55 0 1-.45 1-1s-.45-1-1-1H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h3c.55 0 1-.45 1-1s-.45-1-1-1" />
                                                </svg>
                                                <span class="text-tertiary text-sm font-medium">Copy Link</span>
                                            {/if}
                                        </button>
                                    {/if}
                                    <img 
                                        src={file.url} 
                                        alt={file.name} 
                                        class="w-full object-fit rounded mb-2"
                                        loading="lazy"
                                    />
                                </div>
                            {/if}
                        </div>
                        <div class="flex justify-between items-end mt-2">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-gray-600 truncate">{file.name}</p>
                                <p class="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                            </div>
                            <div>
                                <form method="POST" action="?/delete" use:enhance>
                                    <input type="hidden" name="fileName" value={file.name} />
                                    <Button type="submit" variant="filled">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zm3-4q.425 0 .713-.288T11 16V9q0-.425-.288-.712T10 8t-.712.288T9 9v7q0 .425.288.713T10 17m4 0q.425 0 .713-.288T15 16V9q0-.425-.288-.712T14 8t-.712.288T13 9v7q0 .425.288.713T14 17" />
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
        <section class="mb-8 mr-10">
            <h2 class="text-2xl font-semibold mb-4">Videos</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {#each videoFiles as file}
                    <div class="border rounded-lg p-4 shadow-sm flex flex-col justify-between h-full">
                        <div class="flex-grow">
                            {#if file.shouldShowLoadButton}
                                <div class="w-full h-48 bg-gray-100 rounded mb-2 flex flex-col items-center justify-center">
                                    <div class="text-center mb-3">
                                        <p class="text-sm text-gray-600 mb-1">Large video ({formatFileSize(file.size)})</p>
                                        <p class="text-xs text-gray-500">Click to load</p>
                                    </div>
                                    <Button variant="filled" onclick={() => loadImage(file.name)}>
                                        Load Video
                                    </Button>
                                </div>
                            {:else} 
                                <!-- svelte-ignore a11y_media_has_caption -->
                                <video 
                                    src={file.url} 
                                    title={file.name} 
                                    class="w-full object-fit rounded mb-2"
                                    controls
                                ></video>
                            {/if}
                        </div>
                        <div class="mt-2">
                            <div class="flex justify-between items-center mb-2">
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm text-gray-600 truncate">{file.name}</p>
                                    <p class="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                                </div>
                                <div class="pl-2">
                                    <form method="POST" action="?/delete" use:enhance>
                                        <input type="hidden" name="fileName" value={file.name} />
                                        <Button type="submit" variant="filled">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zm3-4q.425 0 .713-.288T11 16V9q0-.425-.288-.712T10 8t-.712.288T9 9v7q0 .425.288.713T10 17m4 0q.425 0 .713-.288T15 16V9q0-.425-.288-.712T14 8t-.712.288T13 9v7q0 .425.288.713T14 17" />
                                            </svg>
                                        </Button>
                                    </form>
                                </div>
                            </div>
                            <div class="flex gap-2 md:justify-end">
                                <div class="flex-1 md:flex-initial min-w-0">
                                    <Button variant="outlined" onclick={() => copyToClipboard(file.name)}>Copy Link</Button>
                                </div>
                                <div class="flex-1 md:flex-initial min-w-0">
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
            <h2 class="text-2xl font-semibold mb-4">Files</h2>
            <div class="space-y-2">
                {#each nonImageFiles as file}
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
                            <div class="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                                <span class="text-xs font-medium text-blue-600">{file.extension}</span> 
                            </div>
                            <div class="flex-1 min-w-0 ml-1"> 
                                <span class="font-medium block truncate">{file.name}</span>
                                <span class="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                            </div>
                            <form method="POST" action="?/delete" use:enhance>
                                <input type="hidden" name="fileName" value={file.name} />
                                <Button type="submit" variant="filled">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zm3-4q.425 0 .713-.288T11 16V9q0-.425-.288-.712T10 8t-.712.288T9 9v7q0 .425.288.713T10 17m4 0q.425 0 .713-.288T15 16V9q0-.425-.288-.712T14 8t-.712.288T13 9v7q0 .425.288.713T14 17" />
                                    </svg>
                                </Button>
                            </form>
                        </div>
                        <div class="flex gap-2">
                            <Button variant="outlined" onclick={() => copyToClipboard(file.name)}>Copy Link</Button>
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
</style>