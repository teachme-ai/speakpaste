import { mock, test, expect, describe } from 'bun:test';

globalThis.window = {
	__TAURI_INTERNALS__: {
		invoke: () => Promise.resolve('/dummy/path'),
		metadata: {}
	},
	navigator: { userAgent: '' },
	dispatchEvent: () => true,
	CustomEvent: class {
		constructor(public type: string, public detail?: any) {}
	},
	setTimeout: globalThis.setTimeout.bind(globalThis),
	clearTimeout: globalThis.clearTimeout.bind(globalThis),
} as any;

globalThis.navigator = globalThis.window.navigator;
globalThis.document = {
	ontouchend: false
} as any;
globalThis.CustomEvent = globalThis.window.CustomEvent;
globalThis.indexedDB = {
	open: () => ({})
} as any;


mock.module('$app/environment', () => {
	return {
		browser: true,
		dev: true,
		building: false,
	};
});

mock.module('@epicenter/svelte', () => {
	return {
		fromTable: () => new Map(),
	};
});


mock.module('/Users/irfan/projects/SpeakPaste/speakpaste/packages/svelte-utils/src/persisted-state.svelte.ts', () => {
	class PersistedError extends Error {}
	return {
		PersistedError,
		createPersistedState: (key: string, initial: any) => {
			let val = initial;
			return {
				get value() { return val; },
				set value(v) { val = v; }
			};
		}
	};
});



const mockRecordingsStore = new Map<string, any>();
const mockSettingsStore = new Map<string, any>();
const mockTransformationsStore = new Map<string, any>();
let deliveredText = '';

function mockAllPaths(alias: string, factory: () => any) {
	const resolved = import.meta.resolve(alias);
	const absPath = resolved.startsWith('file://') ? resolved.slice(7) : resolved;
	
	mock.module(alias, factory);
	mock.module(absPath, factory);
	if (absPath.endsWith('.ts')) {
		mock.module(absPath.slice(0, -3), factory);
	}
	if (absPath.endsWith('.svelte.ts')) {
		mock.module(absPath.slice(0, -10), factory);
		mock.module(absPath.slice(0, -10) + '.svelte', factory);
	}
	if (absPath.endsWith('/index.ts')) {
		const dirPath = absPath.slice(0, -9);
		mock.module(dirPath, factory);
		mock.module(dirPath + '/index', factory);
	}
}

mockAllPaths('$lib/state/recordings.svelte', () => {
	return {
		recordings: {
			set: (r: any) => mockRecordingsStore.set(r.id, r),
			update: (id: string, partial: any) => {
				const current = mockRecordingsStore.get(id) || {};
				mockRecordingsStore.set(id, { ...current, ...partial });
			},
			get: (id: string) => mockRecordingsStore.get(id),
			all: mockRecordingsStore,
		}
	};
});

mockAllPaths('$lib/state/settings.svelte', () => {
	return {
		settings: {
			get: (k: string) => mockSettingsStore.get(k),
			set: (k: string, v: any) => mockSettingsStore.set(k, v),
		}
	};
});

mockAllPaths('$lib/state/transformations.svelte', () => {
	return {
		transformations: {
			get: (id: string) => mockTransformationsStore.get(id),
		}
	};
});

mockAllPaths('$lib/services', () => {
	return {
		services: {
			blobs: {
				audio: {
					save: () => Promise.resolve({ error: null }),
				}
			}
		}
	};
});

mockAllPaths('./transcription', () => {
	return {
		transcribeBlob: () => Promise.resolve({ data: 'please clean this up: so i went to the the store um', error: null }),
	};
});

mockAllPaths('./delivery', () => {
	return {
		delivery: {
			deliverTranscriptionResult: ({ text }: { text: string }) => {
				deliveredText = text;
				return Promise.resolve();
			}
		}
	};
});

mockAllPaths('./notify', () => {
	return {
		notify: {
			info: () => {},
			warning: () => {},
			error: () => {},
			success: () => {}
		}
	};
});

mockAllPaths('./sound', () => {
	return {
		sound: {
			playSoundIfEnabled: () => {}
		}
	};
});

mockAllPaths('$lib/state/dictation-runtime.svelte', () => {
	return {
		dictationRuntime: {
			setStatus: () => {}
		}
	};
});

mockAllPaths('./analytics', () => {
	return {
		analytics: {
			logEvent: () => {}
		}
	};
});

mockAllPaths('$lib/whispering/client', () => {
	return {
		whispering: {
			tables: {
				recordings: {
					set: () => {},
					update: () => {},
					delete: () => {},
					bulkDelete: () => {}
				}
			}
		}
	};
});


describe('🎙️ Recording Pipeline End-to-End Persistence Split Test', () => {
	test('asserts that delivery gets the shaped transcript while Yjs persistence gets the verbatim raw transcript', async () => {
		const { processRecordingPipeline } = await import('./recording-pipeline');

		// 1. Setup mock settings
		mockSettingsStore.set('intent.mode', 'clean_ramble');
		mockSettingsStore.set('intent.voiceOverrideEnabled', true);
		mockSettingsStore.set('transformation.selectedId', null);

		const fakeBlob = new Blob(['fake-audio-content'], { type: 'audio/wav' });
		const recordingId = 'test-recording-123';
		deliveredText = '';
		mockRecordingsStore.clear();

		// 2. Drive the pipeline
		await processRecordingPipeline({
			blob: fakeBlob,
			recordingId,
			source: 'manual',
			toastId: 'fake-toast-id',
		});

		// 3. Assertions
		// Delivery got the clean, formatted residual:
		expect(deliveredText).toBe('so i went to the store');
		
		// The recording record in recordings got the verbatim raw transcript:
		const savedRecording = mockRecordingsStore.get(recordingId);
		expect(savedRecording).toBeDefined();
		expect(savedRecording.transcript).toBe('please clean this up: so i went to the the store um');

		// Assert divergence
		expect(deliveredText).not.toBe(savedRecording.transcript);
	});
});
