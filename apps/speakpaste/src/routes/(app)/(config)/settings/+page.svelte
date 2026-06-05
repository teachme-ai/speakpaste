<script lang="ts">
	import * as Field from '@epicenter/ui/field';
	import * as Select from '@epicenter/ui/select';
	import { Switch } from '@epicenter/ui/switch';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { LOCAL_PERFORMANCE_PROFILE_OPTIONS } from '$lib/constants/audio';
	import { TRANSCRIPTION_CLIPBOARD_BEHAVIOR_OPTIONS } from '$lib/constants/output';
	import {
		TRANSCRIPTION_SERVICE_ID_TO_LABEL,
		TRANSCRIPTION_SERVICE_OPTIONS,
	} from '$lib/constants/transcription';
	import { ALWAYS_ON_TOP_MODE_OPTIONS } from '$lib/constants/ui';
	import { rpc } from '$lib/query';
	import { desktopRpc } from '$lib/query/desktop';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';

	const selectedEngineLabel = $derived(
		TRANSCRIPTION_SERVICE_ID_TO_LABEL[settings.get('transcription.service')],
	);

	const selectedPerformanceProfile = $derived(
		LOCAL_PERFORMANCE_PROFILE_OPTIONS.find(
			(profile) => profile.value === deviceConfig.get('local.performanceProfile'),
		),
	);

	const selectedClipboardBehavior = $derived(
		TRANSCRIPTION_CLIPBOARD_BEHAVIOR_OPTIONS.find(
			(option) =>
				option.value === settings.get('output.transcription.clipboardBehavior'),
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

	const fallbackShortcut = $derived(
		deviceConfig.get('shortcuts.global.toggleManualRecording') ?? 'Not set',
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
					Voice
				</p>
				<p class="mt-2 text-base font-semibold">Press to Speak</p>
				<p class="mt-1 text-sm text-muted-foreground">
					{selectedPerformanceProfile?.label ?? 'Balanced'}
				</p>
			</a>
			<a
				href="/settings/transcription"
				class="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
			>
				<p class="text-xs font-medium uppercase text-muted-foreground">
					Models
				</p>
				<p class="mt-2 text-base font-semibold">{selectedEngineLabel}</p>
				<p class="mt-1 text-sm text-muted-foreground">{selectedModelState}</p>
			</a>
			<a
				href="/settings/shortcuts/global"
				class="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
			>
				<p class="text-xs font-medium uppercase text-muted-foreground">
					Trigger
				</p>
				<p class="mt-2 text-base font-semibold">Fn key</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Fallback: {fallbackShortcut}
				</p>
			</a>
			<a
				href="/settings/sound"
				class="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
			>
				<p class="text-xs font-medium uppercase text-muted-foreground">
					Sound
				</p>
				<p class="mt-2 text-base font-semibold">Cues</p>
				<p class="mt-1 text-sm text-muted-foreground">Theme and toggles</p>
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
				<Field.Label for="transcription-service">Engine & models</Field.Label>
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
					{selectedModelState}. Manage model files in Models.
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
			</div>

			<Field.Field>
				<Field.Label for="transcription-clipboard-behavior">
					Clipboard after dictation
				</Field.Label>
				<Select.Root
					type="single"
					bind:value={() => settings.get('output.transcription.clipboardBehavior'),
						(selected) => {
							const behavior = TRANSCRIPTION_CLIPBOARD_BEHAVIOR_OPTIONS.find(
								(option) => option.value === selected,
							);
							if (!behavior) return;
							settings.set('output.transcription.clipboardBehavior', behavior.value);
							settings.set(
								'output.transcription.clipboard',
								behavior.value !== 'preserve',
							);
						}}
				>
					<Select.Trigger id="transcription-clipboard-behavior" class="w-full">
						{selectedClipboardBehavior?.label ?? 'Select clipboard behavior'}
					</Select.Trigger>
					<Select.Content>
						{#each TRANSCRIPTION_CLIPBOARD_BEHAVIOR_OPTIONS as behavior}
							<Select.Item value={behavior.value} label={behavior.label}>
								<div class="flex flex-col gap-0.5">
									<span class="font-medium">{behavior.label}</span>
									<span class="text-xs text-muted-foreground">
										{behavior.description}
									</span>
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<Field.Description>
					Default asks before replacing existing clipboard text. Preserve keeps
					your clipboard untouched; replace leaves the transcript copied.
				</Field.Description>
			</Field.Field>

			{#if window.__TAURI_INTERNALS__ && settings.get('output.transcription.cursor')}
				<Field.Field orientation="horizontal">
					<Switch
						id="transcription.simulateEnterAfterOutput"
						bind:checked={() => settings.get('output.transcription.enter'),
							(v) => settings.set('output.transcription.enter', v)}
					/>
					<Field.Content>
						<Field.Label for="transcription.simulateEnterAfterOutput">
							Auto-Send (Return key)
						</Field.Label>
						<Field.Description>
							Useful for chat boxes where Enter sends the message.
						</Field.Description>
					</Field.Content>
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

</div>
