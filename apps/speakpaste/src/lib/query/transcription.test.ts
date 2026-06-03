import { describe, expect, test } from 'bun:test';
import { cleanWhisperHallucinations } from './transcription-cleanup';

describe('cleanWhisperHallucinations', () => {
	test('removes known trailing courtesy artifacts when there is real content before them', () => {
		expect(
			cleanWhisperHallucinations(
				'Please send the summary to the team. Thank you for watching!',
			),
		).toBe('Please send the summary to the team.');
	});

	test('keeps a short standalone phrase if it could be intentional speech', () => {
		expect(cleanWhisperHallucinations('Goodbye')).toBe('Goodbye');
		expect(cleanWhisperHallucinations('Go next time!')).toBe('Go next time!');
	});

	test('removes suspicious next-time tails only when attached to prior content', () => {
		expect(
			cleanWhisperHallucinations(
				'Please send the summary to the team. Go next time!',
			),
		).toBe('Please send the summary to the team.');
	});

	test('collapses repeated trailing clauses', () => {
		expect(
			cleanWhisperHallucinations('We are ready to ship. We are ready to ship.'),
		).toBe('We are ready to ship.');
	});
});
