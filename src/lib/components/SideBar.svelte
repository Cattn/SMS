<script lang="ts">
    import { Button } from "m3-svelte";
    import "iconify-icon";
    import { goto } from "$app/navigation";
</script>

<div class="flex justify-center items-center">
    <div class="fixed left-5 flex flex-col top-5 bg-primary-container h-[95%] rounded-4xl p-2 items-center justify-between">
        <div class="flex flex-col items-center gap-2 justify-center mt-3 mb-3">
            <Button class="hidden" variant="filled" iconType="full" onclick={() => {goto("/")}}>
                <svg width="20" height="20" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                    <g clip-path="url(#clip0_845_2368)">
                    <path d="M45.0613 10.244C44.5229 9.8236 43.8223 9.6761 43.1659 9.83835L19.5659 15.7383C18.5776 15.9817 17.8918 16.8667 17.8918 17.8845V36.9415C14.16 35.3116 9.81613 37.0152 8.18626 40.7543C6.55639 44.4861 8.26001 48.83 11.9991 50.4599C15.7309 52.0897 20.0748 50.3861 21.7046 46.647C22.1103 45.7177 22.3168 44.7147 22.3168 43.697V19.6102L41.4918 14.8165V31.0415C37.76 29.4116 33.4161 31.1152 31.7863 34.8543C30.1564 38.5861 31.86 42.93 35.5991 44.5598C39.3309 46.1897 43.6748 44.4861 45.3046 40.747C45.7103 39.8177 45.9168 38.8147 45.9168 37.797V11.9845C45.9168 11.306 45.5996 10.657 45.0686 10.244H45.0613ZM14.9344 46.647C13.3045 46.647 11.9844 45.3268 11.9844 43.697C11.9844 42.0671 13.3045 40.747 14.9344 40.747C16.5643 40.747 17.8844 42.0671 17.8844 43.697C17.8844 45.3268 16.5643 46.647 14.9344 46.647ZM38.5344 40.747C36.9045 40.747 35.5844 39.4268 35.5844 37.797C35.5844 36.1671 36.9045 34.847 38.5344 34.847C40.1643 34.847 41.4844 36.1671 41.4844 37.797C41.4844 39.4268 40.1643 40.747 38.5344 40.747Z" fill="currentColor"/>
                    </g>
                    <defs>
                    <clipPath id="clip0_845_2368">
                    <rect width="59" height="59" fill="white"/>
                    </clipPath>
                    </defs>
                </svg>
            </Button>

            <Button variant="filled" iconType="full" onclick={() => {goto("/")}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...$$props}>
                    <path fill="currentColor" d="M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1" />
                </svg>
            </Button>

            <div class="flex flex-col justify-center items-center gap-2 button-mod mt-5">
                <div class="flex flex-col justify-center items-center">
                    <Button variant="tonal" iconType="full" onclick={() => {goto("/upload")}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...$$props}>
                            <path fill="currentColor" d="M6 20q-.825 0-1.412-.587T4 18v-2q0-.425.288-.712T5 15t.713.288T6 16v2h12v-2q0-.425.288-.712T19 15t.713.288T20 16v2q0 .825-.587 1.413T18 20zm5-12.15L9.125 9.725q-.3.3-.712.288T7.7 9.7q-.275-.3-.288-.7t.288-.7l3.6-3.6q.15-.15.325-.212T12 4.425t.375.063t.325.212l3.6 3.6q.3.3.288.7t-.288.7q-.3.3-.712.313t-.713-.288L13 7.85V15q0 .425-.288.713T12 16t-.712-.288T11 15z" />
                        </svg>                </Button>
                    <h1 class="text-on-secondary roboto-flex-home-link">Upload</h1>
                </div>
                <div class="flex flex-col justify-center items-center">
                    <Button variant="tonal" iconType="full" onclick={() => {goto("/library")}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...$$props}>
                            <path fill="currentColor" d="M9 14h10l-3.45-4.5l-2.3 3l-1.55-2zm-1 4q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm0-2h12V4H8zm-4 6q-.825 0-1.412-.587T2 20V6h2v14h14v2zM8 4h12v12H8z" />
                        </svg>                </Button>
                    <h1 class="text-on-secondary roboto-flex-home-link">Library</h1>
                </div>
                <div class="flex flex-col justify-center items-center">
                    <Button variant="tonal" iconType="full" onclick={() => {goto("/browse")}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...$$props}>
                            <path fill="currentColor" d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm7 7V3.5L18.5 9z" />
                        </svg>                </Button>
                    <h1 class="text-on-secondary roboto-flex-home-link">Browse</h1>
                </div>
                <div class="flex flex-col justify-center items-center">
                    <Button variant="tonal" iconType="full" onclick={() => {goto("/settings")}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...$$props}>
                            <path fill="currentColor" d="M10.825 22q-.675 0-1.162-.45t-.588-1.1L8.85 18.8q-.325-.125-.612-.3t-.563-.375l-1.55.65q-.625.275-1.25.05t-.975-.8l-1.175-2.05q-.35-.575-.2-1.225t.675-1.075l1.325-1Q4.5 12.5 4.5 12.337v-.675q0-.162.025-.337l-1.325-1Q2.675 9.9 2.525 9.25t.2-1.225L3.9 5.975q.35-.575.975-.8t1.25.05l1.55.65q.275-.2.575-.375t.6-.3l.225-1.65q.1-.65.588-1.1T10.825 2h2.35q.675 0 1.163.45t.587 1.1l.225 1.65q.325.125.613.3t.562.375l1.55-.65q.625-.275 1.25-.05t.975.8l1.175 2.05q.35.575.2 1.225t-.675 1.075l-1.325 1q.025.175.025.338v.674q0 .163-.05.338l1.325 1q.525.425.675 1.075t-.2 1.225l-1.2 2.05q-.35.575-.975.8t-1.25-.05l-1.5-.65q-.275.2-.575.375t-.6.3l-.225 1.65q-.1.65-.587 1.1t-1.163.45zm1.225-6.5q1.45 0 2.475-1.025T15.55 12t-1.025-2.475T12.05 8.5q-1.475 0-2.488 1.025T8.55 12t1.013 2.475T12.05 15.5" />
                        </svg>                </Button>
                    <h1 class="text-on-secondary roboto-flex-home-link">Settings</h1>
                </div> 
        </div>
        </div>
        <div>

        </div>
        <div class="flex justify-center mb-3">
            <Button onclick={() => {goto("/upload")}} variant="filled" iconType="full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...$$props}>
                    <path fill="currentColor" d="M6 20q-.825 0-1.412-.587T4 18v-2q0-.425.288-.712T5 15t.713.288T6 16v2h12v-2q0-.425.288-.712T19 15t.713.288T20 16v2q0 .825-.587 1.413T18 20zm5-12.15L9.125 9.725q-.3.3-.712.288T7.7 9.7q-.275-.3-.288-.7t.288-.7l3.6-3.6q.15-.15.325-.212T12 4.425t.375.063t.325.212l3.6 3.6q.3.3.288.7t-.288.7q-.3.3-.712.313t-.713-.288L13 7.85V15q0 .425-.288.713T12 16t-.712-.288T11 15z" />
                </svg>            </Button>
        </div>
    </div> 
</div>

<style>
    .button-mod :global(button) {
        padding-left: 30px;
        padding-right: 30px;
    }

    .button-mod :global(svg) {
        scale: 0.8;
    }

    .button-mod h1 {
        font-size: 10px;
        font-weight: 500;
        color: var(--color-secondary);
    }
</style>