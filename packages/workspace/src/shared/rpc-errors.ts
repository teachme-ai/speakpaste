import {
	defineErrors,
	extractErrorMessage,
	type InferErrors,
} from 'wellcrafted/error';

/**
 * RPC error variants for remote action invocation.
 */
export const RpcError = defineErrors({
	PeerOffline: () => ({
		message: 'Target peer is not connected',
	}),
	PeerNotFound: ({ peer }: { peer: string }) => ({
		message: `No peer with deviceId '${peer}' found in awareness`,
		peer,
	}),
	PeerLeft: ({ peer }: { peer: string }) => ({
		message: `Peer '${peer}' disconnected before RPC response arrived`,
		peer,
	}),
	Timeout: ({ ms }: { ms: number }) => ({
		message: `RPC call timed out after ${ms}ms`,
		ms,
	}),
	ActionNotFound: ({ action }: { action: string }) => ({
		message: `Target has no handler for '${action}'`,
		action,
	}),
	ActionFailed: ({ action, cause }: { action: string; cause: unknown }) => ({
		message: `Action '${action}' failed: ${extractErrorMessage(cause)}`,
		action,
		cause,
	}),
	Disconnected: () => ({
		message: 'Connection lost before RPC response arrived',
	}),
});
export type RpcError = InferErrors<typeof RpcError>;

const RPC_ERROR_NAMES = new Set<string>([
	'PeerOffline',
	'PeerNotFound',
	'PeerLeft',
	'Timeout',
	'ActionNotFound',
	'ActionFailed',
	'Disconnected',
]);

/**
 * Type guard that narrows an unknown wire value to a known {@link RpcError} variant.
 */
export function isRpcError(value: unknown): value is RpcError {
	return (
		value != null &&
		typeof value === 'object' &&
		'name' in value &&
		typeof value.name === 'string' &&
		RPC_ERROR_NAMES.has(value.name)
	);
}
