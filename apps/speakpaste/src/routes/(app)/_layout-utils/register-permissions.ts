import { toast, toastOnError } from '@epicenter/ui/sonner';
import { nanoid } from 'nanoid/non-secure';
import { goto } from '$app/navigation';
import { IS_MACOS } from '$lib/constants/platform';
import { desktopServices } from '$lib/services/desktop';

function isMacDesktop() {
	return IS_MACOS && window.__TAURI_INTERNALS__;
}

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

async function openMacPrivacyPane(pane: 'Privacy_Accessibility' | 'Privacy_Microphone') {
	const { invoke } = await import('@tauri-apps/api/core');
	await invoke('open_mac_privacy_pane', { pane });
}

async function runOsLevelPermissionFixes() {
	const { invoke } = await import('@tauri-apps/api/core');

	const isTranslocated = await invoke<boolean>('check_app_translocation');
	if (isTranslocated) {
		goto('/macos-translocation-warning');
		return false;
	}

	return true;
}

async function initializeFnKeyListener() {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('initialize_fn_key_listener');
		console.log(
			'[FnKeyListener] Standalone Fn key listener initialized successfully.',
		);
		return true;
	} catch (err) {
		console.error('[FnKeyListener] Failed to initialize Fn key listener:', err);
		return false;
	}
}

export function registerAccessibilityPermission() {
	// Only run on macOS desktop
	if (!isMacDesktop()) return;

	const accessibilityToastId = nanoid();
	let pollTimer: ReturnType<typeof window.setInterval> | undefined;

	const showRecoveryToast = (
		description:
			| string
			| {
					text: string;
			  },
	) => {
		toast.warning('Accessibility access needed', {
			id: accessibilityToastId,
			description:
				typeof description === 'string' ? description : description.text,
			duration: Number.POSITIVE_INFINITY,
			action: {
				label: 'Open Recovery Guide',
				onClick: () => {
					goto('/macos-enable-accessibility');
					toast.dismiss(accessibilityToastId);
				},
			},
		});
	};

	const startPermissionPoll = () => {
		if (pollTimer) return;
		pollTimer = window.setInterval(async () => {
			const { data: granted, error } =
				await desktopServices.permissions.accessibility.check();
			if (error || !granted) return;

			window.clearInterval(pollTimer);
			pollTimer = undefined;
			toast.dismiss(accessibilityToastId);
			const initialized = await initializeFnKeyListener();
			if (initialized) {
				toast.success('Accessibility permission granted', {
					description: 'SpeakPaste is ready to listen for the Fn key again.',
				});
				return;
			}

			showRecoveryToast(
				'SpeakPaste still needs macOS to refresh its Accessibility entry. Open the recovery guide and approve the current app entry again.',
			);
			startPermissionPoll();
		}, 1000);
	};

	// Check accessibility permission once on mount
	(async () => {
		const canProceed = await runOsLevelPermissionFixes();
		if (!canProceed) return;

		const { data: isAccessibilityGranted, error } =
			await desktopServices.permissions.accessibility.check();

		if (error) {
			console.error('Failed to check accessibility permissions:', error);
			return;
		}

		if (isAccessibilityGranted) {
			const initialized = await initializeFnKeyListener();
			if (initialized) return;
		}

		const { invoke } = await import('@tauri-apps/api/core');
		const repairResult = await invoke<AccessibilityRepairResult>(
			'repair_accessibility_permissions_if_needed',
		).catch((repairError) => {
			console.error('[Permissions] Failed to run accessibility self-repair:', repairError);
			return null;
		});

		if (repairResult?.trusted) {
			const initialized = await initializeFnKeyListener();
			if (initialized) return;
		}

		if (repairResult?.didReset) {
			toast.info('Accessibility entry refreshed', {
				id: `${accessibilityToastId}-reset`,
				description:
					'SpeakPaste detected a replaced or reinstalled app and refreshed its stale Accessibility entry in macOS.',
			});
		}

		if (repairResult?.needsUserApproval) {
			showRecoveryToast(
				repairResult.didReset
					? 'macOS needs you to approve the refreshed SpeakPaste entry one more time under Privacy & Security > Accessibility.'
					: 'SpeakPaste needs accessibility permissions to trigger voice typing globally.',
			);
			startPermissionPoll();
			return;
		}

		showRecoveryToast(
			'SpeakPaste needs accessibility permissions to trigger voice typing globally.',
		);
		startPermissionPoll();
	})();

	// Return cleanup function
	return () => {
		if (pollTimer) {
			window.clearInterval(pollTimer);
			pollTimer = undefined;
		}
		toast.dismiss(accessibilityToastId);
	};
}

export function registerMicrophonePermission() {
	// Only run on macOS desktop
	if (!isMacDesktop()) return;

	const microphoneToastId = nanoid();

	// Check microphone permission once on mount
	(async () => {
		const { data: isMicrophoneGranted, error } =
			await desktopServices.permissions.microphone.check();

		if (error) {
			console.error('Failed to check microphone permissions:', error);
			return;
		}

		if (!isMicrophoneGranted) {
			// Toast if permission not granted
			toast.info('Microphone Permission Required', {
				id: microphoneToastId,
				description: 'SpeakPaste needs microphone access to record audio',
				duration: Number.POSITIVE_INFINITY,
				action: {
					label: 'Enable Permission',
					onClick: async () => {
						const { error: requestError } =
							await desktopServices.permissions.microphone.request();

						if (requestError) return toastOnError(requestError, 'Failed to request microphone permission');

						const { data: granted, error: checkError } =
							await desktopServices.permissions.microphone.check();

						if (checkError) {
							toastOnError(checkError, 'Failed to check microphone permission');
							return;
						}

						if (granted) {
							toast.success('Microphone permission enabled');
							toast.dismiss(microphoneToastId);
							return;
						}

						await openMacPrivacyPane('Privacy_Microphone');
						toast.warning('Enable microphone in System Settings', {
							id: microphoneToastId,
							description:
								'If no prompt appeared, enable SpeakPaste under Privacy & Security > Microphone, then reopen the app.',
							duration: Number.POSITIVE_INFINITY,
						});
					},
				},
			});
		}
	})();

	// Return cleanup function
	return () => {
		toast.dismiss(microphoneToastId);
	};
}
