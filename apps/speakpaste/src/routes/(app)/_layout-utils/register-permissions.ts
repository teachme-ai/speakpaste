import { toast, toastOnError } from '@epicenter/ui/sonner';
import { nanoid } from 'nanoid/non-secure';
import { goto } from '$app/navigation';
import { IS_MACOS } from '$lib/constants/platform';
import { desktopServices } from '$lib/services/desktop';

export function registerAccessibilityPermission() {
	// Only run on macOS desktop
	if (!IS_MACOS) return;

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
			// Initialize global Fn key listener now that permission is confirmed
			try {
				const { invoke } = await import('@tauri-apps/api/core');
				await invoke('initialize_fn_key_listener');
				console.log('[FnKeyListener] Standalone Fn key listener initialized successfully.');
			} catch (err) {
				console.error('[FnKeyListener] Failed to initialize Fn key listener:', err);
			}
		}
	})();

	// Return cleanup function
	return () => {
		toast.dismiss(accessibilityToastId);
	};
}

export function registerMicrophonePermission() {
	// Only run on macOS desktop
	if (!IS_MACOS) return;

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
						// Dismiss the toast after requesting
						toast.dismiss(microphoneToastId);
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
