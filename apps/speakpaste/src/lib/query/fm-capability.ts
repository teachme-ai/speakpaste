import { invoke } from '@tauri-apps/api/core';

export type FmCapabilityStatus =
	| 'available'
	| 'deviceNotEligible'
	| 'appleIntelligenceNotEnabled'
	| 'modelNotReady'
	| 'unsupported'
	| 'unknown';

/**
 * Checks the on-device Foundation Model capability.
 * Returns the capability status.
 */
export async function getFmCapability(): Promise<FmCapabilityStatus> {
	return invoke<FmCapabilityStatus>('get_fm_capability').catch((error) => {
		console.error('Failed to get FM capability:', error);
		return 'unknown' as FmCapabilityStatus;
	});
}
