<script lang="ts">
	import ColorPicker, { ChromeVariant } from 'svelte-awesome-color-picker';
    import { generateM3Theme } from '$lib/theme/generator';
    import { getSourceColor } from '$lib/theme/store.svelte';

    let { 
        initialHex = getSourceColor(),
        onColorChange = () => {}
    } = $props();

    let hex = $state(initialHex);
    let theme = $derived(generateM3Theme(hex));
    let isUserInteracting = $state(false);
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    function handleColorInput(event: { hsv: any; rgb: any; hex: string | null; color: any }) {
        if (event.hex) {
            hex = event.hex;
            isUserInteracting = true;
            
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            
            debounceTimer = setTimeout(() => {
                isUserInteracting = false;
                onColorChange(hex);
            }, 300);
        }
    }

        $effect(() => {
        if (!isUserInteracting) {
            hex = initialHex;
        }
    });

    $effect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    });
</script>

<div class="bg-surface-variant rounded-2xl p-4">
    <div class="mb-4 flex items-center justify-between">
        <div>
            <h3 class="text-on-surface font-medium">Theme Color</h3>
            <p class="text-on-surface-variant text-sm">Customize the app's Material 3 color scheme</p>
        </div>
        <div class="bg-surface border-outline flex items-center gap-2 rounded-lg border px-3 py-2">
            <div 
                class="h-4 w-4 rounded-full border border-outline"
                style="background-color: {hex};"
            ></div>
            <span class="text-on-surface text-sm font-mono">{hex.toUpperCase().slice(0, 7)}</span>
        </div>
    </div>

    <div class="color-picker-container">
        <ColorPicker
            {hex}
            components={ChromeVariant}
            sliderDirection="horizontal"
            isDialog={false}
            isAlpha={false}
            position="responsive"
            onInput={handleColorInput}
            --picker-height="200px"
            --picker-width="100%"
            --slider-width="20px"
            --picker-indicator-size="8px"
            --picker-z-index="10"
            --input-size="60px"
            --focus-color="rgb(var(--m3-scheme-primary))"
            --cp-bg-color="rgb(var(--m3-scheme-surface))"
            --cp-border-color="rgb(var(--m3-scheme-outline-variant))"
            --cp-text-color="rgb(var(--m3-scheme-on-surface))"
            --cp-input-color="rgb(var(--m3-scheme-surface-variant))"
            --cp-button-hover-color="rgb(var(--m3-scheme-surface-container-high))"
        />
    </div>
</div>

<style>
    :global(.color-picker-container .wrapper) {
        gap: 12px;
    }

    :global(.color-picker-container .picker) {
        border-radius: 12px;
        border: 1px solid rgb(var(--m3-scheme-outline-variant));
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        overflow: hidden;
    }

    :global(.color-picker-container .picker-indicator) {
        width: 8px !important;
        height: 8px !important;
        border: 2px solid white !important;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3) !important;
        border-radius: 50% !important;
    }

    :global(.color-picker-container .slider) {
        border-radius: 10px;
        border: 1px solid rgb(var(--m3-scheme-outline-variant));
        overflow: hidden;
        position: relative;
    }

    :global(.color-picker-container .slider-indicator) {
        width: 6px !important;
        height: 20px !important;
        border: 2px solid white !important;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3) !important;
        border-radius: 3px !important;
    }

    :global(.color-picker-container .alpha) {
        border-radius: 10px;
        border: 1px solid rgb(var(--m3-scheme-outline-variant));
        overflow: hidden;
    }

    :global(.color-picker-container .alpha-indicator) {
        width: 6px !important;
        height: 20px !important;
        border: 2px solid white !important;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3) !important;
        border-radius: 3px !important;
    }

    :global(.color-picker-container .input) {
        border-radius: 8px;
        border: 1px solid rgb(var(--m3-scheme-outline));
        background: rgb(var(--m3-scheme-surface-variant)) !important;
        color: rgb(var(--m3-scheme-on-surface-variant)) !important;
        font-family: 'Roboto Mono', monospace;
        font-size: 14px;
        padding: 8px 12px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    :global(.color-picker-container .input:focus) {
        border-color: rgb(var(--m3-scheme-primary)) !important;
        outline: none;
        box-shadow: 0 0 0 2px rgb(var(--m3-scheme-primary) / 0.2) !important;
    }

    :global(.color-picker-container .text) {
        color: rgb(var(--m3-scheme-on-surface)) !important;
        font-size: 14px;
        font-weight: 500;
    }

    :global(.color-picker-container .button) {
        background: rgb(var(--m3-scheme-surface-variant)) !important;
        color: rgb(var(--m3-scheme-on-surface-variant)) !important;
        border: 1px solid rgb(var(--m3-scheme-outline)) !important;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 12px;
    }

    :global(.color-picker-container .button:hover) {
        background: rgb(var(--m3-scheme-surface-container-high)) !important;
    }

    :global(.dark .color-picker-container .picker) {
        border-color: rgb(var(--m3-scheme-outline-variant));
    }

    :global(.dark .color-picker-container .slider) {
        border-color: rgb(var(--m3-scheme-outline-variant));
    }

    :global(.dark .color-picker-container .alpha) {
        border-color: rgb(var(--m3-scheme-outline-variant));
    }

    :global(.dark .color-picker-container .input) {
        background: rgb(var(--m3-scheme-surface-variant)) !important;
        border-color: rgb(var(--m3-scheme-outline));
        color: rgb(var(--m3-scheme-on-surface-variant)) !important;
    }

    :global(.dark .color-picker-container .button) {
        background: rgb(var(--m3-scheme-surface-variant)) !important;
        color: rgb(var(--m3-scheme-on-surface-variant)) !important;
        border-color: rgb(var(--m3-scheme-outline));
    }

    @media (max-width: 640px) {
        :global(.color-picker-container) {
            --picker-height: 160px;
            --slider-width: 16px;
            --picker-indicator-size: 6px;
            --input-size: 50px;
        }

        :global(.color-picker-container .picker-indicator) {
            width: 6px !important;
            height: 6px !important;
        }

        :global(.color-picker-container .slider-indicator) {
            width: 5px !important;
            height: 16px !important;
        }

        :global(.color-picker-container .alpha-indicator) {
            width: 5px !important;
            height: 16px !important;
        }
    }
</style>