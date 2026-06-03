<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/settings/shortcuts/global', { replaceState: true });
	});
</script>

<svelte:head> <title>Shortcuts - SpeakPaste</title> </svelte:head>
