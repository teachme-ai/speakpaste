<script lang="ts">
	import { Button } from '@epicenter/ui/button';
	import { toastOnError } from '@epicenter/ui/sonner';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import MicIcon from '@lucide/svelte/icons/mic';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import { goto } from '$app/navigation';
	import LocalModelDownloadCard from '$lib/components/settings/LocalModelDownloadCard.svelte';
	import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';
	import { desktopServices } from '$lib/services/desktop';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { onDestroy, onMount } from 'svelte';

	type SetupStatus = 'checking' | 'ready' | 'needed';

let accessibilityStatus = $state<SetupStatus>('checking');
let microphoneStatus = $state<SetupStatus>('checking');
let isRequestingMicrophone = $state(false);
let pollTimer: number | undefined;

	const modelPath = $derived(deviceConfig.get('transcription.whispercpp.modelPath'));
	const activeModel = $derived(
		WHISPER_MODELS.find((model) => modelPath.endsWith(model.file.filename)) ?? null,
	);
	const modelReady = $derived(Boolean(activeModel));
	const allReady = $derived(
		accessibilityStatus === 'ready' && microphoneStatus === 'ready' && modelReady,
	);

	async function openMacPrivacyPane(pane: 'Privacy_Accessibility' | 'Privacy_Microphone') {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('open_mac_privacy_pane', { pane });
	}

	async function checkAccessibility() {
		if (!window.__TAURI_INTERNALS__) {
			accessibilityStatus = 'ready';
			return;
		}

		const { data, error } = await desktopServices.permissions.accessibility.check();
		if (error) {
			console.error('[Setup] Failed to check Accessibility permission:', error);
			accessibilityStatus = 'needed';
			return;
		}
		accessibilityStatus = data ? 'ready' : 'needed';
	}

	async function checkMicrophone() {
		if (!window.__TAURI_INTERNALS__) {
			microphoneStatus = 'ready';
			return;
		}

		const { data, error } = await desktopServices.permissions.microphone.check();
		if (error) {
			console.error('[Setup] Failed to check Microphone permission:', error);
			microphoneStatus = 'needed';
			return;
		}
		microphoneStatus = data ? 'ready' : 'needed';
	}

	async function refreshPermissions() {
		await Promise.all([checkAccessibility(), checkMicrophone()]);
	}

	async function requestMicrophone() {
		isRequestingMicrophone = true;
		try {
			const { error } = await desktopServices.permissions.microphone.request();
			if (error) return toastOnError(error, 'Failed to request microphone permission');
			await checkMicrophone();
			if (microphoneStatus !== 'ready') {
				await openMacPrivacyPane('Privacy_Microphone');
			}
		} finally {
			isRequestingMicrophone = false;
		}
	}

	async function finishSetup() {
		if (!allReady) return;
		localStorage.setItem('mynah.setup.completedAt', new Date().toISOString());
		await goto('/');
	}

	onMount(() => {
		settings.set('transcription.service', 'whispercpp');

		if (window.__TAURI_INTERNALS__) {
			import('@tauri-apps/api/window').then(async ({ getCurrentWindow, LogicalSize }) => {
				const currentWindow = getCurrentWindow();
				await currentWindow.setMinSize(new LogicalSize(720, 660));
				await currentWindow.setSize(new LogicalSize(760, 760));
			}).catch((error) => {
				console.error('[Setup] Failed to resize setup window:', error);
			});
		}

		refreshPermissions();
		pollTimer = window.setInterval(refreshPermissions, 1500);
	});

	onDestroy(() => {
		if (pollTimer) window.clearInterval(pollTimer);
	});
</script>

<svelte:head><title>Set Up Mynah</title></svelte:head>

<main class="setup-surface mac-window-surface flex min-h-screen w-full flex-col overflow-y-auto">
	<section class="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 pb-6 pt-5">
		<div class="mac-material rounded-2xl border p-5">
			<div class="flex items-start gap-4">
				<div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
					<SparklesIcon class="size-6" />
				</div>
				<div class="min-w-0">
					<p class="text-[15px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
						First launch
					</p>
					<h1 class="mt-1 text-3xl font-semibold tracking-tight">
						Set up Mynah in 2 minutes.
					</h1>
					<p class="mt-2 text-[17px] leading-7 text-muted-foreground">
						Before your first Fn dictation, Mynah needs three things: Accessibility,
						Microphone, and one local Whisper model. Your voice stays on this Mac.
					</p>
				</div>
			</div>
		</div>

		<div class="grid gap-4">
			<section class="mac-settings-section">
				<div class="mac-settings-section-header flex items-center justify-between gap-3">
					<div>
						<h2 class="text-xl font-semibold tracking-tight">Setup checklist</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							Mynah keeps checking while you move through macOS prompts.
						</p>
					</div>
					{#if allReady}
						<span class="rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">
							Ready
						</span>
					{/if}
				</div>

				<div class="mac-settings-row">
					<div class="flex min-w-0 items-start gap-3">
						<div class="setup-step-icon">
							<ShieldCheckIcon class="size-5" />
						</div>
						<div>
							<p class="font-semibold">Accessibility</p>
							<p class="mt-1 text-sm leading-6 text-muted-foreground">
								Mynah uses Accessibility so Fn dictation works anywhere you type.
								The app will try to add and enable itself automatically.
							</p>
						</div>
					</div>
					<div class="flex justify-end">
						{#if accessibilityStatus === 'ready'}
							{@render StatusReady('Ready')}
						{:else if accessibilityStatus === 'checking'}
							{@render StatusPending('Checking')}
						{:else}
							<Button variant="outline" size="sm" onclick={() => openMacPrivacyPane('Privacy_Accessibility')}>
								<SettingsIcon class="size-4" />
								Open Settings
							</Button>
						{/if}
					</div>
				</div>

				<div class="mac-settings-row">
					<div class="flex min-w-0 items-start gap-3">
						<div class="setup-step-icon">
							<MicIcon class="size-5" />
						</div>
						<div>
							<p class="font-semibold">Microphone</p>
							<p class="mt-1 text-sm leading-6 text-muted-foreground">
								macOS asks once so Mynah can record your voice for local transcription.
							</p>
						</div>
					</div>
					<div class="flex justify-end">
						{#if microphoneStatus === 'ready'}
							{@render StatusReady('Ready')}
						{:else if microphoneStatus === 'checking'}
							{@render StatusPending('Checking')}
						{:else}
							<Button variant="outline" size="sm" onclick={requestMicrophone} disabled={isRequestingMicrophone}>
								<MicIcon class="size-4" />
								Allow Microphone
							</Button>
						{/if}
					</div>
				</div>

				<div class="mac-settings-row">
					<div class="flex min-w-0 items-start gap-3">
						<div class="setup-step-icon">
							<SparklesIcon class="size-5" />
						</div>
						<div>
							<p class="font-semibold">Local Whisper model</p>
							<p class="mt-1 text-sm leading-6 text-muted-foreground">
								Choose one model before first use. Balanced is recommended for most Macs.
							</p>
						</div>
					</div>
					<div class="flex justify-end">
						{#if modelReady}
							{@render StatusReady(activeModel?.name ?? 'Ready')}
						{:else}
							{@render StatusPending('Required')}
						{/if}
					</div>
				</div>
			</section>

			<section class="mac-settings-section">
				<div class="mac-settings-section-header">
					<h2 class="text-xl font-semibold tracking-tight">Choose your first model</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Download one local model. You can change it later in Settings > Models.
					</p>
				</div>
				<div class="space-y-3 p-4">
					{#each WHISPER_MODELS as model}
						<LocalModelDownloadCard {model} />
					{/each}
				</div>
			</section>

			<div class="mac-material flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p class="font-semibold">
						{#if allReady}
							Mynah is ready.
						{:else}
							Finish these steps before first dictation.
						{/if}
					</p>
					<p class="mt-1 text-sm text-muted-foreground">
						Hold Fn, speak one sentence, then release to paste at your cursor.
					</p>
				</div>
				<Button onclick={finishSetup} disabled={!allReady} class="shrink-0">
					Start Using Mynah
					<ArrowRightIcon class="size-4" />
				</Button>
			</div>
		</div>
	</section>
</main>

{#snippet StatusReady(label: string)}
	<span class="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-sm font-semibold text-success">
		<CheckIcon class="size-4" />
		{label}
	</span>
{/snippet}

{#snippet StatusPending(label: string)}
	<span class="inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-muted-foreground">
		{label}
	</span>
{/snippet}

<style>
	.setup-surface {
		background-color: var(--background);
	}

	.setup-step-icon {
		display: flex;
		width: 2.25rem;
		height: 2.25rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 0.75rem;
		background: var(--accent);
		color: var(--accent-foreground);
	}
</style>
