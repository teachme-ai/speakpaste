<script lang="ts">
	import { Button } from '@epicenter/ui/button';
	import { cn } from '@epicenter/ui/utils';
	import { viewTransition } from '$lib/utils/viewTransitions';

	let { children } = $props();
</script>

<header
	class={cn(
		'mac-toolbar z-30 border-b shadow-xs',
		'flex h-14 w-full items-center justify-between px-4 sm:px-8',
	)}
	style="view-transition-name: {viewTransition.global.header}"
	data-tauri-drag-region
>
	<Button tooltip="Go home" href="/" variant="ghost" class="-ml-4">
		<span class="text-[17px] font-semibold">Mynah</span>
	</Button>
</header>

<div class="flex-1 overflow-x-auto">{@render children()}</div>
