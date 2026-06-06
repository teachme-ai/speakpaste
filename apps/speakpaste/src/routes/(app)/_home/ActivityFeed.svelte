<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import CircleIcon from '@lucide/svelte/icons/circle';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import XIcon from '@lucide/svelte/icons/x';
	import { activityFeed, type ActivityTone } from '$lib/state/activity-feed.svelte';

	const latestItems = $derived(activityFeed.items.slice(0, 3));

	function toneClass(tone: ActivityTone) {
		switch (tone) {
			case 'success':
				return 'text-emerald-600 dark:text-emerald-300';
			case 'warning':
				return 'text-amber-600 dark:text-amber-300';
			case 'error':
				return 'text-red-600 dark:text-red-300';
			default:
				return 'text-stone-500 dark:text-stone-300';
		}
	}
</script>

{#if latestItems.length > 0}
	<section
		class="w-full rounded-3xl border border-black/10 bg-white/50 px-4 py-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10"
		aria-label="Activity"
	>
		<div class="flex flex-col gap-2.5">
			{#each latestItems as item, index (item.id)}
				<div class="flex items-start gap-3">
					<div class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
						{#if item.tone === 'success'}
							<CheckIcon class={`size-3.5 ${toneClass(item.tone)}`} />
						{:else if item.tone === 'warning'}
							<TriangleAlertIcon class={`size-3.5 ${toneClass(item.tone)}`} />
						{:else if item.tone === 'error'}
							<XIcon class={`size-3.5 ${toneClass(item.tone)}`} />
						{:else if index === 0}
							<CircleIcon class={`size-2.5 fill-current ${toneClass(item.tone)}`} />
						{:else}
							<InfoIcon class={`size-3.5 ${toneClass(item.tone)}`} />
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold text-stone-900 dark:text-stone-50">
							{item.title}
						</p>
						{#if item.description}
							<p class="line-clamp-2 text-xs text-stone-500 dark:text-stone-300">
								{item.description}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}
