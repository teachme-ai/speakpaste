import { toast, toastOnError } from '@epicenter/ui/sonner';
import { nanoid } from 'nanoid/non-secure';
import { goto } from '$app/navigation';
import { IS_MACOS } from '$lib/constants/platform';
import { desktopServices } from '$lib/services/desktop';
import { asShellCommand } from '$lib/services/desktop/command';

function isMacDesktop() {
	return IS_MACOS && window.__TAURI_INTERNALS__;
}

async function openMacPrivacyPane(pane: 'Privacy_Accessibility' | 'Privacy_Microphone') {
	const { error } = await desktopServices.command.execute(
		asShellCommand(
			`open "x-apple.systemsettings:com.apple.preference.security?${pane}"`,
		),
	);

	if (error) {
		console.error(`Failed to open macOS privacy pane ${pane}:`, error);
	}
}

async function initializeFnKeyListener(accessibilityToastId: string) {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('initialize_fn_key_listener');
		console.log(
			'[FnKeyListener] Standalone Fn key listener initialized successfully.',
		);
	} catch (err) {
		console.error('[FnKeyListener] Failed to initialize Fn key listener:', err);
		toast.warning('Fn key listener needs Accessibility access', {
			id: accessibilityToastId,
			description:
				'If you already enabled Accessibility, remove SpeakPaste from the list, add it again, then reopen SpeakPaste.',
			duration: Number.POSITIVE_INFINITY,
			action: {
				label: 'View Guide',
				onClick: () => {
					goto('/macos-enable-accessibility');
					toast.dismiss(accessibilityToastId);
				},
			},
		});
	}
}

export function registerAccessibilityPermission() {
	// Only run on macOS desktop
	if (!isMacDesktop()) return;

	const accessibilityToastId = nanoid();

	// Check accessibility permission once on mount
	(async () => {
		const { data: isAccessibilityGranted, error } =
			await desktopServices.permissions.accessibility.check();

		if (error) {
			console.error('Failed to check accessibility permissions:', error);
			return;
		}

		if (!isAccessibilityGranted) {
			// Toast if permission not granted
			toast.warning('Accessibility Permission Issue', {
				id: accessibilityToastId,
				description:
					'SpeakPaste needs accessibility permissions. This often requires removing and re-adding the app after updates.',
				duration: Number.POSITIVE_INFINITY,
				action: {
					label: 'View Guide',
					onClick: () => {
						goto('/macos-enable-accessibility');
						// Dismiss the toast
						toast.dismiss(accessibilityToastId);
					},
				},
			});
		} else {
			await initializeFnKeyListener(accessibilityToastId);
		}
	})();

	// Return cleanup function
	return () => {
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
