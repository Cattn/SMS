<script lang="ts">
	import '$lib/polyfills';
	import '../app.css';
	import '../main.css';

	import SideBar from '$lib/components/SideBar.svelte';
	import { configState, initializeConfig } from '$lib/config.svelte';
	import { getCurrentScheme, getIsDark, initializeTheme } from '$lib/theme/store.svelte';
	import { HDRRouter, setHdrEnabled, isHdrEnabled } from '@cattn/hdr';

	let { children, data } = $props();
	let initialized = false;

	$effect(() => {
		if (initialized) {
			return;
		}

		initialized = true;

		if (data?.config) {
			initializeConfig(data.config);
		}

		initializeTheme();
	});

	let currentScheme = $derived(getCurrentScheme());
	let isDark = $derived(getIsDark());

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', isDark);
		}
	});

	$effect(() => {
		const enabled = configState.theme.hdrEnabled;
		if (isHdrEnabled() !== enabled) {
			setHdrEnabled(enabled);
		}
	});
</script>

<HDRRouter amplification={1.6}/>
<SideBar />
{@render children()}
