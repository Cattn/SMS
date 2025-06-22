<script lang="ts">
	import { enhance } from '$app/forms';
    import { Button, WavyLinearProgress } from "m3-svelte";
    import { configState } from '$lib/config.svelte';

    let files = $state<FileList | undefined>();
    let uploadProgress = $state(0);
    let targetProgress = $state(0);
    let isUploading = $state(false);
    let uploadToken = $state('');
    let progressEventSource: EventSource | null = null;
    let animationInterval: ReturnType<typeof setInterval> | null = null;

    let enableCopy = $state(configState.upload.autoCopyLinks);

    let enablePath = $state(false);
    let uploadPath = $state('');
    
    // Expiration settings
    let enableExpiration = $state(configState.upload.defaultExpirationEnabled);
    let expirationMode = $state<'duration' | 'datetime'>('duration');
    let expirationDuration = $state(configState.upload.defaultExpiration);
    let expirationDateTime = $state('');

    let selectedFileName = $derived.by(() => files && files.length > 0 ? files[0].name : null);

    function generateUploadToken(): string {
        return `upload_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }

    function animateProgress() {
        if (animationInterval) clearInterval(animationInterval);
        
        animationInterval = setInterval(() => {
            const diff = targetProgress - uploadProgress;
            if (Math.abs(diff) < 0.5) {
                uploadProgress = targetProgress;
                if (animationInterval) {
                    clearInterval(animationInterval);
                    animationInterval = null; 
                }
            } else {
                uploadProgress += diff * 0.1;
            }
        }, 50);
    }

    function startProgressTracking(token: string) {
        progressEventSource?.close();
        if (animationInterval) clearInterval(animationInterval);
        
        uploadProgress = 0;
        targetProgress = 0;
        isUploading = true;

        const apiUrl = `http://${window.location.hostname}:5823/api/upload-progress/${token}`;
        progressEventSource = new EventSource(apiUrl);
        
        progressEventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            targetProgress = data.progress;
            animateProgress();
            
            if (data.progress >= 100) {
                progressEventSource?.close();
                progressEventSource = null;
                setTimeout(() => {
                    isUploading = false;
                    if (animationInterval) {
                        clearInterval(animationInterval);
                        animationInterval = null;
                    }
                }, 500); 
            }
        };

        progressEventSource.onerror = () => {
            progressEventSource?.close();
            progressEventSource = null;
            isUploading = false;
            if (animationInterval) {
                clearInterval(animationInterval);
                animationInterval = null;
            }
        };
    }

    function getMinDateTime(): string {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 1); 
        return now.toISOString().slice(0, 16); 
    }

    function getLink(fileName: string) {
        return configState.server.domain + '/SMS/uploads/' + fileName;
    }

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('Link copied to clipboard');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    }
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-4 pl-28 md:p-0">
    <form 
        enctype="multipart/form-data" 
        method="POST" 
        class="button-mod justify-center items-center flex flex-col w-full max-w-md md:max-w-lg space-y-4" 
        use:enhance={( { formData, cancel } ) => {
            uploadToken = generateUploadToken();

            startProgressTracking(uploadToken);

            cancel();

            const uploadFormData = new FormData();
            uploadFormData.append('uploadToken', uploadToken);
            if (files && files.length > 0) {
                uploadFormData.append('fileSize', files[0].size.toString());
                uploadFormData.append('file', files[0]);
            }

            if (enablePath && uploadPath.trim()) {
                uploadFormData.append('uploadPath', uploadPath.trim());
            }

            if (enableExpiration) {
                if (expirationMode === 'duration') {
                    uploadFormData.append('expiresIn', expirationDuration);
                } else if (expirationDateTime) {
                    uploadFormData.append('expiresAt', new Date(expirationDateTime).toISOString());
                }
            }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `http://${window.location.hostname}:5823/api/upload`);
            
            xhr.onload = () => {
                if (xhr.status !== 200) {
                    console.error('Upload failed:', xhr.responseText);
                    isUploading = false;
                    progressEventSource?.close();
                    progressEventSource = null;
                } else {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.expiresAt) {
                            const expiresDate = new Date(response.expiresAt);
                            console.log(`File will expire at: ${expiresDate.toLocaleString()}`);
                        }
                        
                        if (enableCopy && files && files.length > 0) {
                            const link = getLink(files[0].name);
                            copyToClipboard(link);
                        }
                    } catch (e) {
                        console.log('Upload successful');
                        
                        if (enableCopy && files && files.length > 0) {
                            const link = getLink(files[0].name);
                            copyToClipboard(link);
                        }
                    }
                }
            };
            
            xhr.onerror = () => {
                console.error('Upload error');
                isUploading = false;
                progressEventSource?.close();
                progressEventSource = null;
            };
            
            xhr.send(uploadFormData);
        }}
    >
        <input id="file" type="file" name="file" style="display: none;" bind:files />
        
        <label for="file" class="text-center w-full bg-primary text-on-primary rounded-lg p-8 md:p-20 hover:bg-primary-container hover:text-on-primary-container hover:cursor-pointer">
            Select File
            <br>
            {#if selectedFileName}
                <p class="mt-2 text-center text-sm md:text-lg text-on-primary break-all">Selected: {selectedFileName}</p>
            {/if} 
        </label>

        <div class="w-full bg-surface-variant rounded-lg p-4 space-y-3">
            <div class="flex flex-col items-left space-y-2">
                <div class="items-center flex space-x-2">
                    <input 
                        type="checkbox" 
                        id="enablePath" 
                        bind:checked={enablePath}
                        class="w-4 h-4 text-primary bg-surface border-outline rounded focus:ring-primary"
                    />
                    <label for="enablePath" class="text-sm font-medium text-on-surface">
                        Upload to path
                    </label>
                </div>
                <div class="items-center flex space-x-2">
                    <input 
                        type="checkbox" 
                        id="enableCopy" 
                        bind:checked={enableCopy}
                        class="w-4 h-4 text-primary bg-surface border-outline rounded focus:ring-primary"
                    />
                    <label for="enableCopy" class="text-sm font-medium text-on-surface">
                        Copy link when done
                    </label>
                </div>
                <div class="items-center flex space-x-2">
                    <input 
                        type="checkbox" 
                        id="enableExpiration" 
                        bind:checked={enableExpiration}
                        class="w-4 h-4 text-primary bg-surface border-outline rounded focus:ring-primary"
                    />
                    <label for="enableExpiration" class="text-sm font-medium text-on-surface">
                        Set file expiration
                    </label>
                </div>
            </div>

            {#if enablePath}
                <div>
                    <label for="uploadPath" class="block text-sm font-medium text-on-surface mb-1">
                        Upload to folder:
                    </label>
                    <input 
                        type="text"
                        id="uploadPath"
                        bind:value={uploadPath}
                        placeholder="e.g., images/ or leave empty for root"
                        class="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                    <p class="text-xs text-on-surface-variant mt-1">
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
                                class="w-4 h-4 text-primary bg-surface border-outline"
                            />
                            <span class="text-sm text-on-surface">Duration</span>
                        </label>
                        <label class="flex items-center space-x-2">
                            <input 
                                type="radio" 
                                bind:group={expirationMode} 
                                value="datetime"
                                class="w-4 h-4 text-primary bg-surface border-outline"
                            />
                            <span class="text-sm text-on-surface">Specific Date & Time</span>
                        </label>
                    </div>

                    {#if expirationMode === 'duration'}
                        <div>
                            <label for="duration" class="block text-sm font-medium text-on-surface mb-1">
                                Delete after:
                            </label>
                            <select 
                                id="duration"
                                bind:value={expirationDuration}
                                class="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary"
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
                            <label for="datetime" class="block text-sm font-medium text-on-surface mb-1">
                                Delete at:
                            </label>
                            <input 
                                type="datetime-local"
                                id="datetime"
                                bind:value={expirationDateTime}
                                min={getMinDateTime()}
                                class="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary"
                            />
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        {#if isUploading}
            <div class="mt-4 md:mt-2"></div>
            <WavyLinearProgress thickness={4} percent={uploadProgress} />
            <p class="text-sm text-gray-600 mt-2">{Math.round(uploadProgress)}% uploaded</p>
        {/if}

        <Button square variant="filled" type="submit" disabled={isUploading || !files || files.length === 0}>
            {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
    </form>
</div> 

<style> 
    .button-mod :global(button) {
        margin-top: 20px;
        justify-content: center;
    }
</style>