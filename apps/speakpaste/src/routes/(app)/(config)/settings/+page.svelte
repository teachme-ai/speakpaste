<script lang="ts">
	import * as Select from '@epicenter/ui/select';
	import { Switch } from '@epicenter/ui/switch';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { TRANSCRIPTION_CLIPBOARD_BEHAVIOR_OPTIONS } from '$lib/constants/output';
	import { rpc } from '$lib/query';
	import { desktopRpc } from '$lib/query/desktop';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';

	const selectedClipboardBehavior = $derived(
		TRANSCRIPTION_CLIPBOARD_BEHAVIOR_OPTIONS.find(
			(option) =>
				option.value === settings.get('output.transcription.clipboardBehavior'),
		),
	);

	const fallbackShortcut = $derived(
		deviceConfig.get('shortcuts.global.toggleManualRecording') ?? 'Not set',
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

	const THEME_OPTIONS = [
		{ value: 'pastel', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'mynah', label: 'Mynah Blue' },
	];
	const selectedThemeLabel = $derived(
		THEME_OPTIONS.find((t) => t.value === settings.get('ui.theme'))?.label ?? 'Light',
	);
</script>

<svelte:head> <title>Settings - Mynah</title> </svelte:head>

<div class="space-y-6">
	<section class="mac-settings-section">
		<div class="mac-settings-section-header">
			<h2 class="text-lg font-semibold tracking-tight">General</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				The everyday preferences for using Mynah on this Mac.
			</p>
		</div>

		<a href="/settings/shortcuts/global" class="mac-settings-row mac-settings-row-action">
			<div>
				<p class="font-medium">Dictation trigger</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Use the Fn key, with a configurable fallback shortcut.
				</p>
			</div>
			<div class="justify-self-end text-right text-sm font-medium text-muted-foreground">
				Fn key · {fallbackShortcut}
			</div>
		</a>

		<a href="/settings/recording" class="mac-settings-row mac-settings-row-action">
			<div>
				<p class="font-medium">Dictation</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Choose microphone and capture behavior.
				</p>
			</div>
			<div class="justify-self-end text-sm font-medium text-muted-foreground">
				Open…
			</div>
		</a>

		<a href="/settings/transcription" class="mac-settings-row mac-settings-row-action">
			<div>
				<p class="font-medium">Models</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Manage local model files and transcription engine details.
				</p>
			</div>
			<div class="justify-self-end text-sm font-medium text-muted-foreground">
				Open…
			</div>
		</a>
	</section>

	<section class="mac-settings-section">
		<div class="mac-settings-section-header">
			<h2 class="text-lg font-semibold tracking-tight">Output</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Control where dictated text goes after transcription.
			</p>
		</div>

		<div class="mac-settings-row">
			<div>
				<label class="font-medium" for="transcription.writeToCursorOnSuccess">
					Paste at cursor
				</label>
				<p class="mt-1 text-sm text-muted-foreground">
					Place text directly in the active app.
				</p>
			</div>
			<Switch
				id="transcription.writeToCursorOnSuccess"
				bind:checked={() => settings.get('output.transcription.cursor'),
					(v) => settings.set('output.transcription.cursor', v)}
			/>
		</div>

		<div class="mac-settings-row">
			<div>
				<label class="font-medium" for="transcription-clipboard-behavior">
					Clipboard
				</label>
				<p class="mt-1 text-sm text-muted-foreground">
					Choose what happens to existing clipboard text.
				</p>
			</div>
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
				<Select.Trigger id="transcription-clipboard-behavior" class="w-52 justify-between">
					{selectedClipboardBehavior?.label ?? 'Select behavior'}
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
		</div>

		{#if window.__TAURI_INTERNALS__ && settings.get('output.transcription.cursor')}
			<div class="mac-settings-row">
				<div>
					<label class="font-medium" for="transcription.simulateEnterAfterOutput">
						Press Return after paste
					</label>
					<p class="mt-1 text-sm text-muted-foreground">
						Useful in chat fields where Return sends the message.
					</p>
				</div>
				<Switch
					id="transcription.simulateEnterAfterOutput"
					bind:checked={() => settings.get('output.transcription.enter'),
						(v) => settings.set('output.transcription.enter', v)}
				/>
			</div>
		{/if}
	</section>

	{#if window.__TAURI_INTERNALS__}
		<section class="mac-settings-section">
			<div class="mac-settings-section-header">
				<h2 class="text-lg font-semibold tracking-tight">Mac Behavior</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Small app-level behaviors for the desktop experience.
				</p>
			</div>

			<div class="mac-settings-row">
				<div>
					<label class="font-medium" for="autostart">Launch at login</label>
					<p class="mt-1 text-sm text-muted-foreground">
						Open Mynah automatically when you log in.
					</p>
				</div>
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
			</div>

			<div class="mac-settings-row">
				<div>
					<label class="font-medium" for="ui-theme">Appearance</label>
					<p class="mt-1 text-sm text-muted-foreground">
						Use a system-neutral or Mynah-branded theme.
					</p>
				</div>
				<Select.Root
					type="single"
					bind:value={() => settings.get('ui.theme'),
						(v) => settings.set('ui.theme', v)}
				>
					<Select.Trigger id="ui-theme" class="w-52 justify-between">
						{selectedThemeLabel}
					</Select.Trigger>
					<Select.Content>
						{#each THEME_OPTIONS as item}
							<Select.Item value={item.value} label={item.label} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</section>
	{/if}
</div>
