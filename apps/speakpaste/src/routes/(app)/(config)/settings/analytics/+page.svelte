<script lang="ts">
	import { Button } from '@epicenter/ui/button';
	import { Badge } from '@epicenter/ui/badge';
	import * as Card from '@epicenter/ui/card';
	import * as SectionHeader from '@epicenter/ui/section-header';
	import { Input } from '@epicenter/ui/input';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import Copy from '@lucide/svelte/icons/copy';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { Ok, tryAsync } from 'wellcrafted/result';
	import { rpc } from '$lib/query';

	const diagnosticsLogPathQuery = createQuery(
		() => rpc.analytics.getLocalAnalyticsLogPath.options,
	);
	const diagnosticsDirectoryPathQuery = createQuery(
		() => rpc.analytics.getLocalAnalyticsDirectoryPath.options,
	);
	const clearDiagnosticsMutation = createMutation(
		() => rpc.analytics.clearLocalAnalyticsLog.options,
	);

	const diagnosticsLogPath = $derived(diagnosticsLogPathQuery.data ?? null);

	async function openDiagnosticsFolder() {
		if (!window.__TAURI_INTERNALS__) return;

		await tryAsync({
			try: async () => {
				const { openPath } = await import('@tauri-apps/plugin-opener');
				const path = diagnosticsDirectoryPathQuery.data;
				if (!path) throw new Error('Diagnostics folder is not available yet.');
				await openPath(path);
			},
			catch: (error) => {
				rpc.notify.error({
					title: 'Failed to open diagnostics folder',
					description: error instanceof Error ? error.message : 'Unknown error',
				});
				return Ok(undefined);
			},
		});
	}

	async function copyDiagnosticsPath() {
		if (!diagnosticsLogPath) return;
		const { error } = await rpc.text.copyToClipboard({ text: diagnosticsLogPath });
		if (error) {
			rpc.notify.error({
				title: 'Failed to copy diagnostics path',
				description: error.message,
				action: { type: 'more-details', error },
			});
			return;
		}
		rpc.notify.success({
			title: 'Copied diagnostics path',
			description: diagnosticsLogPath,
		});
	}

	function clearDiagnosticsLog() {
		clearDiagnosticsMutation.mutate(undefined, {
			onSuccess: async () => {
				await diagnosticsLogPathQuery.refetch();
				await diagnosticsDirectoryPathQuery.refetch();
				rpc.notify.success({
					title: 'Cleared local diagnostics log',
					description: 'New diagnostics entries will be written as you keep testing.',
				});
			},
			onError: (error) => rpc.notify.error(error),
		});
	}
</script>

<div class="space-y-8">
	<SectionHeader.Root>
		<div class="flex items-center gap-3">
			<SectionHeader.Title level={3} class="text-xl tracking-tight">
				Privacy & Support
			</SectionHeader.Title>
			<Badge
				variant="outline"
				class="text-xs text-green-700 dark:text-green-400 border-green-200 dark:border-green-400/30"
			>
				Device only
			</Badge>
		</div>
		<SectionHeader.Description class="max-w-2xl">
			Mynah keeps operational insight on this Mac. Diagnostics are about
			app health and performance, not the private words you dictate.
		</SectionHeader.Description>
	</SectionHeader.Root>

	<Card.Root class="transition-colors duration-200">
		<Card.Content>
			<div class="space-y-3">
				<div class="flex flex-wrap gap-2">
					<Badge variant="secondary">Session count</Badge>
					<Badge variant="secondary">Latency</Badge>
					<Badge variant="secondary">Paste result</Badge>
					<Badge variant="secondary">Engine used</Badge>
				</div>
				<p class="text-sm text-muted-foreground leading-relaxed">
					The app can keep approximate operational metrics like session count,
					recording duration, transcription latency, paste outcome, and the mode
					or engine used. It should not store transcript text, raw audio,
					selected text, or private content in diagnostics.
				</p>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root class="border-green-100 dark:border-green-900/20">
			<Card.Header>
				<Card.Title
					class="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2"
				>
					<div class="w-2 h-2 bg-green-500 rounded-full"></div>
					What we may keep locally
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-green-500"></span>
						<span>Session count and recording duration</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-green-500"></span>
						<span>Transcription latency and model load time</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-green-500"></span>
						<span>Paste result and local engine used</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-green-500"></span>
						<span>Approximate word count</span>
					</li>
				</ul>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-warning dark:border-warning/20">
			<Card.Header>
				<Card.Title
					class="text-sm font-medium text-warning dark:text-warning flex items-center gap-2"
				>
					<div class="w-2 h-2 bg-warning rounded-full"></div>
					What stays private
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-warning"></span>
						<span>Transcript text and raw audio</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-warning"></span>
						<span>Selected text and private app content</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-warning"></span>
						<span>Off-device usage reporting</span>
					</li>
				</ul>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root class="bg-muted/30 border-dashed">
		<Card.Header>
			<Card.Title class="text-base font-medium">Diagnostics</Card.Title>
			<Card.Description>
				Local performance events are written to a device-only log so you can inspect
				reliability and latency without exposing dictated content.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<p class="text-sm text-muted-foreground">Local diagnostics log path</p>
				<Input
					type="text"
					readonly
					value={diagnosticsLogPath ?? 'Loading diagnostics path...'}
				/>
			</div>

			<div class="flex flex-wrap gap-2">
				{#if window.__TAURI_INTERNALS__}
					<Button
						variant="outline"
						onclick={openDiagnosticsFolder}
						disabled={!diagnosticsDirectoryPathQuery.data}
					>
						<ExternalLink class="h-4 w-4" />
						Open diagnostics folder
					</Button>
				{/if}
				<Button
					variant="outline"
					onclick={copyDiagnosticsPath}
					disabled={!diagnosticsLogPath}
				>
					<Copy class="h-4 w-4" />
					Copy log path
				</Button>
				<Button
					variant="outline"
					onclick={clearDiagnosticsLog}
					disabled={clearDiagnosticsMutation.isPending}
				>
					<Trash2 class="h-4 w-4" />
					Clear diagnostics log
				</Button>
			</div>

			<p class="text-sm text-muted-foreground leading-relaxed">
				This log is meant for local troubleshooting and benchmark runs. It tracks
				timing and pipeline health, not transcript text or raw audio.
			</p>
		</Card.Content>
	</Card.Root>

	<Card.Root class="bg-muted/30 border-dashed">
		<Card.Header>
			<Card.Title class="text-base font-medium">Local disclosure</Card.Title>
			<Card.Description>
				If a feature depends on a system permission, Mynah should say so at
				runtime rather than burying the requirement.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
			<a
				href="/settings/local-technology"
				class="group flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
			>
				<span class="text-muted-foreground group-hover:text-primary/60 transition-colors"
					>&gt;</span
				>
				<span
					class="underline underline-offset-4 decoration-transparent group-hover:decoration-current transition-colors"
				>
					Read the local technology disclosure
				</span>
			</a>
			<a
				href="/settings/sound"
				class="group flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
			>
				<span class="text-muted-foreground group-hover:text-primary/60 transition-colors"
					>&gt;</span
				>
				<span
					class="underline underline-offset-4 decoration-transparent group-hover:decoration-current transition-colors"
				>
					Adjust local sound cues
				</span>
			</a>
		</Card.Content>
	</Card.Root>

	<div class="flex items-center gap-2 text-xs">
		<div class="flex items-center gap-2 text-green-700 dark:text-green-400">
			<div class="w-2 h-2 bg-green-500 rounded-full"></div>
			<span class="font-medium">Local diagnostics only</span>
			<span class="text-muted-foreground">Stored on this Mac</span>
		</div>
	</div>
</div>
