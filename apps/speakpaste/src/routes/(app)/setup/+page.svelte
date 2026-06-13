<script lang="ts">
	import { Button } from '@epicenter/ui/button';
	import { toastOnError } from '@epicenter/ui/sonner';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import MicIcon from '@lucide/svelte/icons/mic';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import { exists, stat } from '@tauri-apps/plugin-fs';
	import { extractErrorMessage } from 'wellcrafted/error';
	import { goto } from '$app/navigation';
	import LocalModelDownloadCard from '$lib/components/settings/LocalModelDownloadCard.svelte';
	import { logDiagnostic } from '$lib/diagnostics/runtime-diagnostics';
	import { BUILD_INFO } from '$lib/generated/build-info';
	import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';
	import { isModelFileSizeValid } from '$lib/services/transcription/local/types';
	import { desktopServices } from '$lib/services/desktop';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { onDestroy, onMount } from 'svelte';

	type SetupStatus = 'checking' | 'ready' | 'needed';

	type AccessibilityRepairResult = {
		trusted: boolean;
		prompted: boolean;
		didReset: boolean;
		installChanged: boolean;
		needsUserApproval: boolean;
		relaunchRequired: boolean;
		recoveryState: string;
		bundlePath: string | null;
		buildSignature: string;
	};

	type FnKeyListenerReadiness = {
		accessibilityTrusted: boolean;
		listenerInitializing: boolean;
		listenerRunning: boolean;
		listenerReady: boolean;
		initialized: boolean;
		message: string | null;
	};

	let accessibilityStatus = $state<SetupStatus>('checking');
	let microphoneStatus = $state<SetupStatus>('checking');
	let isOpeningAccessibilitySettings = $state(false);
	let accessibilitySettingsMessage = $state('');
	let accessibilityRelaunchRequired = $state(false);
	let isRequestingMicrophone = $state(false);
	let isRelaunching = $state(false);
	let isRunningPreflight = $state(false);
	let preflightMessage = $state('');
	let lastModelDiagnosticKey = '';
	let pollTimer: number | undefined;
	const isIntelBuild = String(BUILD_INFO.targetArch) === 'x86_64';

	const modelPath = $derived(deviceConfig.get('transcription.whispercpp.modelPath'));
	const activeModel = $derived(
		WHISPER_MODELS.find((model) => modelPath.endsWith(model.file.filename)) ?? null,
	);
	const modelReady = $derived(Boolean(activeModel));
	const allReady = $derived(
		accessibilityStatus === 'ready' &&
			!accessibilityRelaunchRequired &&
			microphoneStatus === 'ready' &&
			modelReady,
	);

	function errorMessage(error: unknown) {
		return extractErrorMessage(error);
	}

	function updateAccessibilityStatus(nextStatus: SetupStatus, details?: Record<string, unknown>) {
		if (accessibilityStatus !== nextStatus) {
			logDiagnostic('permissions', 'setup_accessibility_status_changed', {
				previousStatus: accessibilityStatus,
				nextStatus,
				...details,
			});
		}
		accessibilityStatus = nextStatus;
	}

	function updateMicrophoneStatus(nextStatus: SetupStatus, details?: Record<string, unknown>) {
		if (microphoneStatus !== nextStatus) {
			logDiagnostic('permissions', 'setup_microphone_status_changed', {
				previousStatus: microphoneStatus,
				nextStatus,
				...details,
			});
		}
		microphoneStatus = nextStatus;
	}

	async function openMacPrivacyPane(pane: 'Privacy_Accessibility' | 'Privacy_Microphone') {
		const { invoke } = await import('@tauri-apps/api/core');
		logDiagnostic('permissions', 'open_privacy_pane_requested', { pane, source: 'setup' });
		await invoke('open_mac_privacy_pane', { pane });
		logDiagnostic('permissions', 'open_privacy_pane_completed', { pane, source: 'setup' });
	}

	async function restartMynah() {
		isRelaunching = true;
		logDiagnostic('permissions', 'setup_accessibility_relaunch_requested');
		try {
			const { relaunch } = await import('@tauri-apps/plugin-process');
			await relaunch();
		} finally {
			isRelaunching = false;
		}
	}

	async function prepareAccessibilityForSetup(prompt = false) {
		if (!window.__TAURI_INTERNALS__) return;

		const { invoke } = await import('@tauri-apps/api/core');
		logDiagnostic('permissions', 'setup_accessibility_prepare_started', { prompt });
		const isTranslocated = await invoke<boolean>('check_app_translocation');
		logDiagnostic('permissions', 'setup_translocation_check_completed', {
			isTranslocated,
			prompt,
		});
		if (isTranslocated) {
			await goto('/macos-translocation-warning');
			return;
		}

		const repairResult = await invoke<AccessibilityRepairResult>(
			'repair_accessibility_permissions_if_needed',
			{ prompt },
		);
		logDiagnostic('permissions', 'setup_accessibility_repair_completed', {
			prompt,
			repairResult,
		});
		if (repairResult.trusted) {
			accessibilityRelaunchRequired = false;
			updateAccessibilityStatus('ready', {
				source: 'repair',
				prompt,
				buildSignature: repairResult.buildSignature,
			});
			accessibilitySettingsMessage = '';
			return;
		}

		if (repairResult.relaunchRequired) {
			accessibilityRelaunchRequired = true;
			updateAccessibilityStatus('needed', {
				source: 'repair',
				prompt,
				recoveryState: repairResult.recoveryState,
				didReset: repairResult.didReset,
				relaunchRequired: repairResult.relaunchRequired,
			});
			accessibilitySettingsMessage =
				'Mynah was updated or reinstalled while it was running. macOS ties Accessibility permission to the exact app on disk, so restart Mynah before enabling the Fn key.';
			return;
		}

		accessibilityRelaunchRequired = false;
		updateAccessibilityStatus('needed', {
			source: 'repair',
			prompt,
			recoveryState: repairResult.recoveryState,
			didReset: repairResult.didReset,
			needsUserApproval: repairResult.needsUserApproval,
		});
		accessibilitySettingsMessage = repairResult.didReset
			? 'Mynah refreshed its macOS Accessibility entry. Enable Mynah in System Settings to continue.'
			: 'Enable Mynah in System Settings > Privacy & Security > Accessibility to continue.';
	}

	async function checkAccessibility() {
		if (accessibilityRelaunchRequired) {
			updateAccessibilityStatus('needed', { source: 'relaunch-required' });
			return;
		}

		if (!window.__TAURI_INTERNALS__) {
			updateAccessibilityStatus('ready', { source: 'web-fallback' });
			return;
		}

		const { data, error } = await desktopServices.permissions.accessibility.check();
		if (error) {
			console.error('[Setup] Failed to check Accessibility permission:', error);
			logDiagnostic(
				'permissions',
				'setup_accessibility_check_failed',
				{ error: errorMessage(error) },
				'error',
			);
			updateAccessibilityStatus('needed', { source: 'check-error' });
			return;
		}
		updateAccessibilityStatus(data ? 'ready' : 'needed', { source: 'poll' });
	}

	async function checkMicrophone() {
		if (!window.__TAURI_INTERNALS__) {
			updateMicrophoneStatus('ready', { source: 'web-fallback' });
			return;
		}

		const { data, error } = await desktopServices.permissions.microphone.check();
		if (error) {
			console.error('[Setup] Failed to check Microphone permission:', error);
			logDiagnostic(
				'permissions',
				'setup_microphone_check_failed',
				{ error: errorMessage(error) },
				'error',
			);
			updateMicrophoneStatus('needed', { source: 'check-error' });
			return;
		}
		updateMicrophoneStatus(data ? 'ready' : 'needed', { source: 'poll' });
	}

	async function refreshPermissions() {
		await Promise.all([checkAccessibility(), checkMicrophone()]);
	}

	async function requestMicrophone() {
		isRequestingMicrophone = true;
		logDiagnostic('permissions', 'setup_microphone_request_started');
		try {
			const { error } = await desktopServices.permissions.microphone.request();
			if (error) {
				logDiagnostic(
					'permissions',
					'setup_microphone_request_failed',
					{ error: errorMessage(error) },
					'error',
				);
				return toastOnError(error, 'Failed to request microphone permission');
			}
			await checkMicrophone();
			logDiagnostic('permissions', 'setup_microphone_request_completed', {
				microphoneStatus,
			});
			if (microphoneStatus !== 'ready') {
				await openMacPrivacyPane('Privacy_Microphone');
			}
		} finally {
			isRequestingMicrophone = false;
		}
	}

	async function openAccessibilitySettings() {
		isOpeningAccessibilitySettings = true;
		accessibilitySettingsMessage = '';
		logDiagnostic('permissions', 'setup_accessibility_open_settings_started');
		try {
			await prepareAccessibilityForSetup(true);
			if (accessibilityRelaunchRequired) return;
			await openMacPrivacyPane('Privacy_Accessibility');
			accessibilitySettingsMessage =
				'In System Settings, open Privacy & Security > Accessibility and enable Mynah.';
			window.setTimeout(checkAccessibility, 1000);
		} catch (error) {
			console.error('[Setup] Failed to open Accessibility settings:', error);
			logDiagnostic(
				'permissions',
				'setup_accessibility_open_settings_failed',
				{ error: errorMessage(error) },
				'error',
			);
			accessibilitySettingsMessage =
				'Open System Settings > Privacy & Security > Accessibility, then enable Mynah.';
		} finally {
			isOpeningAccessibilitySettings = false;
		}
	}

	async function validateWhisperModel() {
		if (!modelReady || !activeModel) {
			return {
				ok: false,
				reason: 'No Whisper model is selected.',
			};
		}

		if (!window.__TAURI_INTERNALS__) {
			return { ok: true, reason: null };
		}

		if (!(await exists(modelPath))) {
			return {
				ok: false,
				reason: 'The selected Whisper model file does not exist.',
			};
		}

		const modelStats = await stat(modelPath);
		if (!isModelFileSizeValid(modelStats.size, activeModel.sizeBytes)) {
			return {
				ok: false,
				reason: 'The selected Whisper model file looks incomplete.',
				size: modelStats.size,
				expectedSize: activeModel.sizeBytes,
			};
		}

		return {
			ok: true,
			reason: null,
			size: modelStats.size,
			expectedSize: activeModel.sizeBytes,
		};
	}

	async function getFnKeyReadiness() {
		if (!window.__TAURI_INTERNALS__) {
			return {
				accessibilityTrusted: true,
				listenerInitializing: false,
				listenerRunning: true,
				listenerReady: true,
				initialized: false,
				message: null,
			} satisfies FnKeyListenerReadiness;
		}

		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<FnKeyListenerReadiness>('get_fn_key_listener_readiness');
	}

	async function runSetupPreflight() {
		isRunningPreflight = true;
		preflightMessage = 'Checking readiness before first dictation...';
		logDiagnostic('setup', 'preflight_started', {
			accessibilityStatus,
			microphoneStatus,
			modelReady,
			modelPath,
			activeModelId: activeModel?.id ?? null,
		});

		try {
			await refreshPermissions();
			const [modelValidation, fnReadiness] = await Promise.all([
				validateWhisperModel(),
				getFnKeyReadiness(),
			]);
			const passed =
				accessibilityStatus === 'ready' &&
				microphoneStatus === 'ready' &&
				modelValidation.ok &&
				fnReadiness.listenerReady;

			logDiagnostic(
				'setup',
				'preflight_completed',
				{
					passed,
					accessibilityStatus,
					microphoneStatus,
					modelValidation,
					fnReadiness,
				},
				passed ? 'info' : 'warn',
			);

			if (accessibilityStatus !== 'ready') {
				preflightMessage = 'Enable Accessibility in System Settings before starting.';
				return false;
			}
			if (microphoneStatus !== 'ready') {
				preflightMessage = 'Allow Microphone access before starting.';
				return false;
			}
			if (!modelValidation.ok) {
				preflightMessage = `${modelValidation.reason} Download or select a model before starting.`;
				return false;
			}
			if (!fnReadiness.listenerReady) {
				preflightMessage =
					fnReadiness.message ??
					'Mynah is not receiving the Fn key yet. Reopen Accessibility and make sure Mynah is enabled.';
				return false;
			}

			preflightMessage = '';
			return true;
		} catch (error) {
			logDiagnostic(
				'setup',
				'preflight_failed',
				{ error: errorMessage(error) },
				'error',
			);
			preflightMessage = 'Mynah could not complete its readiness check. Quit and reopen the app.';
			return false;
		} finally {
			isRunningPreflight = false;
		}
	}

	async function finishSetup() {
		if (!allReady) {
			logDiagnostic('setup', 'finish_blocked_by_checklist', {
				accessibilityStatus,
				microphoneStatus,
				modelReady,
				modelPath,
				activeModelId: activeModel?.id ?? null,
			});
			return;
		}
		const preflightPassed = await runSetupPreflight();
		if (!preflightPassed) return;
		localStorage.setItem('mynah.setup.completedAt', new Date().toISOString());
		logDiagnostic('setup', 'finish_completed', {
			modelPath,
			activeModelId: activeModel?.id ?? null,
		});
		await goto('/');
	}

	onMount(() => {
		logDiagnostic('setup', 'setup_page_mounted', {
			initialService: settings.get('transcription.service'),
			initialModelPath: deviceConfig.get('transcription.whispercpp.modelPath'),
			setupCompletedAt: localStorage.getItem('mynah.setup.completedAt'),
		});
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

		void prepareAccessibilityForSetup().catch((error) => {
			console.error('[Setup] Failed to prepare Accessibility permission:', error);
			logDiagnostic(
				'permissions',
				'setup_initial_accessibility_prepare_failed',
				{ error: errorMessage(error) },
				'error',
			);
			updateAccessibilityStatus('needed', { source: 'initial-prepare-error' });
			accessibilitySettingsMessage =
				'Open System Settings > Privacy & Security > Accessibility, then enable Mynah.';
		});
		refreshPermissions();
		pollTimer = window.setInterval(refreshPermissions, 1500);
	});

	onDestroy(() => {
		if (pollTimer) window.clearInterval(pollTimer);
	});

	$effect(() => {
		const key = JSON.stringify({
			modelPath,
			modelReady,
			activeModelId: activeModel?.id ?? null,
		});
		if (key === lastModelDiagnosticKey) return;
		lastModelDiagnosticKey = key;
		logDiagnostic('model', 'setup_model_state_changed', {
			modelPath,
			modelReady,
			activeModelId: activeModel?.id ?? null,
			activeModelName: activeModel?.name ?? null,
		});
	});
</script>

<svelte:head><title>Set Up</title></svelte:head>

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
						Set up {@render AppIcon()} in 2 minutes.
					</h1>
					<p class="mt-2 text-[17px] leading-7 text-muted-foreground">
						Before your first Fn dictation, {@render AppIcon()} needs three things: Accessibility,
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
							{@render AppIcon()} keeps checking while you move through macOS prompts.
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
								{@render AppIcon()} uses Accessibility so Fn dictation works anywhere you type.
								The app will try to add and enable itself automatically.
							</p>
							{#if accessibilitySettingsMessage}
								<p class="mt-2 text-xs leading-5 text-muted-foreground">
									{accessibilitySettingsMessage}
								</p>
							{/if}
						</div>
					</div>
					<div class="flex justify-end">
							{#if accessibilityStatus === 'ready'}
								{@render StatusReady('Ready')}
							{:else if accessibilityStatus === 'checking'}
								{@render StatusPending('Checking')}
							{:else if accessibilityRelaunchRequired}
								<Button
									variant="outline"
									size="sm"
									onclick={restartMynah}
									disabled={isRelaunching}
								>
									{isRelaunching ? 'Restarting...' : 'Restart Mynah'}
								</Button>
							{:else}
								<Button
								variant="outline"
								size="sm"
								onclick={openAccessibilitySettings}
								disabled={isOpeningAccessibilitySettings}
							>
								<SettingsIcon class="size-4" />
								{isOpeningAccessibilitySettings ? 'Opening...' : 'Open Settings'}
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
								macOS asks once so {@render AppIcon()} can record your voice for local transcription.
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
								Choose one model before first use.
								{isIntelBuild ? 'Fast is recommended for Intel Macs.' : 'Balanced is recommended for Apple Silicon Macs.'}
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
						{#if isIntelBuild}
							Download one local model. Pick Fast on Intel Macs for the smoothest first run; you can change it later in Settings > Models.
						{:else}
							Download one local model. Balanced is the recommended Apple Silicon starting point; you can change it later in Settings > Models.
						{/if}
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
							{@render AppIcon()} is ready.
						{:else}
							Finish these steps before first dictation.
						{/if}
					</p>
					<p class="mt-1 text-sm text-muted-foreground">
						Hold Fn, speak one sentence, then release to paste at your cursor.
					</p>
					{#if preflightMessage}
						<p class="mt-2 text-sm font-medium text-warning">
							{preflightMessage}
						</p>
					{/if}
				</div>
				<Button onclick={finishSetup} disabled={!allReady || isRunningPreflight} class="shrink-0">
					{isRunningPreflight ? 'Checking...' : 'Start Using'}
					{@render AppIcon()}
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

{#snippet AppIcon()}
	<img
		src="/apple-touch-icon.png"
		alt="Mynah"
		class="inline-app-icon"
		draggable="false"
	/>
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

	.inline-app-icon {
		display: inline-block;
		width: 1.05em;
		height: 1.05em;
		margin: 0 0.1em;
		border-radius: 0.24em;
		vertical-align: -0.16em;
		box-shadow: 0 1px 3px oklch(0 0 0 / 0.16);
	}
</style>
