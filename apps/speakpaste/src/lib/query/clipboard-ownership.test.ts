import { beforeEach, describe, expect, test } from 'bun:test';
import {
	isMynahOwnedClipboardText,
	rememberMynahClipboardText,
} from './clipboard-ownership';

const storage = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
	value: {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => storage.set(key, value),
		removeItem: (key: string) => storage.delete(key),
		clear: () => storage.clear(),
	},
	configurable: true,
});

describe('clipboard ownership', () => {
	beforeEach(() => {
		storage.clear();
	});

	test('recognizes text last written by Mynah', () => {
		rememberMynahClipboardText('latest dictated transcript');

		expect(
			isMynahOwnedClipboardText('latest dictated transcript'),
		).toBe(true);
	});

	test('treats different clipboard text as external', () => {
		rememberMynahClipboardText('latest dictated transcript');

		expect(isMynahOwnedClipboardText('copied from another app')).toBe(
			false,
		);
	});

	test('simulates Ask behavior runtime loop', () => {
		// Step 1: Copy external text from another app
		let clipboard = 'External text from another app';

		// Svelte check: should ask because it's external text
		let askBeforeReplacing =
			clipboard.trim() && !isMynahOwnedClipboardText(clipboard);
		expect(askBeforeReplacing).toBe(true);

		// Step 2: Choose/copy transcript once
		const transcript1 = 'Transcript text 1';
		rememberMynahClipboardText(transcript1);
		clipboard = transcript1;

		// Step 3: Dictate again without changing clipboard externally
		const transcript2 = 'Transcript text 2';
		askBeforeReplacing =
			clipboard.trim() &&
			clipboard !== transcript2 &&
			!isMynahOwnedClipboardText(clipboard);
		// Should not ask because clipboard matches app-owned marker
		expect(askBeforeReplacing).toBe(false);

		// Silently replaces and remembers new transcript
		rememberMynahClipboardText(transcript2);
		clipboard = transcript2;

		// Step 4: Copy new external text
		clipboard = 'New external text';

		// Step 5: Dictate again, should prompt again
		const transcript3 = 'Transcript text 3';
		askBeforeReplacing =
			clipboard.trim() &&
			clipboard !== transcript3 &&
			!isMynahOwnedClipboardText(clipboard);
		expect(askBeforeReplacing).toBe(true);
	});
});
