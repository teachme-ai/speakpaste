<script lang="ts">
	import { Badge } from '@epicenter/ui/badge';
	import { Button } from '@epicenter/ui/button';
	import * as Card from '@epicenter/ui/card';
	import { toast } from '@epicenter/ui/sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { goto } from '$app/navigation';
	import { desktopServices } from '$lib/services/desktop';
	import { asShellCommand } from '$lib/services/desktop/command';
	import type { PageData } from './$types';

	import { onMount, onDestroy } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';

	type AccessibilityRepairResult = {
		trusted: boolean;
		prompted: boolean;
		didReset: boolean;
		installChanged: boolean;
		needsUserApproval: boolean;
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

	let { data } = $props();
	let isAccessibilityGranted = $state(data.isAccessibilityGranted);
	let checkInterval: any;
	const quarantineCommand =
		'xattr -dr com.apple.quarantine /Applications/Mynah.app';

	onMount(async () => {
		if (window.__TAURI_INTERNALS__) {
			try {
				const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
				const currentWindow = getCurrentWindow();
				await currentWindow.setSize(new LogicalSize(500, 980));
			} catch (e) {
				console.error('Failed to resize window on mount:', e);
			}
		}

		if (isAccessibilityGranted) {
			// Ensure it's initialized if already granted
			void checkFnKeyReadiness();
		}

		checkInterval = setInterval(async () => {
			if (await checkFnKeyReadiness()) {
				isAccessibilityGranted = true;
				clearInterval(checkInterval);
				toast.success('Accessibility permission granted!', {
					description: 'Mynah has successfully registered the global Fn key listener.',
				});
			}
		}, 1000);
	});

	onDestroy(async () => {
		if (checkInterval) {
			clearInterval(checkInterval);
		}
		if (window.__TAURI_INTERNALS__) {
			try {
				const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
				const currentWindow = getCurrentWindow();
				await currentWindow.setSize(new LogicalSize(500, 850));
			} catch (e) {
				console.error('Failed to restore window size on destroy:', e);
			}
		}
	});

	async function requestPermissionOrShowGuidance() {
		const repairResult = await invoke<AccessibilityRepairResult>(
			'repair_accessibility_permissions_if_needed',
			{ force: true },
		).catch((error) => {
			console.error('Failed to trigger accessibility recovery:', error);
			return null;
		});

		if (repairResult?.didReset) {
			toast.info('Accessibility entry refreshed', {
				description:
					'Mynah refreshed its stale macOS Accessibility entry after reinstall or replacement.',
			});
		}

		await openSystemSettings();
	}

	async function checkFnKeyReadiness() {
		try {
			const readiness = await invoke<FnKeyListenerReadiness>(
				'get_fn_key_listener_readiness',
			);
			if (readiness.listenerReady) {
				isAccessibilityGranted = true;
				return true;
			}
			isAccessibilityGranted = false;
			console.warn('[FnKeyListener] Listener is not ready yet.', readiness);
			return false;
		} catch (err) {
			console.error('[FnKeyListener] Failed to check listener readiness:', err);
			return false;
		}
	}

	async function openSystemSettings() {
		// Try opening System Settings directly (works on macOS 13+)
		const { error: commandError } = await desktopServices.command.execute(
			asShellCommand(
				'open x-apple.systemsettings:com.apple.SystemSettings.extension',
			),
		);

		if (commandError) {
			console.error('Failed to open System Settings:', commandError);

			// Fallback: Show detailed instructions
			toast.info('Open System Settings Manually', {
				description:
					'Click Apple menu → System Settings → Privacy & Security → Accessibility',
				duration: 10000,
			});
			return;
		}

		// Show helpful toast since we can't open directly to accessibility
		toast.info('System Settings Opened', {
			description:
				'Navigate to Privacy & Security > Accessibility to grant permissions.',
			duration: 8000,
		});
	}

	async function copyQuarantineCommand() {
		try {
			await navigator.clipboard.writeText(quarantineCommand);
			toast.success('Command copied');
		} catch (error) {
			console.error('Failed to copy quarantine command:', error);
			toast.error('Could not copy command');
		}
	}
</script>

<svelte:head> <title>MacOS Accessibility</title> </svelte:head>

<main class="flex flex-1 items-center justify-center">
	<Card.Root class="w-full max-w-2xl">
		<Card.Header>
			<div class="flex items-center gap-4">
				<img
					src="/apple-touch-icon.png"
					alt=""
					class="size-14 rounded-[18px] shadow-md shadow-black/10 ring-1 ring-black/10 dark:ring-white/10"
				/>
				<div class="min-w-0">
					<Card.Title class="text-xl">MacOS Accessibility</Card.Title>
					<p class="mt-1 text-sm text-muted-foreground">
						Approve Mynah for system-wide cursor typing.
					</p>
				</div>
			</div>
			<Card.Description class="leading-7">
				Mynah requires fresh Microphone and Accessibility permissions.
				Old SpeakPaste permission entries may remain in System Settings and should be removed.
				Ensure you run Mynah from <code class="text-xs bg-muted px-1.5 py-0.5 rounded">/Applications/Mynah.app</code> and do not reuse the old <code class="text-xs bg-muted px-1.5 py-0.5 rounded">SpeakPaste.app</code>.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col gap-5">
				<ol
					class="text-muted-foreground list-inside list-decimal space-y-2 text-sm leading-7"
				>
					<li>
						Mynah may automatically refresh a stale entry in the
						background. If you still do not see a working Fn trigger, continue
						with the manual re-approval steps below.
					</li>

					<li>
						Go to
						<span class="text-primary font-semibold tracking-tight">
							System Settings > Privacy & Security > Accessibility
						</span>
						or click the button below.
					</li>

					<li>
						Click on
						<span class="text-primary font-semibold tracking-tight"
							>🎙️ Mynah</span
						>
						and remove it using the minus icon (-).
					</li>
					<li>
						Re-add Mynah by pressing the plus icon (+) and selecting
						<span class="text-primary font-semibold tracking-tight"
							>🎙️ Mynah.app</span
						>
					</li>
				</ol>

				<div class="rounded-xl border border-border bg-muted/40 p-4">
					<div class="space-y-3">
						<div>
							<h2 class="text-sm font-semibold text-foreground">
								If macOS blocks the downloaded app
							</h2>
							<p class="mt-1 text-sm leading-6 text-muted-foreground">
								For early beta builds, macOS may say Apple cannot verify
								Mynah. After dragging Mynah to Applications, run this
								Terminal command once and open the app again.
							</p>
						</div>

						<div
							class="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
						>
							<code
								class="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-xs text-foreground"
							>
								{quarantineCommand}
							</code>
							<Button
								variant="outline"
								size="sm"
								onclick={copyQuarantineCommand}
								aria-label="Copy xattr command"
							>
								<ClipboardIcon class="size-4" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</Card.Content>
		<Card.Footer>
			{#if !isAccessibilityGranted}
				<div class="flex gap-3 w-full">
					<Button
						variant="outline"
						onclick={() => goto('/')}
						class="flex-1 text-sm"
					>
						<ArrowLeft class="size-4" />
						Back to Home
					</Button>
					<Button
						onclick={() => requestPermissionOrShowGuidance()}
						class="flex-1 text-sm"
					>
						<SettingsIcon class="size-4" />
						Request Permission
					</Button>
				</div>
			{:else}
				<div class="flex flex-col gap-3 w-full">
					<Badge variant="success">
						<CheckIcon class="size-4" />
						Accessibility permissions granted
					</Badge>
					<div class="flex gap-3">
						<Button
							variant="outline"
							onclick={() => goto('/')}
							class="flex-1 text-sm"
						>
							<ArrowLeft class="size-4" />
							Back to Home
						</Button>
						<Button
							onclick={() => openSystemSettings()}
							variant="outline"
							class="flex-1 text-sm"
						>
							<SettingsIcon class="size-4" />
							Open Settings
						</Button>
					</div>
				</div>
			{/if}
		</Card.Footer>
	</Card.Root>
</main>
