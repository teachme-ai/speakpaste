<script lang="ts">
	import { Button } from '@epicenter/ui/button';
	import * as Field from '@epicenter/ui/field';
	import * as Select from '@epicenter/ui/select';
	import { Switch } from '@epicenter/ui/switch';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import {
		LOCAL_PERFORMANCE_PROFILE_OPTIONS,
		RECORDING_MODE_OPTIONS,
	} from '$lib/constants/audio';
	import {
		TRANSCRIPTION_SERVICE_ID_TO_LABEL,
		TRANSCRIPTION_SERVICE_OPTIONS,
	} from '$lib/constants/transcription';
	import { ALWAYS_ON_TOP_MODE_OPTIONS } from '$lib/constants/ui';
	import { rpc } from '$lib/query';
	import { desktopRpc } from '$lib/query/desktop';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';

	const retentionItems = [
		{ value: 'keep-forever', label: 'Keep all recordings' },
		{ value: 'limit-count', label: 'Keep a limited history' },
	];

	const maxRecordingItems = [
		{ value: 0, label: 'Do not save recordings' },
		{ value: 5, label: '5 recordings' },
		{ value: 10, label: '10 recordings' },
		{ value: 25, label: '25 recordings' },
		{ value: 50, label: '50 recordings' },
		{ value: 100, label: '100 recordings' },
	];

	const availableRecordingModes = $derived(
		RECORDING_MODE_OPTIONS.filter((mode) => {
			if (window.__TAURI_INTERNALS__ && mode.value === 'vad') return false;
			return true;
		}),
	);

	const selectedRecordingMode = $derived(
		availableRecordingModes.find(
			(mode) => mode.value === settings.get('recording.mode'),
		),
	);

	const selectedEngineLabel = $derived(
		TRANSCRIPTION_SERVICE_ID_TO_LABEL[settings.get('transcription.service')],
	);

	const selectedPerformanceProfile = $derived(
		LOCAL_PERFORMANCE_PROFILE_OPTIONS.find(
			(profile) => profile.value === deviceConfig.get('local.performanceProfile'),
		),
	);

	const selectedModelPath = $derived.by(() => {
		switch (settings.get('transcription.service')) {
			case 'whispercpp':
				return deviceConfig.get('transcription.whispercpp.modelPath');
			case 'parakeet':
				return deviceConfig.get('transcription.parakeet.modelPath');
			case 'moonshine':
				return deviceConfig.get('transcription.moonshine.modelPath');
		}
	});

	const selectedModelState = $derived(
		selectedModelPath ? 'Model configured' : 'Model path needed',
	);

	const globalShortcut = $derived(
		deviceConfig.get('shortcuts.global.toggleManualRecording') ?? 'Not set',
	);

	const retentionLabel = $derived(
		retentionItems.find((i) => i.value === settings.get('retention.strategy'))
			?.label,
	);

	const maxRecordingLabel = $derived(
		maxRecordingItems.find(
			(i) => i.value === settings.get('retention.maxCount'),
		)?.label,
	);

	const alwaysOnTopLabel = $derived(
		ALWAYS_ON_TOP_MODE_OPTIONS.find(
			(i) => i.value === settings.get('ui.alwaysOnTop'),
		)?.label,
	);

	const autostartQuery = createQuery(
		() => desktopRpc.autostart.isEnabled.options,
	);
	const enableAutostartMutation = createMutation(
		() => desktopRpc.autostart.enable.options,
	);
	const disableAutostartMutation = createMutation(
		() => desktopRpc.autostart.disable.options,
	);
</script>

<svelte:head> <title>Control Center - SpeakPaste</title> </svelte:head>

<div class="space-y-8">
	<Field.Set>
		<Field.Legend>Control Center</Field.Legend>
		<Field.Description>
			The launch surface for local voice typing: speak, transcribe on this Mac,
			and place text where you are already writing.
		</Field.Description>
		<Field.Separator />

		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<a
				href="/settings/recording"
				class="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
			>
				<p class="text-xs font-medium uppercase text-muted-foreground">
					Voice capture
				</p>
				<p class="mt-2 text-base font-semibold">{selectedRecordingMode?.label}</p>
				<p class="mt-1 text-sm text-muted-foreground">
					{selectedPerformanceProfile?.label ?? 'Balanced'}
				</p>
			</a>
			<a
				href="/settings/transcription"
				class="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
			>
				<p class="text-xs font-medium uppercase text-muted-foreground">
					Local engine
				</p>
				<p class="mt-2 text-base font-semibold">{selectedEngineLabel}</p>
				<p class="mt-1 text-sm text-muted-foreground">{selectedModelState}</p>
			</a>
			<a
				href="/settings/shortcuts/global"
				class="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
			>
				<p class="text-xs font-medium uppercase text-muted-foreground">
					Main shortcut
				</p>
				<p class="mt-2 text-base font-semibold">{globalShortcut}</p>
				<p class="mt-1 text-sm text-muted-foreground">Toggle recording</p>
			</a>
			<a
				href="/settings/analytics"
				class="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
			>
				<p class="text-xs font-medium uppercase text-muted-foreground">
					Privacy
				</p>
				<p class="mt-2 text-base font-semibold">Device-only</p>
				<p class="mt-1 text-sm text-muted-foreground">Local diagnostics</p>
			</a>
		</div>
	</Field.Set>

	<Field.Set>
		<Field.Legend>Primary Flow</Field.Legend>
		<Field.Description>
			These are the settings most users need before they start speaking.
		</Field.Description>
		<Field.Separator />
		<Field.Group>
			<Field.Field>
				<Field.Label for="recording-mode">Voice capture</Field.Label>
				<Select.Root
					type="single"
					bind:value={() => settings.get('recording.mode'),
						(v) => {
							const selected = availableRecordingModes.find((mode) => mode.value === v);
							if (selected) settings.set('recording.mode', selected.value);
						}}
				>
					<Select.Trigger id="recording-mode" class="w-full">
					{selectedRecordingMode?.label ?? 'Select recording mode'}
				</Select.Trigger>
				<Select.Content>
					{#each availableRecordingModes as mode}
						<Select.Item value={mode.value} label={`${mode.icon} ${mode.label}`} />
					{/each}
				</Select.Content>
				</Select.Root>
			</Field.Field>

			<Field.Field>
				<Field.Label for="transcription-service">Local engine</Field.Label>
				<Select.Root
					type="single"
					bind:value={() => settings.get('transcription.service'),
						(v) => {
							if (v in TRANSCRIPTION_SERVICE_ID_TO_LABEL) {
								settings.set('transcription.service', v);
							}
						}}
				>
					<Select.Trigger id="transcription-service" class="w-full">
						{selectedEngineLabel ?? 'Select local engine'}
					</Select.Trigger>
					<Select.Content>
						{#each TRANSCRIPTION_SERVICE_OPTIONS as option}
							<Select.Item value={option.value} label={option.label} />
						{/each}
					</Select.Content>
				</Select.Root>
				<Field.Description>
					{selectedModelState}. Manage model files in Local Engine.
				</Field.Description>
			</Field.Field>

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
						{selectedPerformanceProfile?.label ?? 'Select profile'}
					</Select.Trigger>
					<Select.Content>
						{#each LOCAL_PERFORMANCE_PROFILE_OPTIONS as profile}
							<Select.Item value={profile.value} label={profile.label}>
								<div class="flex flex-col gap-0.5">
									<span class="font-medium">{profile.label}</span>
									<span class="text-xs text-muted-foreground">
										{profile.description}
									</span>
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<Field.Description>
					Profile tuning is local and changes native capture behavior on this Mac.
				</Field.Description>
			</Field.Field>

			<div class="grid gap-3 sm:grid-cols-2">
				<Field.Field orientation="horizontal">
					<Switch
						id="transcription.writeToCursorOnSuccess"
						bind:checked={() => settings.get('output.transcription.cursor'),
							(v) => settings.set('output.transcription.cursor', v)}
					/>
					<Field.Content>
						<Field.Label for="transcription.writeToCursorOnSuccess">
							Paste at cursor
						</Field.Label>
						<Field.Description>
							Place transcribed text directly in the active app.
						</Field.Description>
					</Field.Content>
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Switch
						id="transcription.copyToClipboardOnSuccess"
						bind:checked={() => settings.get('output.transcription.clipboard'),
							(v) => settings.set('output.transcription.clipboard', v)}
					/>
					<Field.Content>
						<Field.Label for="transcription.copyToClipboardOnSuccess">
							Copy to clipboard
						</Field.Label>
						<Field.Description>
							Keep the latest transcript ready to paste.
						</Field.Description>
					</Field.Content>
				</Field.Field>
			</div>

			{#if window.__TAURI_INTERNALS__ && settings.get('output.transcription.cursor')}
				<Field.Field orientation="horizontal">
					<Switch
						id="transcription.simulateEnterAfterOutput"
						bind:checked={() => settings.get('output.transcription.enter'),
							(v) => settings.set('output.transcription.enter', v)}
					/>
					<Field.Content>
						<Field.Label for="transcription.simulateEnterAfterOutput">
							Press Enter after paste
						</Field.Label>
						<Field.Description>
							Useful for chat boxes where Enter sends the message.
						</Field.Description>
					</Field.Content>
				</Field.Field>
			{/if}
		</Field.Group>
	</Field.Set>

	<Field.Set>
		<Field.Legend>Local History</Field.Legend>
		<Field.Description>
			Control what the app keeps on this Mac after transcription.
		</Field.Description>
		<Field.Separator />
		<Field.Group>
			<Field.Field>
				<Field.Label for="recording-retention-strategy">Saved recordings</Field.Label>
				<Select.Root
					type="single"
					bind:value={() => settings.get('retention.strategy'),
						(v) => settings.set('retention.strategy', v)}
				>
					<Select.Trigger id="recording-retention-strategy" class="w-full">
						{retentionLabel ?? 'Select retention strategy'}
					</Select.Trigger>
					<Select.Content>
						{#each retentionItems as item}
							<Select.Item value={item.value} label={item.label} />
						{/each}
					</Select.Content>
				</Select.Root>
			</Field.Field>

			{#if settings.get('retention.strategy') === 'limit-count'}
				<Field.Field>
					<Field.Label for="max-recording-count">
						Maximum saved recordings
					</Field.Label>
					<Select.Root
						type="single"
						bind:value={() => String(settings.get('retention.maxCount')),
							(v) => settings.set('retention.maxCount', Number(v))}
					>
						<Select.Trigger id="max-recording-count" class="w-full">
							{maxRecordingLabel ?? 'Select maximum recordings'}
						</Select.Trigger>
						<Select.Content>
							{#each maxRecordingItems as item}
								<Select.Item value={String(item.value)} label={item.label} />
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>
			{/if}
		</Field.Group>
	</Field.Set>

	{#if window.__TAURI_INTERNALS__}
		<Field.Set>
			<Field.Legend>Mac Behavior</Field.Legend>
			<Field.Description>
				Small desktop behaviors that make SpeakPaste feel native.
			</Field.Description>
			<Field.Separator />
			<Field.Group>
				<Field.Field orientation="horizontal">
					<Field.Content>
						<Field.Label for="autostart">Launch at login</Field.Label>
						<Field.Description>
							Open SpeakPaste automatically when you log in.
						</Field.Description>
					</Field.Content>
					<Switch
						id="autostart"
						checked={autostartQuery.data ?? false}
						onCheckedChange={(checked: boolean) => {
							if (checked) {
								enableAutostartMutation.mutate(undefined, {
									onError: (error) => rpc.notify.error(error),
								});
							} else {
								disableAutostartMutation.mutate(undefined, {
									onError: (error) => rpc.notify.error(error),
								});
							}
						}}
						disabled={autostartQuery.isPending ||
							enableAutostartMutation.isPending ||
							disableAutostartMutation.isPending}
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="always-on-top">Window priority</Field.Label>
					<Select.Root
						type="single"
						bind:value={() => settings.get('ui.alwaysOnTop'),
							(v) => settings.set('ui.alwaysOnTop', v)}
					>
						<Select.Trigger id="always-on-top" class="w-full">
							{alwaysOnTopLabel ?? 'Select always on top mode'}
						</Select.Trigger>
						<Select.Content>
							{#each ALWAYS_ON_TOP_MODE_OPTIONS as item}
								<Select.Item value={item.value} label={item.label} />
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>
			</Field.Group>
		</Field.Set>
	{/if}

	<div class="flex flex-wrap gap-2">
		<Button href="/settings/transcription" variant="outline">Manage models</Button>
		<Button href="/settings/shortcuts/global" variant="outline">Edit shortcut</Button>
		<Button href="/settings/sound" variant="outline">Sound cues</Button>
		<Button href="/settings/analytics" variant="outline">Local diagnostics</Button>
		<Button href="/settings/local-technology" variant="ghost">Technology</Button>
	</div>
</div>
