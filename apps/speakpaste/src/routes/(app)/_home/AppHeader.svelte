<script lang="ts">
	import SettingsPopover from './SettingsPopover.svelte';
	import ListIcon from '@lucide/svelte/icons/list';
</script>

<div class="relative w-full flex items-start justify-center px-5 pt-8 pb-4">
	
	<div class="absolute top-6 left-6">
		<a
			href="/recordings"
			class="size-9 rounded-full bg-card shadow-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
			aria-label="All Recordings"
		>
			<ListIcon class="size-4" />
		</a>
	</div>

	<div class="flex flex-col items-center justify-center text-center">
		<h1 class="text-2xl font-bold tracking-tight text-foreground">SpeakPaste</h1>
		<p class="text-sm text-muted-foreground mt-0.5">Local voice typing for Mac.</p>
	</div>

	<div class="absolute top-6 right-6">
		<SettingsPopover />
	</div>
</div>
