<script lang="ts">
	import { Input } from '@epicenter/ui/input';
	import * as Table from '@epicenter/ui/table';
	import Search from '@lucide/svelte/icons/search';
	import { commands } from '$lib/commands';
	import { rpc } from '$lib/query';
	import {
		type DeviceConfigKey,
		deviceConfig,
	} from '$lib/state/device-config.svelte';
	import { createPressedKeys } from '$lib/utils/createPressedKeys.svelte';
	import GlobalKeyboardShortcutRecorder from './GlobalKeyboardShortcutRecorder.svelte';

	let {
		commandIds,
		showSearch = true,
	}: {
		commandIds?: readonly string[];
		showSearch?: boolean;
	} = $props();

	let searchQuery = $state('');

	/** Look up the definition default for a shortcut key from the correct store. */
	function getDefaultShortcut(commandId: string): string | null {
		return deviceConfig.getDefault(
			`shortcuts.global.${commandId}` as DeviceConfigKey,
		);
	}

	const filteredCommands = $derived(
		commands.filter((command) =>
			(!commandIds || commandIds.includes(command.id)) &&
			command.title.toLowerCase().includes(searchQuery.toLowerCase()),
		),
	);

	const pressedKeys = createPressedKeys({
		onUnsupportedKey: (key) => {
			rpc.notify.warning({
				title: 'Unsupported key',
				description: `The key "${key}" is not supported. Please try a different key.`,
			});
		},
	});
</script>

<div class="space-y-4">
	{#if showSearch}
		<!-- Search input -->
		<div class="relative">
			<Search
				class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="search"
				placeholder="Search commands..."
				class="pl-10"
				bind:value={searchQuery}
			/>
		</div>
	{/if}

	<!-- Command list with shortcuts -->
	<div class="overflow-x-auto rounded-lg border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="min-w-[150px]">Command</Table.Head>
					<Table.Head class="text-right min-w-[200px]">Shortcut</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredCommands as command}
					{@const defaultShortcut = getDefaultShortcut(command.id)}
					<Table.Row>
						<Table.Cell class="font-medium">
							<span class="block truncate pr-2">{command.title}</span>
						</Table.Cell>
						<Table.Cell class="text-right">
							<GlobalKeyboardShortcutRecorder
								{command}
								placeholder={defaultShortcut
									? `Default: ${defaultShortcut}`
									: 'Set shortcut'}
								{pressedKeys}
							/>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
