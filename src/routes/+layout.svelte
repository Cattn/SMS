<script lang="ts">
	import '../app.css';
	import '../main.css';

	import SideBar from '$lib/components/SideBar.svelte';
	
	let { children } = $props();
</script>

<SideBar />
{@render children()}
