import { describe, expect, test } from 'bun:test';
import { DICTATION_CONTRACT_VERSION, type DeliveryOutcome, type DictationSessionRequest, type TransformOutcome } from './dictation';

describe('dictation contract', () => {
	test('uses one version and explicit terminal outcome values', () => {
		const request: DictationSessionRequest = { contractVersion: DICTATION_CONTRACT_VERSION, sessionId: 'fixture-session', trigger: 'fn', action: 'dictate', voiceOverrideEnabled: false, configRevision: 'fixture-config' };
		const transform: TransformOutcome = { contractVersion: DICTATION_CONTRACT_VERSION, sessionId: request.sessionId, status: 'unchanged', text: 'hello', provider: 'raw' };
		const delivery: DeliveryOutcome = { contractVersion: DICTATION_CONTRACT_VERSION, sessionId: request.sessionId, status: 'cancelled_before_commit', textLength: transform.text.length };
		expect(request.contractVersion).toBe(transform.contractVersion);
		expect(delivery.status).toBe('cancelled_before_commit');
	});
});
