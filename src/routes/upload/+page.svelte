<script lang="ts">
	import { enhance } from '$app/forms';
    import { Button } from "m3-svelte";

    let files: FileList;
    $: selectedFileName = files && files.length > 0 ? files[0].name : null;
</script>

<div class="flex flex-col items-center justify-center h-screen">
    <form enctype="multipart/form-data" method="POST" class="button-mod justify-center items-center flex flex-col" use:enhance>
        <input id="file" type="file" name="file" style="display: none;" bind:files />
        <label for="file" class="text-center w-full bg-primary text-on-primary rounded-lg p-20 hover:bg-primary-container hover:text-on-primary-container hover:cursor-pointer">Select File
            <br>
            {#if selectedFileName}
                <p class="mt-2 text-center text-lg text-on-primary">Selected: {selectedFileName}</p>
            {/if} 
        </label>
        <Button square variant="filled" type="submit">Upload</Button>
    </form>
</div> 

<style> 
    .button-mod :global(button) {
        margin-top: 20px;
        justify-content: center;
    }
</style>