<script lang="ts">
	import { enhance } from '$app/forms';
    import { Button, WavyLinearProgress } from "m3-svelte";

    let files = $state<FileList | undefined>();
    let uploadProgress = $state(0);
    let targetProgress = $state(0);
    let isUploading = $state(false);
    let uploadToken = $state('');
    let progressEventSource: EventSource | null = null;
    let animationInterval: ReturnType<typeof setInterval> | null = null;

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
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-4 pl-28 md:p-0">
    <form 
        enctype="multipart/form-data" 
        method="POST" 
        class="button-mod justify-center items-center flex flex-col w-full max-w-md md:max-w-lg" 
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

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `http://${window.location.hostname}:5823/api/upload`);
            
            xhr.onload = () => {
                if (xhr.status !== 200) {
                    console.error('Upload failed:', xhr.responseText);
                    isUploading = false;
                    progressEventSource?.close();
                    progressEventSource = null;
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

        {#if isUploading}
            <div class="mt-4 md:mt-2"></div>
            <WavyLinearProgress thickness={4} percent={uploadProgress} />
            <p class="text-sm text-gray-600 mt-2">{Math.round(uploadProgress)}% uploaded</p>
        {/if}

        <Button square variant="filled" type="submit" disabled={isUploading}>
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