import { Ok } from 'wellcrafted/result';
import { rpc } from '$lib/query';
import { defineMutation } from '$lib/query/client';
import type { WhisperingError } from '$lib/result';
import type { TextError } from '$lib/services/text';
import { settings } from '$lib/state/settings.svelte';

export const delivery = {
	/**
	 * Delivers transcript to the user according to their text output preferences.
	 *
	 * This mutation handles the complete delivery workflow for transcription results:
	 * 1. Shows a success toast with the transcript
	 * 2. Optionally copies text to clipboard based on user settings
	 * 3. Optionally writes text to cursor based on user settings
	 * 4. Provides fallback UI actions when automatic operations fail
	 *
	 * The user's preferences are read from:
	 * - `transcription.copyToClipboardOnSuccess` - Whether to auto-copy
	 * - `transcription.writeToCursorOnSuccess` - Whether to auto-write to cursor
	 *
	 * @param text - The transcript to deliver
	 * @param toastId - Unique ID for toast notifications to prevent duplicates
	 * @returns Result with no meaningful data (fire-and-forget operation)
	 *
	 * @example
	 * ```typescript
	 * // After transcription completes
	 * await rpc.delivery.deliverTranscriptionResult({
	 *   text: transcript,
	 *   toastId: nanoid()
	 * });
	 * ```
	 */
	deliverTranscriptionResult: defineMutation({
		mutationKey: ['delivery', 'deliverTranscriptionResult'],
		mutationFn: async ({
			text,
			toastId,
		}: {
			text: string;
			toastId: string;
		}) => {
			// Track what operations succeeded
			let copied = false;
			let written = false;
			let clipboardChoiceOffered = false;

			const clipboardBehavior = settings.get(
				'output.transcription.clipboardBehavior',
			);
			const shouldWriteToCursor = settings.get('output.transcription.cursor');

			// Warns that automatic copy failed
			const warnAutoCopyFailed = (error: TextError) => {
				rpc.notify.warning({
					title: "Couldn't copy to clipboard",
					description: error.message,
					action: { type: 'more-details', error },
				});
			};

			const copyTranscriptToClipboard = async () => {
				const { error } = await rpc.text.copyToClipboard({ text });
				if (error) {
					warnAutoCopyFailed(error);
					return false;
				}
				copied = true;
				return true;
			};

			const copyTranscriptAction = {
				type: 'button' as const,
				label: 'Copy transcript',
				onClick: async () => {
					const copiedTranscript = await copyTranscriptToClipboard();
					if (!copiedTranscript) return;
					rpc.notify.success({
						id: `${toastId}:copy`,
						title: 'Copied transcript',
						description: text,
					});
				},
			};

			// Shows transcription result and offers manual copy action
			const offerManualCopy = () =>
				rpc.notify.success({
					id: toastId,
					title: 'Recording transcribed',
					description: text,
					action: copyTranscriptAction,
				});

			// Warns that write to cursor failed
			const warnWriteToCursorFailed = (error: TextError | WhisperingError) => {
				if (error.name === 'WhisperingError') {
					rpc.notify[error.severity](error);
					return;
				}
				rpc.notify.warning({
					title: 'Unable to write to cursor automatically',
					description: error.message,
					action: { type: 'more-details', error },
				});
			};

			// Show appropriate success notification based on what succeeded
			const showSuccessNotification = () => {
				if (copied && written) {
					// Both operations succeeded
					rpc.notify.success({
						id: toastId,
						title: 'Recording transcribed, pasted, and copied',
						description: text,
					});
				} else if (copied) {
					// Only copy succeeded
					rpc.notify.success({
						id: toastId,
						title: 'Recording transcribed and copied',
						description: text,
					});
				} else if (written) {
					// Only write succeeded
					rpc.notify.success({
						id: toastId,
						title: 'Recording transcribed and pasted',
						description: text,
						action: clipboardChoiceOffered ? undefined : copyTranscriptAction,
					});
				} else {
					// Neither succeeded, offer manual copy
					offerManualCopy();
				}
			};

			// Main delivery flow - operations are independent

			const startDelivery = performance.now();

			let askBeforeReplacingClipboard = false;
			if (clipboardBehavior === 'ask') {
				const { data: currentClipboard } = await rpc.text.readFromClipboard.fetch();
				askBeforeReplacingClipboard = Boolean(
					currentClipboard?.trim() && currentClipboard !== text,
				);
			}

			// Check if user wants to write to cursor
			if (shouldWriteToCursor) {
				const startCursor = performance.now();
				const { error: writeError } = await rpc.text.writeToCursor({
					text,
				});
				if (!writeError) {
					written = true;
					const durationCursor = performance.now() - startCursor;
					console.info(
						`[Telemetry] [Delivery] Write to cursor (Cmd+V sandwich) took ${durationCursor.toFixed(2)}ms`
					);
					// Optionally simulate Enter keystroke after successful write
					if (settings.get('output.transcription.enter')) {
						const startEnter = performance.now();
						const { error: enterError } =
							await rpc.text.simulateEnterKeystroke();
						if (!enterError) {
							const durationEnter = performance.now() - startEnter;
							console.info(
								`[Telemetry] [Delivery] Simulate Enter keystroke took ${durationEnter.toFixed(2)}ms`
							);
						} else {
							rpc.notify.warning({
								title: 'Unable to simulate Enter keystroke',
								description: enterError.message,
								action: { type: 'more-details', error: enterError },
							});
						}
					}
				} else {
					warnWriteToCursorFailed(writeError);
				}
			}

			const shouldReplaceClipboard =
				clipboardBehavior === 'replace' ||
				(clipboardBehavior === 'ask' && !askBeforeReplacingClipboard);

			if (shouldReplaceClipboard) {
				const startClipboard = performance.now();
				const copiedTranscript = await copyTranscriptToClipboard();
				if (copiedTranscript) {
					const durationClipboard = performance.now() - startClipboard;
					console.info(
						`[Telemetry] [Delivery] Copy to clipboard took ${durationClipboard.toFixed(2)}ms`,
					);
				}
			} else if (clipboardBehavior === 'ask' && askBeforeReplacingClipboard) {
				clipboardChoiceOffered = true;
				rpc.notify.info({
					id: `${toastId}:clipboard-choice`,
					title: 'Clipboard preserved',
					description:
						'Your previous clipboard is still available. Copy the transcript only if you want to replace it.',
					action: copyTranscriptAction,
				});
			}

			const durationDelivery = performance.now() - startDelivery;
			console.info(
				`[Telemetry] [Delivery] deliverTranscriptionResult total latency: ${durationDelivery.toFixed(2)}ms`
			);

			// Show appropriate notification
			showSuccessNotification();

			return Ok(undefined);
		},
	}),

	/**
	 * Delivers transformed text to the user according to their text output preferences.
	 *
	 * This mutation handles the complete delivery workflow for transformation results:
	 * 1. Shows a success toast with the transformed text
	 * 2. Optionally copies text to clipboard based on user settings
	 * 3. Optionally writes text to cursor based on user settings
	 * 4. Provides fallback UI actions when automatic operations fail
	 *
	 * The user's preferences are read from:
	 * - `transformation.copyToClipboardOnSuccess` - Whether to auto-copy
	 * - `transformation.writeToCursorOnSuccess` - Whether to auto-write to cursor
	 *
	 * @param text - The transformed text to deliver
	 * @param toastId - Unique ID for toast notifications to prevent duplicates
	 * @returns Result with no meaningful data (fire-and-forget operation)
	 *
	 * @example
	 * ```typescript
	 * // After transformation completes
	 * await rpc.delivery.deliverTransformationResult({
	 *   text: transformedText,
	 *   toastId: nanoid()
	 * });
	 * ```
	 */
	deliverTransformationResult: defineMutation({
		mutationKey: ['delivery', 'deliverTransformationResult'],
		mutationFn: async ({
			text,
			toastId,
		}: {
			text: string;
			toastId: string;
		}) => {
			// Track what operations succeeded
			let copied = false;
			let written = false;

			// Shows transformation result and offers manual copy action
			const offerManualCopy = () =>
				rpc.notify.success({
					id: toastId,
					title: '🔄 Transformation complete!',
					description: text,
					action: {
						type: 'button',
						label: 'Copy to clipboard',
						onClick: async () => {
							const { error } = await rpc.text.copyToClipboard({
								text,
							});
							if (error) {
								// Report that manual copy attempt failed
								rpc.notify.error({
									title: 'Error copying transformed text to clipboard',
									description: error.message,
									action: { type: 'more-details', error },
								});
								return;
							}
							// Confirm manual copy succeeded
							rpc.notify.success({
								id: toastId,
								title: 'Copied transformed text to clipboard!',
								description: text,
							});
						},
					},
				});

			// Warns that automatic copy failed
			const warnAutoCopyFailed = (error: TextError) => {
				rpc.notify.warning({
					title: "Couldn't copy to clipboard",
					description: error.message,
					action: { type: 'more-details', error },
				});
			};

			// Warns that write to cursor failed
			const warnWriteToCursorFailed = (error: TextError | WhisperingError) => {
				if (error.name === 'WhisperingError') {
					rpc.notify[error.severity](error);
					return;
				}
				rpc.notify.error({
					title: 'Error writing transformed text to cursor',
					description: error.message,
					action: { type: 'more-details', error },
				});
			};

			// Show appropriate success notification based on what succeeded
			const showSuccessNotification = () => {
				if (copied && written) {
					// Both operations succeeded
					rpc.notify.success({
						id: toastId,
						title:
							'🔄 Transformation complete, copied to clipboard, and written to cursor!',
						description: text,
						action: {
							type: 'link',
							label: 'Go to recordings',
							href: WHISPERING_RECORDINGS_PATHNAME,
						},
					});
				} else if (copied) {
					// Only copy succeeded
					rpc.notify.success({
						id: toastId,
						title: '🔄 Transformation complete and copied to clipboard!',
						description: text,
						action: {
							type: 'link',
							label: 'Go to recordings',
							href: WHISPERING_RECORDINGS_PATHNAME,
						},
					});
				} else if (written) {
					// Only write succeeded
					rpc.notify.success({
						id: toastId,
						title: '🔄 Transformation complete and written to cursor!',
						description: text,
						action: {
							type: 'link',
							label: 'Go to recordings',
							href: WHISPERING_RECORDINGS_PATHNAME,
						},
					});
				} else {
					// Neither succeeded, offer manual copy
					offerManualCopy();
				}
			};

			// Main delivery flow - operations are independent

			// Check if user wants to copy to clipboard
			if (settings.get('output.transformation.clipboard')) {
				const { error: copyError } = await rpc.text.copyToClipboard({
					text,
				});
				if (!copyError) {
					copied = true;
				} else {
					warnAutoCopyFailed(copyError);
				}
			}

			// Check if user wants to write to cursor (independent of copy)
			if (settings.get('output.transformation.cursor')) {
				const { error: writeError } = await rpc.text.writeToCursor({
					text,
				});
				if (!writeError) {
					written = true;
					// Optionally simulate Enter keystroke after successful write
					if (settings.get('output.transformation.enter')) {
						const { error: enterError } =
							await rpc.text.simulateEnterKeystroke();
						if (enterError) {
							rpc.notify.warning({
								title: 'Unable to simulate Enter keystroke',
								description: enterError.message,
								action: { type: 'more-details', error: enterError },
							});
						}
					}
				} else {
					warnWriteToCursorFailed(writeError);
				}
			}

			// Show appropriate notification
			showSuccessNotification();

			return Ok(undefined);
		},
	}),
};
