<script lang="ts">
	import * as Alert from '@epicenter/ui/alert';
	import * as Field from '@epicenter/ui/field';
	import * as Select from '@epicenter/ui/select';
	import InfoIcon from '@lucide/svelte/icons/info';
	import {
		RECORDING_MODE_OPTIONS,
		SAMPLE_RATE_OPTIONS,
	} from '$lib/constants/audio';
	import { IS_LINUX } from '$lib/constants/platform';
	import {
		asDeviceIdentifier,
		type DeviceIdentifier,
	} from '$lib/services/recorder/types';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import DesktopOutputFolder from './DesktopOutputFolder.svelte';
	import ManualSelectRecordingDevice from './ManualSelectRecordingDevice.svelte';

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

	$effect(() => {
		if (!window.__TAURI_INTERNALS__) return;
		if (deviceConfig.get('recording.method') !== 'cpal') {
			deviceConfig.set('recording.method', 'cpal');
		}
	});

	function setManualDeviceId(selected: DeviceIdentifier | null) {
		deviceConfig.set('recording.cpal.deviceId', selected);
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
						Native Mac Capture
					</div>
				</div>
			</div>
		{/if}

		{#if settings.get('recording.mode') === 'manual'}
			<ManualSelectRecordingDevice
				bind:selected={() => {
					const selected = deviceConfig.get('recording.cpal.deviceId');
					return selected ? asDeviceIdentifier(selected) : null;
					},
					(selected) => setManualDeviceId(selected)}
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
		{/if}

		{#if settings.get('recording.mode') === 'manual' || settings.get('recording.mode') === 'vad'}
			<Field.Field>
				<Field.Label for="sample-rate">Native sample rate</Field.Label>
				<Select.Root
					type="single"
					bind:value={() => deviceConfig.get('recording.cpal.sampleRate'),
						(selected) => {
							if (selected) deviceConfig.set('recording.cpal.sampleRate', selected);
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
	</Field.Group>
</Field.Set>
