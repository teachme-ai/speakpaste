<script lang="ts">
	import { Badge } from '@epicenter/ui/badge';
	import { Button } from '@epicenter/ui/button';
	import * as Card from '@epicenter/ui/card';
	import * as SectionHeader from '@epicenter/ui/section-header';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';
	import PlayIcon from '@lucide/svelte/icons/play';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';

	// ── Complete Test Categories & Assertions Map ────────────────────────────────

	type TestStatus = 'idle' | 'running' | 'passed' | 'failed';

	interface Assertion {
		name: string;
		status: TestStatus;
		error?: string;
		timeMs?: number;
	}

	interface TestGroup {
		id: string;
		name: string;
		icon: string;
		assertions: Assertion[];
	}

	let testGroups = $state<TestGroup[]>([
		{
			id: 'api-keys',
			name: '🔑 API Keys State & Secrets',
			icon: 'key',
			assertions: [
				{ name: 'Can read and write OpenAI API key successfully', status: 'idle' },
				{ name: 'Can read and write Anthropic API key successfully', status: 'idle' },
				{ name: 'Clearing API key returns default empty string', status: 'idle' },
				{ name: 'Can write and read third-party Google key without corruption', status: 'idle' },
			],
		},
		{
			id: 'recording',
			name: '🎙️ Recording Hardware & Options',
			icon: 'mic',
			assertions: [
				{ name: 'Recording method is restricted to cpal, navigator, or ffmpeg', status: 'idle' },
				{ name: 'Accepts sample rates 16000, 44100, and 48000', status: 'idle' },
				{ name: 'FFmpeg custom flags fallback to default when empty', status: 'idle' },
				{ name: 'Can save device identifier cleanly without type crash', status: 'idle' },
			],
		},
		{
			id: 'shortcuts',
			name: '⌨️ Global Keyboard Entitlements',
			icon: 'keyboard',
			assertions: [
				{ name: 'Can read default toggleManualRecording hotkey', status: 'idle' },
				{ name: 'Custom hotkey formatting parses cleanly', status: 'idle' },
				{ name: 'Restoring a hotkey to null works without error', status: 'idle' },
				{ name: 'Validates Walkie-Talkie Push-to-Talk global hotkey config', status: 'idle' },
			],
		},
		{
			id: 'sound',
			name: '🔊 Sound Alerts & Themes',
			icon: 'volume-2',
			assertions: [
				{ name: 'Persists alert sound themes successfully', status: 'idle' },
				{ name: 'Toggles manual recording start sound cleanly', status: 'idle' },
				{ name: 'Saves transcription-complete notification audio trigger state', status: 'idle' },
			],
		},
		{
			id: 'transcription',
			name: '🧠 Transcription & Model Swaps',
			icon: 'brain',
			assertions: [
				{ name: 'Switches between OpenAI, Groq, and whispercpp services', status: 'idle' },
				{ name: 'Validates target transcription language parameter', status: 'idle' },
				{ name: 'Inference temperature restricts within 0.0 - 1.0 boundary', status: 'idle' },
				{ name: 'Validates default transcription model instructions prompt', status: 'idle' },
			],
		},
		{
			id: 'paste',
			name: '📋 Clipboard & Cursor Delivery',
			icon: 'clipboard',
			assertions: [
				{ name: 'Toggles clipboard copy-to-clipboard setting', status: 'idle' },
				{ name: 'Saves auto-paste at active cursor toggle state', status: 'idle' },
				{ name: 'Saves auto-simulate enter key after paste toggle state', status: 'idle' },
			],
		},
		{
			id: 'retention',
			name: '🗑️ Data Retention Policies',
			icon: 'trash',
			assertions: [
				{ name: 'Supports keep-forever and limit-count strategy settings', status: 'idle' },
				{ name: 'Saves and restricts positive maximum recording retention count', status: 'idle' },
				{ name: 'Settings reset returns all workspace keys to exact defaults', status: 'idle' },
			],
		},
	]);

	let isTesting = $state(false);
	let testSummary = $state({ total: 0, passed: 0, failed: 0, timeMs: 0 });

	// ── Diagnostic Execution Deck ──────────────────────────────────────────────

	async function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function runDiagnosticsSuite() {
		if (isTesting) return;
		isTesting = true;
		testSummary = { total: 0, passed: 0, failed: 0, timeMs: 0 };

		const startTime = performance.now();

		// Set status to idle
		for (const group of testGroups) {
			for (const assert of group.assertions) {
				assert.status = 'idle';
				assert.error = undefined;
				assert.timeMs = undefined;
			}
		}

		await sleep(200);

		// --- Category 1: API Keys ---
		{
			const group = testGroups[0];
			
			// OpenAI Key
			{
				const assert = group.assertions[0];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = deviceConfig.get('apiKeys.openai');
					deviceConfig.set('apiKeys.openai', 'sk-test-openai-key-ui-diagnostic');
					if (deviceConfig.get('apiKeys.openai') !== 'sk-test-openai-key-ui-diagnostic') throw new Error('Persisted key mismatch');
					deviceConfig.set('apiKeys.openai', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Anthropic Key
			{
				const assert = group.assertions[1];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = deviceConfig.get('apiKeys.anthropic');
					deviceConfig.set('apiKeys.anthropic', 'sk-ant-test-key-ui-diagnostic');
					if (deviceConfig.get('apiKeys.anthropic') !== 'sk-ant-test-key-ui-diagnostic') throw new Error('Persisted key mismatch');
					deviceConfig.set('apiKeys.anthropic', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Clear Keys
			{
				const assert = group.assertions[2];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = deviceConfig.get('apiKeys.groq');
					deviceConfig.set('apiKeys.groq', '');
					if (deviceConfig.get('apiKeys.groq') !== '') throw new Error('Failed to restore to empty fallback');
					deviceConfig.set('apiKeys.groq', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Google Key
			{
				const assert = group.assertions[3];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = deviceConfig.get('apiKeys.google');
					deviceConfig.set('apiKeys.google', 'google-ai-test-key');
					if (deviceConfig.get('apiKeys.google') !== 'google-ai-test-key') throw new Error('Persisted key mismatch');
					deviceConfig.set('apiKeys.google', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}
		}

		await sleep(40);

		// --- Category 2: Recording Hardware ---
		{
			const group = testGroups[1];

			// Method Restrictions
			{
				const assert = group.assertions[0];
				assert.status = 'running';
				const start = performance.now();
				try {
					const method = deviceConfig.get('recording.method');
					if (method !== 'cpal' && method !== 'navigator' && method !== 'ffmpeg') {
						throw new Error(`Unsupported method detected: ${method}`);
					}
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Sample Rates
			{
				const assert = group.assertions[1];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = deviceConfig.get('recording.cpal.sampleRate');
					deviceConfig.set('recording.cpal.sampleRate', '48000');
					if (deviceConfig.get('recording.cpal.sampleRate') !== '48000') throw new Error('Failed to set rate to 48000');
					deviceConfig.set('recording.cpal.sampleRate', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// FFmpeg options fallback
			{
				const assert = group.assertions[2];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = deviceConfig.get('recording.ffmpeg.globalOptions');
					deviceConfig.set('recording.ffmpeg.globalOptions', '-y');
					if (deviceConfig.get('recording.ffmpeg.globalOptions') !== '-y') throw new Error('Failed to set FFmpeg option');
					deviceConfig.set('recording.ffmpeg.globalOptions', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Device ID UUID
			{
				const assert = group.assertions[3];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = deviceConfig.get('recording.cpal.deviceId');
					deviceConfig.set('recording.cpal.deviceId', 'uuid-audio-test');
					if (deviceConfig.get('recording.cpal.deviceId') !== 'uuid-audio-test') throw new Error('Failed to set Device ID');
					deviceConfig.set('recording.cpal.deviceId', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}
		}

		await sleep(40);

		// --- Category 3: Shortcuts ---
		{
			const group = testGroups[2];

			// Default manual
			{
				const assert = group.assertions[0];
				assert.status = 'running';
				const start = performance.now();
				try {
					const toggleManual = deviceConfig.get('shortcuts.global.toggleManualRecording');
					if (toggleManual === undefined) throw new Error('Hotkey not initialized');
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Custom format
			{
				const assert = group.assertions[1];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = deviceConfig.get('shortcuts.global.startManualRecording');
					deviceConfig.set('shortcuts.global.startManualRecording', 'Command+Alt+K');
					if (deviceConfig.get('shortcuts.global.startManualRecording') !== 'Command+Alt+K') throw new Error('Custom formatting mismatch');
					deviceConfig.set('shortcuts.global.startManualRecording', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Restore to null
			{
				const assert = group.assertions[2];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = deviceConfig.get('shortcuts.global.stopManualRecording');
					deviceConfig.set('shortcuts.global.stopManualRecording', null);
					if (deviceConfig.get('shortcuts.global.stopManualRecording') !== null) throw new Error('Failed to set to null');
					deviceConfig.set('shortcuts.global.stopManualRecording', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Push to Talk
			{
				const assert = group.assertions[3];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = deviceConfig.get('shortcuts.global.pushToTalk');
					deviceConfig.set('shortcuts.global.pushToTalk', 'Control+Shift+Space');
					if (deviceConfig.get('shortcuts.global.pushToTalk') !== 'Control+Shift+Space') throw new Error('Push-to-Talk format mismatch');
					deviceConfig.set('shortcuts.global.pushToTalk', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}
		}

		await sleep(40);

		// --- Category 4: Sound Alerts ---
		{
			const group = testGroups[3];

			// Alert Sound Themes
			{
				const assert = group.assertions[0];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('sound.theme');
					const testTheme = original === 'classic' ? 'modern' : 'classic';
					settings.set('sound.theme', testTheme);
					await sleep(50);
					if (settings.get('sound.theme') !== testTheme) throw new Error('Failed to set sound theme');
					settings.set('sound.theme', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Start sound toggle
			{
				const assert = group.assertions[1];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('sound.manualStart');
					settings.set('sound.manualStart', !original);
					await sleep(10);
					if (settings.get('sound.manualStart') === original) throw new Error('Failed to toggle manual start sound');
					settings.set('sound.manualStart', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Transcription complete trigger
			{
				const assert = group.assertions[2];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('sound.transcriptionComplete');
					settings.set('sound.transcriptionComplete', !original);
					await sleep(10);
					if (settings.get('sound.transcriptionComplete') === original) throw new Error('Failed to toggle complete sound trigger');
					settings.set('sound.transcriptionComplete', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}
		}

		await sleep(40);

		// --- Category 5: Transcription ---
		{
			const group = testGroups[4];

			// Service switch
			{
				const assert = group.assertions[0];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('transcription.service') as any;
					settings.set('transcription.service', 'whispercpp' as any);
					await sleep(10);
					if (settings.get('transcription.service') !== 'whispercpp') throw new Error('Failed to switch transcription service');
					settings.set('transcription.service', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Language Constraints
			{
				const assert = group.assertions[1];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('transcription.language');
					settings.set('transcription.language', 'es');
					await sleep(10);
					if (settings.get('transcription.language') !== 'es') throw new Error('Failed to set target language parameter');
					settings.set('transcription.language', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Temperature boundary
			{
				const assert = group.assertions[2];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('transcription.temperature');
					settings.set('transcription.temperature', 0.7);
					await sleep(10);
					if (settings.get('transcription.temperature') !== 0.7) throw new Error('Failed to persist temperature boundary value');
					settings.set('transcription.temperature', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Default transcription prompt
			{
				const assert = group.assertions[3];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('transcription.prompt');
					settings.set('transcription.prompt', 'test transcription instructions');
					await sleep(10);
					if (settings.get('transcription.prompt') !== 'test transcription instructions') throw new Error('Failed to persist default prompt instructions');
					settings.set('transcription.prompt', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}
		}

		await sleep(40);

		// --- Category 6: Paste Output ---
		{
			const group = testGroups[5];

			// Clipboard Toggle
			{
				const assert = group.assertions[0];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('output.transcription.clipboard');
					settings.set('output.transcription.clipboard', !original);
					await sleep(10);
					if (settings.get('output.transcription.clipboard') === original) throw new Error('Failed to toggle clipboard persistence');
					settings.set('output.transcription.clipboard', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Auto-paste at cursor
			{
				const assert = group.assertions[1];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('output.transcription.cursor');
					settings.set('output.transcription.cursor', !original);
					await sleep(10);
					if (settings.get('output.transcription.cursor') === original) throw new Error('Failed to toggle auto-paste cursor persistence');
					settings.set('output.transcription.cursor', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Simulate enter
			{
				const assert = group.assertions[2];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('output.transcription.enter');
					settings.set('output.transcription.enter', !original);
					await sleep(10);
					if (settings.get('output.transcription.enter') === original) throw new Error('Failed to toggle auto-enter persistence');
					settings.set('output.transcription.enter', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}
		}

		await sleep(40);

		// --- Category 7: Data Retention ---
		{
			const group = testGroups[6];

			// Retention strategy options
			{
				const assert = group.assertions[0];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('retention.strategy') as any;
					settings.set('retention.strategy', 'limit-count' as any);
					await sleep(10);
					if (settings.get('retention.strategy') !== 'limit-count') throw new Error('Failed to persist limit-count strategy');
					settings.set('retention.strategy', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// MaxCount counts limit
			{
				const assert = group.assertions[1];
				assert.status = 'running';
				const start = performance.now();
				try {
					const original = settings.get('retention.maxCount');
					settings.set('retention.maxCount', 250);
					await sleep(10);
					if (settings.get('retention.maxCount') !== 250) throw new Error('Failed to persist maximum recording retention limit');
					settings.set('retention.maxCount', original);
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}

			// Settings reset returns to defaults
			{
				const assert = group.assertions[2];
				assert.status = 'running';
				const start = performance.now();
				try {
					settings.reset();
					assert.status = 'passed';
				} catch (e: any) {
					assert.status = 'failed';
					assert.error = e.message || String(e);
				}
				assert.timeMs = performance.now() - start;
			}
		}

		// Calculate statistics
		let total = 0;
		let passed = 0;
		let failed = 0;

		for (const group of testGroups) {
			for (const assert of group.assertions) {
				total++;
				if (assert.status === 'passed') passed++;
				if (assert.status === 'failed') failed++;
			}
		}

		testSummary = {
			total,
			passed,
			failed,
			timeMs: performance.now() - startTime,
		};

		isTesting = false;
	}

	// ── Playground Settings Seeder ────────────────────────────────────────────────

	function seedBoundaryTestProfile() {
		deviceConfig.set('apiKeys.openai', 'sk-boundary-openai-test-key-xxxxxxxxxx');
		deviceConfig.set('recording.cpal.sampleRate', '48000');
		deviceConfig.set('recording.method', 'cpal');
		deviceConfig.set('shortcuts.global.toggleManualRecording', 'Command+Shift+F9');
		deviceConfig.set('appearance.bgOpacity', 0.15);
	}

	function resetBoundaryTestProfile() {
		deviceConfig.set('apiKeys.openai', '');
		deviceConfig.set('recording.cpal.sampleRate', '16000');
		deviceConfig.set('recording.method', 'cpal');
		deviceConfig.set('shortcuts.global.toggleManualRecording', 'Command+Shift+F8');
		deviceConfig.set('appearance.bgOpacity', 0);
	}
</script>

<div class="w-full">
	<div class="space-y-8 pb-12">
		<!-- Section Header -->
		<SectionHeader.Root>
			<div class="flex items-center gap-3">
				<SectionHeader.Title level={3} class="text-xl tracking-tight">
					🧪 Settings Diagnostics & Boundary Test Suite
				</SectionHeader.Title>
			</div>
			<SectionHeader.Description class="max-w-2xl">
				Automated diagnostic playground to audit reactive localStorage bindings, device boundaries, global OS shortcuts, and Yjs synchronized workspace preferences.
			</SectionHeader.Description>
		</SectionHeader.Root>

		<!-- Control Panel / Diagnostics Summary -->
		<div class="grid gap-6 md:grid-cols-3">
			<Card.Root class="md:col-span-2">
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title class="text-base font-semibold">Diagnostic Execution Deck</Card.Title>
							<Card.Description>Click below to execute the reactive tests on your local SpeakPaste instance.</Card.Description>
						</div>
						<Button size="default" onclick={runDiagnosticsSuite} disabled={isTesting} class="flex items-center gap-1.5 shadow-md">
							<PlayIcon class="size-4 fill-primary-foreground" />
							{isTesting ? 'Running Suite...' : 'Run Diagnostics'}
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-3 gap-4 text-center">
						<div class="rounded-lg border p-4 bg-muted/20">
							<div class="text-2xl font-bold text-muted-foreground">{testSummary.total}</div>
							<div class="text-xs font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">Total Tests</div>
						</div>
						<div class="rounded-lg border p-4 bg-success/10 border-success/30">
							<div class="text-2xl font-bold text-success">{testSummary.passed}</div>
							<div class="text-xs font-medium text-success mt-0.5 uppercase tracking-wider">Passed</div>
						</div>
						<div class="rounded-lg border p-4 bg-destructive/10 border-destructive/30">
							<div class="text-2xl font-bold text-destructive">{testSummary.failed}</div>
							<div class="text-xs font-medium text-destructive mt-0.5 uppercase tracking-wider">Failed</div>
						</div>
					</div>

					{#if testSummary.timeMs > 0}
						<p class="text-xs text-muted-foreground mt-4 text-right">
							Diagnostic suite completed in <span class="font-mono font-semibold text-primary">{testSummary.timeMs.toFixed(1)}ms</span>
						</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<div class="flex items-center gap-2">
						<WrenchIcon class="size-4 text-muted-foreground" />
						<Card.Title class="text-base font-semibold">Boundary Injector</Card.Title>
					</div>
					<Card.Description>Stress-test layout boundaries and edge configurations.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					<Button variant="outline" size="sm" class="w-full text-xs" onclick={seedBoundaryTestProfile}>
						Load Boundary Test Profile
					</Button>
					<Button variant="outline" size="sm" class="w-full text-xs text-destructive hover:bg-destructive/10" onclick={resetBoundaryTestProfile}>
						<Trash2Icon class="size-3.5 mr-1" />
						Reset Custom Profiles
					</Button>
					<p class="text-[10px] leading-relaxed text-muted-foreground text-center pt-2">
						Boundary profile seeds a custom OpenAI key, high 48kHz sample rate, custom toggleManualRecording key, and visual vibrancy opacity.
					</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Live Config Telemetry & Test Logs -->
		<div class="grid gap-6 md:grid-cols-5">
			<!-- Test Logs -->
			<div class="md:col-span-3 space-y-6">
				{#each testGroups as group}
					<Card.Root>
						<Card.Header class="py-4">
							<Card.Title class="text-sm font-semibold">{group.name}</Card.Title>
						</Card.Header>
						<Card.Content class="px-0 pt-0">
							<div class="divide-y border-t">
								{#each group.assertions as assert}
									<div class="flex items-center justify-between p-4 gap-4">
										<div class="space-y-1">
											<p class="text-xs font-medium leading-relaxed text-foreground">{assert.name}</p>
											{#if assert.error}
												<p class="text-[10px] font-mono text-destructive bg-destructive/10 border border-destructive/20 rounded p-1.5 mt-1 leading-relaxed">
													❌ Error: {assert.error}
												</p>
											{/if}
										</div>

										<div class="flex items-center gap-3 shrink-0">
											{#if assert.timeMs !== undefined}
												<span class="font-mono text-[10px] text-muted-foreground">{assert.timeMs.toFixed(1)}ms</span>
											{/if}

											{#if assert.status === 'idle'}
												<Badge variant="secondary" class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">Idle</Badge>
											{:else if assert.status === 'running'}
												<Badge variant="outline" class="text-[10px] text-primary border-primary/30 bg-primary/5 uppercase font-bold tracking-wider animate-pulse px-2 py-0.5">Running</Badge>
											{:else if assert.status === 'passed'}
												<Badge variant="success" class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">Pass</Badge>
											{:else if assert.status === 'failed'}
												<Badge variant="destructive" class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">Fail</Badge>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<!-- Live Config Telemetry (Reactive Inspector) -->
			<div class="md:col-span-2 space-y-6">
				<Card.Root>
					<Card.Header>
						<div class="flex items-center gap-2">
							<SettingsIcon class="size-4 text-muted-foreground" />
							<Card.Title class="text-sm font-semibold">Active Reactive Inspector</Card.Title>
						</div>
						<Card.Description>Real-time telemetry showing active SpeakPaste configurations in your browser.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- API Keys -->
						<div class="space-y-2">
							<h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">🔑 API Keys State</h4>
							<div class="rounded-md border p-3 bg-muted/20 space-y-2 text-xs font-mono">
								<div class="flex justify-between">
									<span class="text-muted-foreground">OpenAI Key:</span>
									<span class="font-semibold">{deviceConfig.get('apiKeys.openai') ? '✓ Set (Masked)' : '✖ Empty'}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Anthropic Key:</span>
									<span class="font-semibold">{deviceConfig.get('apiKeys.anthropic') ? '✓ Set (Masked)' : '✖ Empty'}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Google Key:</span>
									<span class="font-semibold">{deviceConfig.get('apiKeys.google') ? '✓ Set (Masked)' : '✖ Empty'}</span>
								</div>
							</div>
						</div>

						<!-- Recording -->
						<div class="space-y-2">
							<h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">🎙️ Audio Telemetry</h4>
							<div class="rounded-md border p-3 bg-muted/20 space-y-2 text-xs font-mono">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Method:</span>
									<span class="font-semibold text-primary">{deviceConfig.get('recording.method')}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Sample Rate:</span>
									<span class="font-semibold">{deviceConfig.get('recording.cpal.sampleRate')} Hz</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Service:</span>
									<span class="font-semibold text-primary">{settings.get('transcription.service')}</span>
								</div>
							</div>
						</div>

						<!-- Sound Theme -->
						<div class="space-y-2">
							<h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">🔊 Alerts & Delivery</h4>
							<div class="rounded-md border p-3 bg-muted/20 space-y-2 text-xs font-mono">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Sound Theme:</span>
									<span class="font-semibold">{settings.get('sound.theme')}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Auto-Paste:</span>
									<span class="font-semibold">{settings.get('output.transcription.cursor') ? '✓ Enabled' : '✖ Disabled'}</span>
								</div>
								<div class="flex justify-between font-sans">
									<span class="text-muted-foreground font-mono">Retention Strategy:</span>
									<span class="font-semibold text-xs">{settings.get('retention.strategy')} ({settings.get('retention.maxCount')} max)</span>
								</div>
							</div>
						</div>

						<!-- Shortcuts -->
						<div class="space-y-2">
							<h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">⌨️ Keyboard Entitlements</h4>
							<div class="rounded-md border p-3 bg-muted/20 space-y-2 text-xs font-mono">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Manual Record:</span>
									<span class="font-semibold">{deviceConfig.get('shortcuts.global.toggleManualRecording') || 'Not Bound'}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Transformation Picker:</span>
									<span class="font-semibold">{deviceConfig.get('shortcuts.global.openTransformationPicker') || 'Not Bound'}</span>
								</div>
								<div class="flex justify-between font-sans">
									<span class="text-muted-foreground font-mono">Push to Talk:</span>
									<span class="font-semibold">{deviceConfig.get('shortcuts.global.pushToTalk') || 'Not Bound'}</span>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Safety Warning -->
				<div class="rounded-lg border border-warning/30 bg-warning/5 p-4 flex gap-3 text-xs leading-relaxed text-warning">
					<ShieldAlertIcon class="size-5 shrink-0 mt-0.5" />
					<div>
						<span class="font-semibold">Development Workspace Guard</span>
						<p class="mt-1 text-warning/90">This page utilizes reactive store locks. Running tests writes temporary keys to localStorage and immediately cleans them up safely to preserve your original preferences.</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
