import { invoke } from '@tauri-apps/api/core';
import { exists, stat } from '@tauri-apps/plugin-fs';
import { type } from 'arktype';
import { extractErrorMessage } from 'wellcrafted/error';
import { Ok, type Result, tryAsync } from 'wellcrafted/result';
import { WhisperingErr, type WhisperingError } from '$lib/result';

import { isModelFileSizeValid, type WhisperModelConfig } from './types';

/**
 * Pre-built Whisper models available for download from Hugging Face.
 * These are ggml-format models compatible with whisper.cpp.
 */
/**
 * SpeakPaste MVP model presets — English-only, Metal-accelerated.
 * Shown in UI as Fast / Balanced / Better.
 */
export const WHISPER_MODELS = [
	{
		id: 'tiny.en',
		name: 'Fast',
		description: 'Fast · tiny.en · Local',
		size: '78 MB',
		sizeBytes: 77_704_715,
		engine: 'whispercpp',
		file: {
			url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
			filename: 'ggml-tiny.en.bin',
		},
	},
	{
		id: 'base.en',
		name: 'Balanced',
		description: 'Balanced · base.en · Local',
		size: '148 MB',
		sizeBytes: 147_951_465,
		engine: 'whispercpp',
		file: {
			url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
			filename: 'ggml-base.en.bin',
		},
	},
	{
		id: 'small.en',
		name: 'Better',
		description: 'Better · small.en · Local',
		size: '488 MB',
		sizeBytes: 487_601_967,
		engine: 'whispercpp',
		file: {
			url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
			filename: 'ggml-small.en.bin',
		},
	},
] as const satisfies readonly WhisperModelConfig[];

const WhisperCppErrorType = type({
	name: "'AudioReadError' | 'FfmpegNotFoundError' | 'GpuError' | 'ModelLoadError' | 'TranscriptionError'",
	message: 'string',
});

export const WhisperCppTranscriptionServiceLive = {
	async transcribe(
		audioBlob: Blob,
		options: {
			outputLanguage: string;
			modelPath: string;
			prompt: string;
		},
	): Promise<Result<string, WhisperingError>> {
		// Pre-validation
		if (!options.modelPath) {
			return WhisperingErr({
				title: '📁 Model File Required',
				description: 'Please select a Whisper model file in settings.',
				action: {
					type: 'link',
					label: 'Configure model',
					href: '/settings/transcription',
				},
			});
		}

		// Check if model file exists
		const { data: isExists } = await tryAsync({
			try: () => exists(options.modelPath),
			catch: () => Ok(false),
		});

		if (!isExists) {
			return WhisperingErr({
				title: '❌ Model File Not Found',
				description: `The model file "${options.modelPath}" does not exist.`,
				action: {
					type: 'link',
					label: 'Select model',
					href: '/settings/transcription',
				},
			});
		}

		// Check for corrupted/incomplete model files
		const modelConfig = WHISPER_MODELS.find((m) =>
			options.modelPath.endsWith(m.file.filename),
		);
		if (modelConfig) {
			const { data: fileStats } = await tryAsync({
				try: () => stat(options.modelPath),
				catch: () => Ok(null),
			});
			if (
				fileStats &&
				!isModelFileSizeValid(fileStats.size, modelConfig.sizeBytes)
			) {
				return WhisperingErr({
					title: '⚠️ Model File Appears Corrupted',
					description: `The model file is ${Math.round(fileStats.size / 1000000)}MB but should be ~${Math.round(modelConfig.sizeBytes / 1000000)}MB. This usually happens when a download was interrupted. Please delete and re-download the model.`,
					action: {
						type: 'link',
						label: 'Re-download model',
						href: '/settings/transcription',
					},
				});
			}
		}

		// Convert audio blob to byte array
		const arrayBuffer = await audioBlob.arrayBuffer();
		const audioData = Array.from(new Uint8Array(arrayBuffer));

		// Call Tauri command to transcribe with whisper-cpp
		// Note: temperature is not supported by local models (transcribe-rs)
		const result = await tryAsync({
			try: () =>
				invoke<string>('transcribe_audio_whisper', {
					audioData: audioData,
					modelPath: options.modelPath,
					language:
						options.outputLanguage === 'auto' ? null : options.outputLanguage,
					initialPrompt: options.prompt || null,
				}),
			catch: (unknownError) => {
				const result = WhisperCppErrorType(unknownError);
				if (result instanceof type.errors) {
					return WhisperingErr({
						title: '❌ Unexpected Whisper C++ Error',
						description: extractErrorMessage(unknownError),
						action: { type: 'more-details', error: unknownError },
					});
				}
				const error = result;

				switch (error.name) {
					case 'ModelLoadError': {
						const isIncomplete =
							error.message.includes('not all tensors loaded') ||
							error.message.includes('failed to load model');
						return WhisperingErr({
							title: isIncomplete
								? '⚠️ Model File Incomplete'
								: '🤖 Model Loading Error',
							description: isIncomplete
								? 'Model file appears incomplete. Re-download the model.'
								: error.message,
							action: {
								type: 'link',
								label: 'Re-download model',
								href: '/settings/transcription',
							},
						});
					}

					case 'GpuError':
						return WhisperingErr({
							title: '🎮 GPU Error',
							description: error.message,
							action: {
								type: 'link',
								label: 'Configure settings',
								href: '/settings/transcription',
							},
						});

					case 'FfmpegNotFoundError':
						return WhisperingErr({
							title: '🛠️ FFmpeg Required for This Recording Format',
							description:
								'This recording is in a compressed format (webm/ogg/mp4) that requires FFmpeg. Install FFmpeg or switch to CPAL recording (which produces WAV files that work without FFmpeg).',
							action: {
								type: 'link',
								label: 'Install FFmpeg',
								href: '/install-ffmpeg',
							},
						});

					case 'AudioReadError':
						return WhisperingErr({
							title: '🔊 Audio Read Error',
							description: error.message,
							action: {
								type: 'more-details',
								error: new Error(error.message),
							},
						});

					case 'TranscriptionError':
						return WhisperingErr({
							title: '❌ Transcription Error',
							description: error.message,
							action: {
								type: 'more-details',
								error: new Error(error.message),
							},
						});

					default:
						return WhisperingErr({
							title: '❌ Whisper C++ Error',
							description: 'An unexpected error occurred.',
							action: {
								type: 'more-details',
								error: new Error(String(error)),
							},
						});
				}
			},
		});

		return result;
	},
};

export type WhisperCppTranscriptionService =
	typeof WhisperCppTranscriptionServiceLive;
