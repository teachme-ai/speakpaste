import { goto } from '$app/navigation';
import { rpc } from '$lib/query';
import {
	getSelectedTranscriptionService,
	isTranscriptionServiceConfigured,
} from '$lib/settings/transcription-validation';

/**
 * Checks if the selected local transcription engine has the needed model file.
 * Shows an onboarding toast if configuration is missing.
 */
export function registerOnboarding() {
	const selectedService = getSelectedTranscriptionService();
	const pathname = window.location.pathname;
	const canShowSetupAssistant = window.__TAURI_INTERNALS__ && pathname === '/';
	const alreadyInSetup = pathname === '/setup';

	// Check transcription service configuration
	if (!selectedService) {
		if (canShowSetupAssistant) {
			goto('/setup', { replaceState: true });
			return true;
		}
		if (alreadyInSetup) return true;

		rpc.notify.info({
			title: 'Welcome to Mynah!',
			description: 'Please select a transcription service to get started.',
			action: {
				type: 'link',
				label: 'Configure',
				href: '/settings/transcription',
			},
			persist: true,
		});
		return false;
	}

	if (!isTranscriptionServiceConfigured(selectedService)) {
		if (canShowSetupAssistant) {
			goto('/setup', { replaceState: true });
			return true;
		}
		if (alreadyInSetup) return true;

		rpc.notify.info({
			title: 'Welcome to Mynah!',
			description: `Please configure your ${selectedService.name} model file to get started.`,
			action: {
				type: 'link',
				label: 'Configure',
				href: '/settings/transcription',
			},
			persist: true,
		});
		return false;
	}

	return false;
}
