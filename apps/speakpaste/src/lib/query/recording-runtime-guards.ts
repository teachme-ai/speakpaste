import { TRIGGER_COOLDOWN_MS } from '$lib/constants/app';

export const TRANSCRIPTION_TIMEOUT_MS = 60_000;

let manualRecordingStartTime: number | null = null;
let isRecordingOperationBusy = false;
let isCooldown = false;
let isPipelineRunning = false;

export function tryBeginRecordingOperation() {
	if (isRecordingOperationBusy) return false;
	isRecordingOperationBusy = true;
	return true;
}

export function finishRecordingOperation() {
	isRecordingOperationBusy = false;
}

export async function withRecordingOperation<T>({
	onBusy,
	operation,
}: {
	onBusy: () => T | Promise<T>;
	operation: () => T | Promise<T>;
}) {
	if (!tryBeginRecordingOperation()) {
		return await onBusy();
	}

	try {
		return await operation();
	} finally {
		finishRecordingOperation();
	}
}

export function markManualRecordingStarted(now = Date.now()) {
	manualRecordingStartTime = now;
}

export function consumeManualRecordingDuration(now = Date.now()) {
	if (!manualRecordingStartTime) return undefined;
	const duration = now - manualRecordingStartTime;
	manualRecordingStartTime = null;
	return duration;
}

export function clearManualRecordingStartTime() {
	manualRecordingStartTime = null;
}

export function isInTriggerCooldown() {
	return isCooldown;
}

export function isPipelineActive() {
	return isPipelineRunning;
}

export function markPipelineStarted() {
	isPipelineRunning = true;
}

export function markPipelineFinished() {
	isPipelineRunning = false;
}

export function enterTriggerCooldown({
	setTimeoutFn = globalThis.setTimeout.bind(globalThis),
}: {
	setTimeoutFn?: typeof globalThis.setTimeout;
} = {}) {
	isCooldown = true;
	console.info(`[Trigger] cooldown started (${TRIGGER_COOLDOWN_MS}ms)`);
	setTimeoutFn(() => {
		isCooldown = false;
		console.info('[Trigger] cooldown ended — ready');
	}, TRIGGER_COOLDOWN_MS);
}

export function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	onTimeout: () => T,
) {
	return Promise.race([
		promise,
		new Promise<T>((resolve) => {
			globalThis.setTimeout(() => resolve(onTimeout()), timeoutMs);
		}),
	]);
}

export function resetRecordingRuntimeGuardsForTest() {
	manualRecordingStartTime = null;
	isRecordingOperationBusy = false;
	isCooldown = false;
	isPipelineRunning = false;
}
