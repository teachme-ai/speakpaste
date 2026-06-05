import { beforeEach, describe, expect, test } from 'bun:test';
import {
	isSpeakPasteOwnedClipboardText,
	rememberSpeakPasteClipboardText,
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

	test('recognizes text last written by SpeakPaste', () => {
		rememberSpeakPasteClipboardText('latest dictated transcript');

		expect(
			isSpeakPasteOwnedClipboardText('latest dictated transcript'),
		).toBe(true);
	});

	test('treats different clipboard text as external', () => {
		rememberSpeakPasteClipboardText('latest dictated transcript');

		expect(isSpeakPasteOwnedClipboardText('copied from another app')).toBe(
			false,
		);
	});
});
