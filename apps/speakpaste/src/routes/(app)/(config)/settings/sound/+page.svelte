<script lang="ts">
	import * as Field from '@epicenter/ui/field';
	import { Switch } from '@epicenter/ui/switch';
	import { settings } from '$lib/state/settings.svelte';
</script>

<svelte:head> <title>Sound Settings - SpeakPaste</title> </svelte:head>

<Field.Set>
	<Field.Legend>Sound</Field.Legend>
	<Field.Description>
		Configure your SpeakPaste sound preferences.
	</Field.Description>
	<Field.Separator />
	<Field.Group>
		<Field.Set>
			<Field.Legend variant="label">Sound Theme</Field.Legend>
			<Field.Description>
				Select the audio style used for key triggers and events.
			</Field.Description>
			<div class="grid grid-cols-3 gap-3 mt-2">
				{#each [
					{ id: 'classic', title: 'Classic Chime', desc: 'Mechanical alarm clock clicks and beeps' },
					{ id: 'modern', title: 'Modern Haptic', desc: 'Short, clean mechanical blips and clicks' },
					{ id: 'scifi', title: 'Futuristic Sci-Fi', desc: 'Bright bell chimes and synth success notes' }
				] as theme}
					<button
						type="button"
						class="flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 bg-white shadow-sm
							{settings.get('sound.theme') === theme.id 
								? 'border-blue-500 ring-2 ring-blue-500/20' 
								: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
						onclick={() => settings.set('sound.theme', theme.id)}
					>
						<span class="text-sm font-semibold text-gray-800">{theme.title}</span>
						<span class="text-xs text-gray-500 mt-1 leading-normal">{theme.desc}</span>
					</button>
				{/each}
			</div>
		</Field.Set>

		<Field.Separator />

		<Field.Set>
			<Field.Legend variant="label">Press to Speak Sounds</Field.Legend>
			<Field.Description>
				Configure sounds for the normal recording flow.
			</Field.Description>
			<Field.Group>
				<Field.Field orientation="horizontal">
					<Switch
						id="sound.playOn.manual-start"
						bind:checked={() => settings.get('sound.manualStart'),
							(v) => settings.set('sound.manualStart', v)}
					/>
					<Field.Label for="sound.playOn.manual-start">
						Play sound when recording starts
					</Field.Label>
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Switch
						id="sound.playOn.manual-stop"
						bind:checked={() => settings.get('sound.manualStop'),
							(v) => settings.set('sound.manualStop', v)}
					/>
					<Field.Label for="sound.playOn.manual-stop">
						Play sound when recording stops
					</Field.Label>
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Switch
						id="sound.playOn.manual-cancel"
						bind:checked={() => settings.get('sound.manualCancel'),
							(v) => settings.set('sound.manualCancel', v)}
					/>
					<Field.Label for="sound.playOn.manual-cancel">
						Play sound when recording is canceled
					</Field.Label>
				</Field.Field>
			</Field.Group>
		</Field.Set>

		<Field.Separator />

		<Field.Set>
			<Field.Legend variant="label">Completion Sounds</Field.Legend>
			<Field.Description>
				Configure sounds for transcription and transformation completion.
			</Field.Description>
			<Field.Group>
				<Field.Field orientation="horizontal">
					<Switch
						id="play-sound-transcription"
						bind:checked={() => settings.get('sound.transcriptionComplete'),
							(v) => settings.set('sound.transcriptionComplete', v)}
					/>
					<Field.Label for="play-sound-transcription">
						Play sound after transcription
					</Field.Label>
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Switch
						id="play-sound-transformation"
						bind:checked={() => settings.get('sound.transformationComplete'),
							(v) => settings.set('sound.transformationComplete', v)}
					/>
					<Field.Label for="play-sound-transformation">
						Play sound after transformation
					</Field.Label>
				</Field.Field>
			</Field.Group>
		</Field.Set>
	</Field.Group>
</Field.Set>
