import { check } from '@tauri-apps/plugin-updater';
import { updateDialog } from '$lib/components/UpdateDialog.svelte';

export async function checkForUpdates() {
	try {
		const update = await check();
		if (update) {
			updateDialog.open(update);
		}
	} catch (error) {
		console.error('[Updater] Failed to check for updates:', error);
	}
}
