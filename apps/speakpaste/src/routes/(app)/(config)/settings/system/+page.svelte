<script lang="ts">
	import { Badge } from '@epicenter/ui/badge';
	import { Button } from '@epicenter/ui/button';
	import * as Card from '@epicenter/ui/card';
	import * as Field from '@epicenter/ui/field';
	import { Input } from '@epicenter/ui/input';
	import { Link } from '@epicenter/ui/link';
	import Copy from '@lucide/svelte/icons/copy';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { Ok, tryAsync } from 'wellcrafted/result';
	import { BUILD_INFO } from '$lib/generated/build-info';
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

<svelte:head> <title>System - SpeakPaste</title> </svelte:head>

<div class="space-y-8">
	<Field.Set>
		<Field.Legend>System</Field.Legend>
		<Field.Description>
			Privacy, permissions, diagnostics, technology credits, and build details
			in one place.
		</Field.Description>
		<Field.Separator />

		<div class="grid gap-4 md:grid-cols-2">
			<Card.Root class="border-green-100 dark:border-green-900/20">
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-base">
						<ShieldCheckIcon class="size-4 text-green-600 dark:text-green-400" />
						Local-only promise
					</Card.Title>
					<Card.Description>
						No cloud transcription, no account, and no remote usage reporting.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-wrap gap-2">
						<Badge variant="secondary">Voice stays on this Mac</Badge>
						<Badge variant="secondary">Local model files</Badge>
						<Badge variant="secondary">Device-only diagnostics</Badge>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Permissions</Card.Title>
					<Card.Description>
						SpeakPaste needs macOS Accessibility to paste at the cursor and
						Microphone permission to capture dictation.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm text-muted-foreground">
					<p>
						If macOS keeps a stale Accessibility entry after reinstalling, remove
						the old SpeakPaste entry, launch the app from Applications, and approve
						the fresh entry when prompted.
					</p>
					<p>
						Permission state is shown during setup because macOS owns the final
						approval switch.
					</p>
				</Card.Content>
			</Card.Root>
		</div>
	</Field.Set>

	<Field.Set>
		<Field.Legend>Privacy & Diagnostics</Field.Legend>
		<Field.Description>
			Local performance events help troubleshoot reliability without storing
			transcript text or raw audio in diagnostics.
		</Field.Description>
		<Field.Separator />

		<Field.Group>
			<div class="flex flex-wrap gap-2">
				<Badge variant="secondary">Session count</Badge>
				<Badge variant="secondary">Latency</Badge>
				<Badge variant="secondary">Paste result</Badge>
				<Badge variant="secondary">Engine used</Badge>
				<Badge variant="secondary">Approximate word count</Badge>
			</div>

			<Field.Field>
				<Field.Label for="diagnostics-log-path">
					Local diagnostics log path
				</Field.Label>
				<Input
					id="diagnostics-log-path"
					type="text"
					readonly
					value={diagnosticsLogPath ?? 'Loading diagnostics path...'}
				/>
			</Field.Field>

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
		</Field.Group>
	</Field.Set>

	<Field.Set>
		<Field.Legend>Technology & Credits</Field.Legend>
		<Field.Description>
			Everything SpeakPaste uses should be visible and acknowledged.
		</Field.Description>
		<Field.Separator />

		<div class="grid gap-4 md:grid-cols-2">
			<div class="space-y-3 rounded-lg border bg-muted/20 p-4">
				<h3 class="text-sm font-semibold tracking-tight">In the app today</h3>
				<ul class="space-y-2 text-sm text-muted-foreground leading-relaxed">
					<li>Local speech engines including whisper.cpp, Parakeet, and Moonshine.</li>
					<li>Tauri, Svelte, Rust, CPAL, and Enigo for the Mac app and system integration.</li>
					<li>Local model files and runtime configuration stored on this Mac.</li>
				</ul>
			</div>

			<div class="space-y-3 rounded-lg border bg-muted/20 p-4">
				<h3 class="text-sm font-semibold tracking-tight">Build</h3>
				<p class="text-sm text-muted-foreground">
					Release {BUILD_INFO.gitCommitCount} · Version {BUILD_INFO.marketingVersion}
				</p>
				<div class="flex flex-wrap gap-2">
					<Badge variant="outline">Bundle {BUILD_INFO.bundleVersion}</Badge>
					<Badge variant="outline" class="font-mono">{BUILD_INFO.gitCommit}</Badge>
				</div>
				<p class="text-xs text-muted-foreground">
					Every build is stamped with Git history and commit metadata for
					release accountability.
				</p>
			</div>
		</div>

		<div class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
			<p>
				SpeakPaste is adapted from the open-source Whispering project and keeps
				upstream acknowledgements visible for licensing compliance.
			</p>
			<div class="mt-3 flex flex-wrap gap-3">
				<Link href="/settings/about">Full credits</Link>
				<Link href="/settings/local-technology">Detailed technology notes</Link>
			</div>
		</div>
	</Field.Set>
</div>
