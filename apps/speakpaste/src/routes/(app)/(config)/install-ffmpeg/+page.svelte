<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/settings/recording', { replaceState: true });
	});
</script>

<svelte:head> <title>Capture Settings - Mynah</title> </svelte:head>
