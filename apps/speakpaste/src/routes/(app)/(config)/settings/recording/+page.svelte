<script lang="ts">
	import * as Alert from '@epicenter/ui/alert';
	import { Button } from '@epicenter/ui/button';
	import * as Field from '@epicenter/ui/field';
	import { Link } from '@epicenter/ui/link';
	import * as Select from '@epicenter/ui/select';
	import { Switch } from '@epicenter/ui/switch';
	import InfoIcon from '@lucide/svelte/icons/info';
	import {
		BITRATE_OPTIONS,
		RECORDING_MODE_OPTIONS,
		SAMPLE_RATE_OPTIONS,
	} from '$lib/constants/audio';
	import { IS_LINUX, IS_MACOS, PLATFORM_TYPE } from '$lib/constants/platform';
	import { TRANSCRIPTION_SERVICE_ID_TO_LABEL } from '$lib/constants/transcription';
	import {
		asDeviceIdentifier,
		type DeviceIdentifier,
	} from '$lib/services/recorder/types';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import {
		hasNavigatorLocalTranscriptionIssue,
	} from '../../../_layout-utils/check-ffmpeg';
	import DesktopOutputFolder from './DesktopOutputFolder.svelte';
	import FfmpegCommandBuilder from './FfmpegCommandBuilder.svelte';
	import ManualSelectRecordingDevice from './ManualSelectRecordingDevice.svelte';
	import VadSelectRecordingDevice from './VadSelectRecordingDevice.svelte';

	const { data } = $props();
	let showAdvancedRecordingControls = $state(false);

	const availableRecordingModes = $derived(
		RECORDING_MODE_OPTIONS.filter((mode) => {
			if (window.__TAURI_INTERNALS__ && mode.value === 'vad') return false;
			return true;
		}),
	);

	// Derived labels for select triggers
	const recordingModeLabel = $derived(
		availableRecordingModes.find(
			(o) => o.value === settings.get('recording.mode'),
		)?.label,
	);

	const sampleRateLabel = $derived(
		SAMPLE_RATE_OPTIONS.find(
			(o) => o.value === deviceConfig.get('recording.cpal.sampleRate'),
		)?.label,
	);

	const bitrateLabel = $derived(
		BITRATE_OPTIONS.find(
			(o) => o.value === deviceConfig.get('recording.navigator.bitrateKbps'),
		)?.label,
	);

	const RECORDING_METHOD_OPTIONS = [
		{
			value: 'cpal',
			label: 'Native Mac Capture',
			description: IS_MACOS
				? 'Recommended for Intel and Apple Silicon Macs. Reliable with global shortcuts and direct local transcription.'
				: 'Recommended native capture path. Reliable with shortcuts and direct local transcription.',
		},
		{
			value: 'ffmpeg',
			label: 'Command-line Capture',
			description: {
				macos:
					'Troubleshooting path for unusual audio devices and custom capture commands.',
				linux:
					'Troubleshooting path for unusual audio devices and custom capture commands.',
				windows:
					'Troubleshooting path for unusual audio devices and custom capture commands.',
				android:
					'Troubleshooting path for unusual audio devices and custom capture commands.',
				ios: 'Troubleshooting path for unusual audio devices and custom capture commands.',
			}[PLATFORM_TYPE],
		},
		{
			value: 'navigator',
			label: 'Compatibility Capture',
			description: IS_MACOS
				? 'Fallback capture path for web-style environments. Not recommended for background Mac dictation.'
				: 'Fallback capture path for web-style environments.',
		},
	];

	const recordingMethodLabel = $derived(
		RECORDING_METHOD_OPTIONS.find(
			(o) => o.value === deviceConfig.get('recording.method'),
		)?.label,
	);

	const isUsingNavigatorMethod = $derived(
		!window.__TAURI_INTERNALS__ ||
			deviceConfig.get('recording.method') === 'navigator',
	);

	const isUsingFfmpegMethod = $derived(
		deviceConfig.get('recording.method') === 'ffmpeg',
	);

	$effect(() => {
		if (!window.__TAURI_INTERNALS__) return;
		if (!IS_MACOS) return;
		if (settings.get('recording.mode') !== 'manual') return;
		if (showAdvancedRecordingControls) return;
		if (deviceConfig.get('recording.method') !== 'cpal') {
			deviceConfig.set('recording.method', 'cpal');
		}
	});

	function getManualDeviceId(method: 'cpal' | 'navigator' | 'ffmpeg') {
		switch (method) {
			case 'cpal':
				return deviceConfig.get('recording.cpal.deviceId');
			case 'navigator':
				return deviceConfig.get('recording.navigator.deviceId');
			case 'ffmpeg':
				return deviceConfig.get('recording.ffmpeg.deviceId');
		}
	}

	function setManualDeviceId(
		method: 'cpal' | 'navigator' | 'ffmpeg',
		selected: DeviceIdentifier | null,
	) {
		switch (method) {
			case 'cpal':
				deviceConfig.set('recording.cpal.deviceId', selected);
				break;
			case 'navigator':
				deviceConfig.set('recording.navigator.deviceId', selected);
				break;
			case 'ffmpeg':
				deviceConfig.set('recording.ffmpeg.deviceId', selected);
				break;
		}
	}
</script>

<svelte:head> <title>Recording Settings - SpeakPaste</title> </svelte:head>

<Field.Set>
	<Field.Legend>Voice Capture</Field.Legend>
	<Field.Description>
		Choose how SpeakPaste listens before running local transcription.
	</Field.Description>
	<Field.Separator />
	<Field.Group>
		<Field.Field>
			<Field.Label for="recording-mode">Recording Mode</Field.Label>
			<Select.Root
				type="single"
				bind:value={() => settings.get('recording.mode'),
					(selected) => {
						if (selected) settings.set('recording.mode', selected);
					}}
			>
				<Select.Trigger id="recording-mode" class="w-full">
					{recordingModeLabel ?? 'Select a recording mode'}
				</Select.Trigger>
				<Select.Content>
					{#each availableRecordingModes as item}
						<Select.Item value={item.value} label={item.label} />
					{/each}
				</Select.Content>
			</Select.Root>
			<Field.Description>
				Choose how you want to activate recording:
				{availableRecordingModes.map(
					(option) => option.label.toLowerCase(),
				).join(', ')}
			</Field.Description>
		</Field.Field>

		{#if window.__TAURI_INTERNALS__ && settings.get('recording.mode') === 'manual'}
			<div class="rounded-lg border bg-muted/20 p-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="space-y-1">
						<p class="text-sm font-medium">Native Mac capture</p>
						<p class="text-sm text-muted-foreground">
							SpeakPaste uses its native capture engine by default for reliable
							global shortcuts and direct local transcription.
						</p>
					</div>
					<div class="text-sm font-medium text-muted-foreground">
						{recordingMethodLabel ?? 'Native Mac Capture'}
					</div>
				</div>
			</div>

			<Field.Field orientation="horizontal">
				<Switch
					id="advanced-recording-controls"
					bind:checked={showAdvancedRecordingControls}
				/>
				<Field.Content>
					<Field.Label for="advanced-recording-controls">
						Advanced recording controls
					</Field.Label>
					<Field.Description>
						Show compatibility capture engines and command-line options for
						device troubleshooting.
					</Field.Description>
				</Field.Content>
			</Field.Field>

			{#if showAdvancedRecordingControls}
				<Field.Field>
					<Field.Label for="recording-method">Capture engine</Field.Label>
				<Select.Root
					type="single"
					bind:value={() => deviceConfig.get('recording.method'),
						(selected) => {
							if (selected)
							deviceConfig.set(
									'recording.method',
									selected as 'cpal' | 'navigator' | 'ffmpeg',
								);
						}}
				>
					<Select.Trigger id="recording-method" class="w-full">
						{recordingMethodLabel ?? 'Select a capture engine'}
					</Select.Trigger>
					<Select.Content>
						{#each RECORDING_METHOD_OPTIONS as item}
							<Select.Item value={item.value} label={item.label}>
								<div class="flex flex-col gap-0.5">
									<div class="font-medium">{item.label}</div>
									{#if item.description}
										<div class="text-xs text-muted-foreground">
											{item.description}
										</div>
									{/if}
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
					<Field.Description>
						{RECORDING_METHOD_OPTIONS.find(
						(option) => option.value === deviceConfig.get('recording.method'),
						)?.description}
					</Field.Description>
				</Field.Field>
			{/if}

			{#if showAdvancedRecordingControls && IS_MACOS && deviceConfig.get('recording.method') === 'navigator'}
				<Alert.Root class="border-warning/20 bg-warning/5">
					<InfoIcon class="size-4 text-warning dark:text-warning" />
					<Alert.Title class="text-warning dark:text-warning">
						Global Shortcuts May Be Unreliable
					</Alert.Title>
					<Alert.Description>
						When using Compatibility Capture, macOS App Nap may prevent
						recording from starting when not in focus. Consider using Native
						Mac Capture for reliable global shortcut support.
					</Alert.Description>
				</Alert.Root>
			{/if}

			{#if showAdvancedRecordingControls && deviceConfig.get('recording.method') === 'ffmpeg' && !data.ffmpegInstalled}
				<Alert.Root class="border-red-500/20 bg-red-500/5">
					<InfoIcon class="size-4 text-red-600 dark:text-red-400" />
					<Alert.Title class="text-red-600 dark:text-red-400">
						FFmpeg Not Installed
					</Alert.Title>
					<Alert.Description>
						Command-line Capture requires FFmpeg. Please install it to use this
						feature.
						<Link
							href="/install-ffmpeg"
							class="font-medium underline underline-offset-4 hover:text-red-700 dark:hover:text-red-300"
						>
							Install FFmpeg
						</Link>
					</Alert.Description>
				</Alert.Root>
			{/if}

			{#if showAdvancedRecordingControls && hasNavigatorLocalTranscriptionIssue( { isFFmpegInstalled: data.ffmpegInstalled ?? false }, )}
				<Alert.Root class="border-red-500/20 bg-red-500/5">
					<InfoIcon class="size-4 text-red-600 dark:text-red-400" />
					<Alert.Title class="text-red-600 dark:text-red-400">
						Local Transcription Requires FFmpeg or Native Mac Capture
					</Alert.Title>
					<Alert.Description>
						Compatibility Capture produces compressed audio that
						requires FFmpeg for local transcription with
						{TRANSCRIPTION_SERVICE_ID_TO_LABEL[
							settings.get('transcription.service')
						]}.
						<div class="mt-3 space-y-3">
							<div class="flex items-center gap-2">
								<span class="text-sm"><strong>Option 1:</strong></span>
								<Button
									onclick={() => deviceConfig.set('recording.method', 'cpal')}
									variant="secondary"
									size="sm"
								>
									Use Native Mac Capture
								</Button>
							</div>
							<div class="text-sm">
								<strong>Option 2:</strong>
								<Link href="/install-ffmpeg">Install FFmpeg</Link>
								to keep using Compatibility Capture
							</div>
						</div>
					</Alert.Description>
				</Alert.Root>
			{/if}
		{/if}

		{#if settings.get('recording.mode') === 'manual'}
			{@const method = deviceConfig.get('recording.method')}
			<ManualSelectRecordingDevice
				bind:selected={() => {
					const selected = getManualDeviceId(method);
					return selected ? asDeviceIdentifier(selected) : null;
					},
					(selected) => setManualDeviceId(method, selected)}
			/>
		{:else if settings.get('recording.mode') === 'vad'}
			{#if IS_LINUX}
				<Alert.Root class="border-red-500/20 bg-red-500/5">
					<InfoIcon class="size-4 text-red-600 dark:text-red-400" />
					<Alert.Title class="text-red-600 dark:text-red-400">
						VAD Mode Not Supported on Linux
					</Alert.Title>
					<Alert.Description>
						Hands-free mode requires web-style voice detection, which is not
						fully supported in Tauri on Linux. Device enumeration and
						recording will fail. Please use Press to Speak instead.
						<Link
							href="https://github.com/teachme-ai/speakpaste/issues/839"
							target="_blank"
							class="font-medium underline underline-offset-4 hover:text-red-700 dark:hover:text-red-300"
						>
							Learn more
						</Link>
					</Alert.Description>
				</Alert.Root>
			{:else}
				<Alert.Root class="border-blue-500/20 bg-blue-500/5">
					<InfoIcon class="size-4 text-blue-600 dark:text-blue-400" />
					<Alert.Title class="text-blue-600 dark:text-blue-400">
						Hands-free Mode Paused
					</Alert.Title>
					<Alert.Description>
						Hands-free capture has no wake word or explicit arming flow yet, so
						it is paused on the Mac app to prevent accidental paste. Use Press
						to Speak for the current launch surface.
					</Alert.Description>
				</Alert.Root>
			{/if}

			<VadSelectRecordingDevice
				bind:selected={() => {
					const selected = deviceConfig.get('recording.navigator.deviceId');
					return selected ? asDeviceIdentifier(selected) : null;
					},
					(selected) =>
						deviceConfig.set('recording.navigator.deviceId', selected)}
			/>
		{/if}

		{#if settings.get('recording.mode') === 'manual' || settings.get('recording.mode') === 'vad'}
			{#if showAdvancedRecordingControls && isUsingNavigatorMethod}
				<!-- Browser method settings -->
				<Field.Field>
					<Field.Label for="bit-rate">Bitrate</Field.Label>
					<Select.Root
						type="single"
						bind:value={() => deviceConfig.get('recording.navigator.bitrateKbps'),
							(selected) => {
								if (selected)
							deviceConfig.set(
										'recording.navigator.bitrateKbps',
										selected,
									);
							}}
					>
						<Select.Trigger id="bit-rate" class="w-full">
							{bitrateLabel ?? 'Select a bitrate'}
						</Select.Trigger>
						<Select.Content>
							{#each BITRATE_OPTIONS as item}
								<Select.Item value={item.value} label={item.label} />
							{/each}
						</Select.Content>
					</Select.Root>
					<Field.Description>
						The bitrate of the recording. Higher values mean better quality but
						larger file sizes.
					</Field.Description>
				</Field.Field>
			{:else if showAdvancedRecordingControls && isUsingFfmpegMethod}
				<!-- FFmpeg method settings -->
				<Field.Field>
					<Field.Label for="output-folder">Recording Output Folder</Field.Label>
					<DesktopOutputFolder></DesktopOutputFolder>
					<Field.Description>
						Choose where to save your recordings. Default location is secure and
						managed by the app.
					</Field.Description>
				</Field.Field>

				<FfmpegCommandBuilder
					bind:globalOptions={() => deviceConfig.get('recording.ffmpeg.globalOptions'),
						(v) => deviceConfig.set('recording.ffmpeg.globalOptions', v)}
					bind:inputOptions={() => deviceConfig.get('recording.ffmpeg.inputOptions'),
						(v) => deviceConfig.set('recording.ffmpeg.inputOptions', v)}
					bind:outputOptions={() => deviceConfig.get('recording.ffmpeg.outputOptions'),
						(v) => deviceConfig.set('recording.ffmpeg.outputOptions', v)}
				/>
			{:else}
				<!-- CPAL method settings -->
				<Field.Field>
					<Field.Label for="sample-rate">Native sample rate</Field.Label>
					<Select.Root
						type="single"
						bind:value={() => deviceConfig.get('recording.cpal.sampleRate'),
							(selected) => {
								if (selected)
							deviceConfig.set('recording.cpal.sampleRate', selected);
							}}
					>
						<Select.Trigger id="sample-rate" class="w-full">
							{sampleRateLabel ?? 'Select sample rate'}
						</Select.Trigger>
						<Select.Content>
							{#each SAMPLE_RATE_OPTIONS as item}
								<Select.Item value={item.value} label={item.label} />
							{/each}
						</Select.Content>
					</Select.Root>
					<Field.Description>
						16 kHz is recommended for fast local speech-to-text.
					</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="output-folder">Recording Output Folder</Field.Label>
					<DesktopOutputFolder></DesktopOutputFolder>
					<Field.Description>
						Choose where to save your recordings. Default location is secure and
						managed by the app.
					</Field.Description>
				</Field.Field>
			{/if}
		{/if}
	</Field.Group>
</Field.Set>
