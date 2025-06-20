<script lang="ts">
    import type { PageProps } from './$types';
    import { page } from '$app/state';
    import { Button } from 'm3-svelte';

    let { data }: PageProps = $props();

    let files = $derived(data.files.files);

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    
    const isImageFile = (filename: string) => {
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return imageExtensions.includes(ext);
    };

    let processedFiles = $derived(files.map((file: string) => {
        const isImage = isImageFile(file);
        return {
            name: file,
            isImage,
            url: page.url.protocol + '//' + page.url.hostname + ':5823/api/getFile/' + file,
            extension: file.substring(file.lastIndexOf('.') + 1).toUpperCase()
        }
    }));

    let imageFiles = $derived(processedFiles.filter((file: any) => file.isImage));
    let nonImageFiles = $derived(processedFiles.filter((file: any) => !file.isImage));
</script>

<div class="mt-12 ml-32">
    <h1 class="text-4xl font-bold mb-4">Library</h1>
    
    {#if imageFiles.length > 0}
        <section class="mb-8 mr-10">
            <h2 class="text-2xl font-semibold mb-4">Images</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each imageFiles as file}
                    <div class="border rounded-lg p-4 shadow-sm">
                        <img 
                            src={file.url} 
                            alt={file.name} 
                            class="w-full object-fit rounded mb-2"
                            loading="lazy"
                        />
                        <p class="text-sm text-gray-600 truncate">{file.name}</p>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    {#if nonImageFiles.length > 0}
        <section class="mr-10">
            <h2 class="text-2xl font-semibold mb-4">Files</h2>
            <div class="space-y-2">
                {#each nonImageFiles as file}
                    <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-primary-container">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                                <span class="text-xs font-medium text-blue-600">{file.extension}</span>
                            </div>
                            <span class="font-medium">{file.name}</span>
                        </div>
                        <Button variant="tonal" href={file.url} download={file.name}>Download</Button>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    {#if files.length === 0}
        <p class="text-gray-500">No files uploaded yet.</p>
    {/if}
</div>