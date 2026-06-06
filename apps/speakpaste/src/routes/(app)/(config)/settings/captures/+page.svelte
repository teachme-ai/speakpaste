<script lang="ts">
	import { Button } from '@epicenter/ui/button';
	import { confirmationDialog } from '@epicenter/ui/confirmation-dialog';
	import * as Field from '@epicenter/ui/field';
	import * as Select from '@epicenter/ui/select';
	import OpenFolderButton from '$lib/components/OpenFolderButton.svelte';
	import { PATHS } from '$lib/constants/paths';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { recordings } from '$lib/state/recordings.svelte';
	import { settings } from '$lib/state/settings.svelte';

	const retentionItems = [
		{ value: 'keep-forever', label: 'Keep all captures' },
		{ value: 'limit-count', label: 'Keep a limited history' },
	];

	const maxRecordingItems = [
		{ value: 0, label: 'Keep no history' },
		{ value: 5, label: 'Last 5 captures' },
		{ value: 10, label: 'Last 10 captures' },
		{ value: 25, label: 'Last 25 captures' },
		{ value: 50, label: 'Last 50 captures' },
		{ value: 100, label: 'Last 100 captures' },
	];

	const retentionLabel = $derived(
		retentionItems.find((i) => i.value === settings.get('retention.strategy'))
			?.label,
	);

	const maxRecordingLabel = $derived(
		maxRecordingItems.find(
			(i) => i.value === settings.get('retention.maxCount'),
		)?.label,
	);

	async function getCapturesFolder() {
		return deviceConfig.get('recording.cpal.outputFolder') ?? PATHS.DB.RECORDINGS();
	}

	function clearHistory() {
		confirmationDialog.open({
			title: 'Clear captures',
			description:
				'This removes saved capture records from the local history view. Continue?',
			confirm: { text: 'Clear captures', variant: 'destructive' },
			onConfirm: () => {
				const ids = recordings.sorted.map((recording) => recording.id);
				ids.forEach((id) => recordings.delete(id));
			},
		});
	}
</script>

<svelte:head> <title>Captures - Mynah</title> </svelte:head>

<Field.Set>
	<Field.Legend>Captures</Field.Legend>
	<Field.Description>
		Manage saved recordings and transcripts that stay on this Mac.
	</Field.Description>
	<Field.Separator />

	<Field.Group>
		<div class="grid gap-3 sm:grid-cols-2">
			<a
				href="/recordings"
				class="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
			>
				<p class="text-xs font-medium uppercase text-muted-foreground">
					Saved captures
				</p>
				<p class="mt-2 text-base font-semibold">
					{recordings.sorted.length} saved
				</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Review transcripts and audio from prior dictations.
				</p>
			</a>

			<div class="rounded-lg border bg-muted/20 p-4">
				<p class="text-xs font-medium uppercase text-muted-foreground">
					Local folder
				</p>
				<p class="mt-2 text-base font-semibold">Captures folder</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Open the folder where local capture files are stored.
				</p>
				<div class="mt-3">
					<OpenFolderButton
						getFolderPath={getCapturesFolder}
						tooltipText="Open captures folder"
						variant="default"
					/>
				</div>
			</div>
		</div>

		<Field.Field>
			<Field.Label for="recording-retention-strategy">Retention</Field.Label>
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
			<Field.Description>
				Choose whether Mynah keeps all capture records or trims history.
			</Field.Description>
		</Field.Field>

		{#if settings.get('retention.strategy') === 'limit-count'}
			<Field.Field>
				<Field.Label for="max-recording-count">Maximum saved captures</Field.Label>
				<Select.Root
					type="single"
					bind:value={() => String(settings.get('retention.maxCount')),
						(v) => settings.set('retention.maxCount', Number(v))}
				>
					<Select.Trigger id="max-recording-count" class="w-full">
						{maxRecordingLabel ?? 'Select maximum captures'}
					</Select.Trigger>
					<Select.Content>
						{#each maxRecordingItems as item}
							<Select.Item value={String(item.value)} label={item.label} />
						{/each}
					</Select.Content>
				</Select.Root>
			</Field.Field>
		{/if}

		<Field.Field>
			<Field.Label>Clear history</Field.Label>
			<Field.Description>
				Use this only when you want to remove all saved capture records from
				the app history.
			</Field.Description>
			<div>
				<Button
					variant="destructive"
					onclick={clearHistory}
					disabled={recordings.sorted.length === 0}
				>
					Clear captures
				</Button>
			</div>
		</Field.Field>
	</Field.Group>
</Field.Set>
