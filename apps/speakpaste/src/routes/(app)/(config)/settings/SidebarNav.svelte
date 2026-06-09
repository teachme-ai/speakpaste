<script lang="ts">
	import { Button } from '@epicenter/ui/button';
	import { cn } from '@epicenter/ui/utils';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import InfoIcon from '@lucide/svelte/icons/info';
	import KeyboardIcon from '@lucide/svelte/icons/keyboard';
	import MicIcon from '@lucide/svelte/icons/mic';
	import Settings2Icon from '@lucide/svelte/icons/settings-2';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import Volume2Icon from '@lucide/svelte/icons/volume-2';
	import { cubicInOut } from 'svelte/easing';
	import { crossfade } from 'svelte/transition';
	import { page } from '$app/state';

	const items = [
		{
			title: 'General',
			href: '/settings',
			icon: SlidersHorizontalIcon,
		},
		{ title: 'Dictation', href: '/settings/recording', icon: MicIcon },
		{ title: 'Models', href: '/settings/transcription', icon: CpuIcon },
		{
			title: 'Keyboard',
			href: '/settings/shortcuts/global',
			icon: KeyboardIcon,
			activePathPrefix: '/settings/shortcuts',
		},
		{ title: 'Sound', href: '/settings/sound', icon: Volume2Icon },
		{ title: 'Captures', href: '/settings/captures', icon: ArchiveIcon },
		{
			title: 'Privacy & System',
			href: '/settings/system',
			icon: ShieldCheckIcon,
			activePathPrefix: '/settings/system',
		},
		{
			title: 'Technology',
			href: '/settings/local-technology',
			icon: Settings2Icon,
		},
		{
			title: 'About & Credits',
			href: '/settings/about',
			icon: InfoIcon,
		},
	] satisfies {
		title: string;
		href: string;
		icon: typeof SlidersHorizontalIcon;
		activePathPrefix?: string;
	}[];

	const [send, receive] = crossfade({
		duration: 250,
		easing: cubicInOut,
	});
</script>

<nav
	class="mac-material flex w-full flex-col gap-1 overflow-visible rounded-xl border border-border p-1"
	aria-label="Settings navigation"
>
	{#each items as item (item.href)}
		{@const isActive = item.activePathPrefix
			? page.url.pathname.startsWith(item.activePathPrefix)
				|| page.url.pathname === item.href
			: page.url.pathname === item.href}
		{@const Icon = item.icon}

		<Button
			href={item.href}
			variant="ghost"
			class={cn(
				'relative w-full justify-start gap-2 rounded-lg text-left text-[15px] font-medium transition-colors',
				isActive
					? 'text-sidebar-accent-foreground hover:bg-transparent'
					: 'text-sidebar-foreground/78 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
			)}
			aria-current={isActive ? 'page' : undefined}
			data-sveltekit-noscroll
		>
			{#if isActive}
				<div
					class="bg-sidebar-accent absolute inset-0 rounded-lg shadow-sm"
					in:send={{ key: 'active-sidebar-tab' }}
					out:receive={{ key: 'active-sidebar-tab' }}
				></div>
			{/if}
			<Icon class="relative z-10 size-4 shrink-0" />
			<span class="relative z-10 truncate"> {item.title} </span>
		</Button>
	{/each}
</nav>
