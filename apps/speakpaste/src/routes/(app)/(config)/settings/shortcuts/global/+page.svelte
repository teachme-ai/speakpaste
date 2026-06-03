<script lang="ts">
	import * as Empty from '@epicenter/ui/empty';
	import * as Field from '@epicenter/ui/field';
	import * as SectionHeader from '@epicenter/ui/section-header';
	import { Separator } from '@epicenter/ui/separator';
	import Layers2Icon from '@lucide/svelte/icons/layers-2';
	import ShortcutTable from '../keyboard-shortcut-recorder/ShortcutTable.svelte';
</script>

<svelte:head> <title>Dictation Trigger - SpeakPaste</title> </svelte:head>

{#if window.__TAURI_INTERNALS__}
	<section>
		<SectionHeader.Root>
			<SectionHeader.Title level={2} class="text-xl tracking-tight sm:text-2xl">
				Dictation Trigger
			</SectionHeader.Title>
			<SectionHeader.Description>
				Press and hold the Fn key to dictate, then release to paste. Keep one
				fallback keyboard shortcut only if you want an alternative.
			</SectionHeader.Description>
		</SectionHeader.Root>

		<Separator class="my-6" />

		<div class="space-y-6">
			<Field.Set>
				<Field.Group>
					<Field.Field>
						<Field.Label>Primary trigger</Field.Label>
						<div class="rounded-lg border bg-muted/20 p-4">
							<p class="text-base font-semibold">Fn key</p>
							<p class="mt-1 text-sm text-muted-foreground">
								Hold Fn to record. Release Fn to transcribe locally and paste.
							</p>
						</div>
						<Field.Description>
							This native Mac listener works from the menu-bar app after
							Accessibility permission is granted.
						</Field.Description>
					</Field.Field>
				</Field.Group>
			</Field.Set>

			<Field.Set>
				<Field.Legend>Fallback keyboard shortcut</Field.Legend>
				<Field.Description>
					Optional. Use this if you prefer a normal keyboard shortcut instead
					of the Fn key.
				</Field.Description>
				<Field.Separator />
				<ShortcutTable
					commandIds={['toggleManualRecording']}
					showSearch={false}
				/>
			</Field.Set>
		</div>
	</section>
{:else}
	<Empty.Root>
		<Empty.Header>
			<Empty.Media>
				<Layers2Icon class="size-10 text-muted-foreground" />
			</Empty.Media>
			<Empty.Title>Shortcuts</Empty.Title>
			<Empty.Description>
				Open the Mac app to configure Fn and fallback keyboard shortcuts.
			</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{/if}
