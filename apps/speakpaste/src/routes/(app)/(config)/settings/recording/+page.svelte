<script lang="ts">
	import * as Alert from '@epicenter/ui/alert';
	import * as Field from '@epicenter/ui/field';
	import * as Select from '@epicenter/ui/select';
	import InfoIcon from '@lucide/svelte/icons/info';
	import {
		LOCAL_PERFORMANCE_PROFILE_OPTIONS,
		RECORDING_MODE_OPTIONS,
	} from '$lib/constants/audio';
	import { IS_LINUX } from '$lib/constants/platform';
	import {
		asDeviceIdentifier,
		type DeviceIdentifier,
	} from '$lib/services/recorder/types';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { SUPPORTED_LANGUAGES_OPTIONS } from '$lib/constants/languages';
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

	const dictationLanguageLabel = $derived(
		SUPPORTED_LANGUAGES_OPTIONS.find(
			(i) => i.value === settings.get('transcription.language'),
		)?.label,
	);

	const selectedPerformanceProfile = $derived(
		LOCAL_PERFORMANCE_PROFILE_OPTIONS.find(
			(o) => o.value === deviceConfig.get('local.performanceProfile'),
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

<svelte:head> <title>Recording Settings - Mynah</title> </svelte:head>

<Field.Set>
	<Field.Legend>Voice Capture</Field.Legend>
	<Field.Description>
		Choose how Mynah listens before running local transcription.
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

		<Field.Field>
			<Field.Label for="dictation-language">Spoken Language</Field.Label>
			<Select.Root
				type="single"
				bind:value={() => settings.get('transcription.language'),
					(v) => {
						if (v) settings.set('transcription.language', v);
					}}
			>
				<Select.Trigger id="dictation-language" class="w-full">
					{dictationLanguageLabel ?? 'English (Default)'}
				</Select.Trigger>
				<Select.Content class="max-h-72">
					{#each SUPPORTED_LANGUAGES_OPTIONS as item}
						<Select.Item value={item.value} label={item.label} />
					{/each}
				</Select.Content>
			</Select.Root>
			<Field.Description>
				Select the language you speak. Mynah is English-first by default, with complete support for Indian and world languages via settings.
			</Field.Description>
		</Field.Field>

		<Field.Field>
			<Field.Label for="translation-mode">Output Mode</Field.Label>
			<Select.Root
				type="single"
				bind:value={() => (settings.get('transcription.translateToEnglish') ? 'translate' : 'transcribe'),
					(v) => {
						settings.set('transcription.translateToEnglish', v === 'translate');
					}}
			>
				<Select.Trigger id="translation-mode" class="w-full">
					{settings.get('transcription.translateToEnglish') ? 'Translate to English' : 'Transcribe in Spoken Language'}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="transcribe" label="Transcribe in Spoken Language (Native script)" />
					<Select.Item value="translate" label="Translate to English (Speak native language → Paste English)" />
				</Select.Content>
			</Select.Root>
			<Field.Description>
				{#if settings.get('transcription.translateToEnglish')}
					Speak in {dictationLanguageLabel ?? 'any supported language'}, and Mynah will translate and paste English text directly into your active app.
				{:else}
					Speak in {dictationLanguageLabel ?? 'any supported language'}, and Mynah will transcribe verbatim in its native script.
				{/if}
			</Field.Description>
		</Field.Field>

		{@const currentWhisperPath = deviceConfig.get('transcription.whispercpp.modelPath')}
		{@const isEnOnly = currentWhisperPath?.includes('.en.') || currentWhisperPath?.endsWith('.en.bin')}
		{@const isNonEnglish = settings.get('transcription.language') !== 'en' && settings.get('transcription.language') !== 'auto'}
		{@const needsMultilingual = isNonEnglish || settings.get('transcription.translateToEnglish')}

		{#if isEnOnly && needsMultilingual}
			<div class="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm text-amber-200 space-y-1">
				<p class="font-semibold flex items-center gap-1.5">
					<span>⚠️ English-only Model Active</span>
				</p>
				<p class="text-xs text-amber-300/90 leading-relaxed">
					Your active model (<code>{currentWhisperPath?.split('/').pop()}</code>) is an English-only model.
					For {dictationLanguageLabel} speech or translation, please activate a <strong>Multilingual</strong> model under Settings &gt; Models.
				</p>
			</div>
		{/if}

		{#if window.__TAURI_INTERNALS__ && settings.get('recording.mode') === 'manual'}
			<div class="rounded-lg border bg-muted/20 p-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="space-y-1">
						<p class="text-sm font-medium">Native Mac capture</p>
						<p class="text-sm text-muted-foreground">
							Mynah uses its native capture engine by default for reliable
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
				<Field.Label for="local-performance-profile">
					Local performance profile
				</Field.Label>
				<Select.Root
					type="single"
					bind:value={() => deviceConfig.get('local.performanceProfile'),
						(selected) => {
							const profile = LOCAL_PERFORMANCE_PROFILE_OPTIONS.find(
								(option) => option.value === selected,
							);
							if (!profile) return;
							deviceConfig.set('local.performanceProfile', profile.value);
							deviceConfig.set('recording.cpal.sampleRate', profile.sampleRate);
						}}
				>
					<Select.Trigger id="local-performance-profile" class="w-full">
						{selectedPerformanceProfile ?? 'Select profile'}
					</Select.Trigger>
					<Select.Content>
						{#each LOCAL_PERFORMANCE_PROFILE_OPTIONS as item}
							<Select.Item value={item.value} label={item.label}>
								<div class="flex flex-col gap-0.5">
									<span class="font-medium">{item.label}</span>
									<span class="text-xs text-muted-foreground">
										{item.description}
									</span>
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<Field.Description>
					Choose how aggressively Mynah should optimize local capture for
					this Mac.
				</Field.Description>
			</Field.Field>

		{/if}
	</Field.Group>
</Field.Set>
