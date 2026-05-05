import { Ok, type Result } from 'wellcrafted/result';
import { defineMutation } from '$lib/query/client';
import { WhisperingErr, type WhisperingError } from '$lib/result';
import { desktopServices } from '$lib/services/desktop';
import type { SpeakPasteTrayState } from '$lib/services/desktop/tray';

export const tray = {
	setTrayState: defineMutation({
		mutationKey: ['tray', 'setTrayState'] as const,
		mutationFn: async ({
			state,
		}: {
			state: SpeakPasteTrayState;
		}): Promise<Result<void, WhisperingError>> => {
			const { data, error } = await desktopServices.tray.setTrayState(state);
			if (error) {
				return WhisperingErr({
					title: '⚠️ Failed to set tray state',
					serviceError: error,
				});
			}
			return Ok(data);
		},
	}),

	// Legacy compat
	setTrayIcon: defineMutation({
		mutationKey: ['tray', 'setTrayIcon'] as const,
		mutationFn: async ({
			icon,
		}: {
			icon: 'IDLE' | 'RECORDING';
		}): Promise<Result<void, WhisperingError>> => {
			const { data, error } = await desktopServices.tray.setTrayState(icon);
			if (error) {
				return WhisperingErr({
					title: '⚠️ Failed to set tray icon',
					serviceError: error,
				});
			}
			return Ok(data);
		},
	}),
};
