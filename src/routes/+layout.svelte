<script lang="ts">
	import '$lib/polyfills';
	import '../app.css';
	import '../main.css';

	import SideBar from '$lib/components/SideBar.svelte';
	import { initializeConfig } from '$lib/config.svelte';

	let { children, data } = $props();

	if (data?.config) {
		initializeConfig(data.config);
	}
</script>

<SideBar />
{@render children()}
