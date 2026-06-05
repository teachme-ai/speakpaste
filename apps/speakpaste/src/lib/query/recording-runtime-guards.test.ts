import { beforeEach, describe, expect, test } from 'bun:test';
import {
	clearManualRecordingStartTime,
	consumeManualRecordingDuration,
	enterTriggerCooldown,
	finishRecordingOperation,
	isInTriggerCooldown,
	isPipelineActive,
	markManualRecordingStarted,
	markPipelineFinished,
	markPipelineStarted,
	resetRecordingRuntimeGuardsForTest,
	tryBeginRecordingOperation,
} from './recording-runtime-guards';

describe('recording runtime guards', () => {
	beforeEach(() => {
		resetRecordingRuntimeGuardsForTest();
	});

	test('allows only one recording operation at a time', () => {
		expect(tryBeginRecordingOperation()).toBe(true);
		expect(tryBeginRecordingOperation()).toBe(false);

		finishRecordingOperation();

		expect(tryBeginRecordingOperation()).toBe(true);
	});

	test('consumes manual recording duration once', () => {
		markManualRecordingStarted(1_000);

		expect(consumeManualRecordingDuration(1_750)).toBe(750);
		expect(consumeManualRecordingDuration(2_000)).toBeUndefined();
	});

	test('can clear manual recording start time without duration', () => {
		markManualRecordingStarted(1_000);
		clearManualRecordingStartTime();

		expect(consumeManualRecordingDuration(2_000)).toBeUndefined();
	});

	test('tracks pipeline activity', () => {
		expect(isPipelineActive()).toBe(false);

		markPipelineStarted();
		expect(isPipelineActive()).toBe(true);

		markPipelineFinished();
		expect(isPipelineActive()).toBe(false);
	});

	test('enters cooldown until timer callback runs', () => {
		let callback: (() => void) | undefined;

		enterTriggerCooldown({
			setTimeoutFn: ((fn: () => void) => {
				callback = fn;
				return 1;
			}) as typeof globalThis.setTimeout,
		});

		expect(isInTriggerCooldown()).toBe(true);
		callback?.();
		expect(isInTriggerCooldown()).toBe(false);
	});
});
