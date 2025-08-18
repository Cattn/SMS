<script lang="ts">
	import '$lib/polyfills';
	import '../app.css';
	import '../main.css';

	import SideBar from '$lib/components/SideBar.svelte';
	import { initializeConfig } from '$lib/config.svelte';
	import { getCurrentScheme, getIsDark, initializeTheme } from '$lib/theme/store.svelte';
	import { HDRRouter } from '@cattn/hdr';

	let { children, data } = $props();

	initializeTheme();

	if (data?.config) {
		initializeConfig(data.config);
		initializeTheme();
	}

	let currentScheme = $derived(getCurrentScheme());
	let isDark = $derived(getIsDark());

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', isDark);
		}
	});
</script>

<HDRRouter amplification={1.2}/>
<SideBar />
{@render children()}
