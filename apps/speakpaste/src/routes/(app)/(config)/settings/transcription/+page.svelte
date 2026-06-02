<script lang="ts">
	import * as Alert from '@epicenter/ui/alert';
	import * as Card from '@epicenter/ui/card';
	import * as Field from '@epicenter/ui/field';
	import { Input } from '@epicenter/ui/input';
	import { Link } from '@epicenter/ui/link';
	import * as Select from '@epicenter/ui/select';
	import { Switch } from '@epicenter/ui/switch';
	import { Textarea } from '@epicenter/ui/textarea';
	import InfoIcon from '@lucide/svelte/icons/info';
	import { CompressionBody } from '$lib/components/settings';
	import LocalModelSelector from '$lib/components/settings/LocalModelSelector.svelte';
	import TranscriptionServiceSelect from '$lib/components/settings/TranscriptionServiceSelect.svelte';
	import { SUPPORTED_LANGUAGES_OPTIONS } from '$lib/constants/languages';
	import { TRANSCRIPTION } from '$lib/constants/transcription';
	import { TRANSCRIPTION_SERVICES } from '$lib/services/transcription/registry';
	import { MOONSHINE_MODELS } from '$lib/services/transcription/local/moonshine';
	import { PARAKEET_MODELS } from '$lib/services/transcription/local/parakeet';
	import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { hasNavigatorLocalTranscriptionIssue } from '../../../_layout-utils/check-ffmpeg';

	const { data } = $props();
	let showAdvancedEngineControls = $state(false);

	/**
	 * Feature capabilities for the currently selected transcription service.
	 * Used to conditionally disable UI fields that aren't supported by the service.
	 */
	const currentServiceCapabilities = $derived(
		TRANSCRIPTION[settings.get('transcription.service')].capabilities,
	);

	const selectedServiceIsLocal = $derived(
		TRANSCRIPTION_SERVICES.some(
			(service) => service.id === settings.get('transcription.service'),
		),
	);

	const outputLanguageLabel = $derived(
		SUPPORTED_LANGUAGES_OPTIONS.find(
			(i) => i.value === settings.get('transcription.language'),
		)?.label,
	);

	$effect(() => {
		if (!selectedServiceIsLocal) settings.set('transcription.service', 'whispercpp');
	});
</script>

<svelte:head> <title>Transcription Settings - SpeakPaste</title> </svelte:head>

<Field.Set>
	<Field.Legend>Transcription</Field.Legend>
	<Field.Description>
		Configure your SpeakPaste transcription preferences.
	</Field.Description>
	<Field.Separator />
	<Field.Group>
		<TranscriptionServiceSelect
			id="selected-transcription-service"
			label="Local Transcription Engine"
			bind:selected={() => settings.get('transcription.service'),
				(selected) =>
					settings.set('transcription.service', selected)}
			description="Only on-device engines are shown. Provider key setup is no longer part of the active product surface."
		/>

		{#if settings.get('transcription.service') === 'whispercpp'}
			<div class="space-y-4">
				<!-- Whisper Model Selector Component -->
				{#if window.__TAURI_INTERNALS__}
					<LocalModelSelector
						models={WHISPER_MODELS}
						title="Whisper Model"
						description="Select a pre-built model or browse for your own. Models run locally for private, offline transcription."
						fileSelectionMode="file"
						fileExtensions={['bin', 'gguf', 'ggml']}
						bind:value={() => deviceConfig.get('transcription.whispercpp.modelPath'),
							(v) => deviceConfig.set('transcription.whispercpp.modelPath', v)}
					>
						{#snippet prebuiltFooter()}
							<Field.Description>
								Models are downloaded from{' '}
								<Link
									href="https://huggingface.co/ggerganov/whisper.cpp"
									target="_blank"
									rel="noopener noreferrer"
								>
									Hugging Face
								</Link>
								{' '}and stored locally in your app data directory. Quantized
								models offer smaller sizes with minimal quality loss.
							</Field.Description>
						{/snippet}

						{#snippet manualInstructions()}
							<div>
								<p class="text-sm font-medium mb-2">
									<span class="text-muted-foreground">Step 1:</span>
									Download a Whisper model
								</p>
								<ul class="ml-6 mt-2 space-y-2 text-sm text-muted-foreground">
									<li class="list-disc">
										Visit the{' '}
										<Link
											href="https://huggingface.co/ggerganov/whisper.cpp/tree/main"
											target="_blank"
											rel="noopener noreferrer"
										>
											model repository
										</Link>
									</li>
									<li class="list-disc">
										Download any model file (e.g., ggml-base.en.bin for
										English-only)
									</li>
									<li class="list-disc">
										Quantized models (q5_0, q8_0) offer smaller sizes with
										minimal quality loss
									</li>
								</ul>
							</div>
						{/snippet}
					</LocalModelSelector>

					{#if hasNavigatorLocalTranscriptionIssue( { isFFmpegInstalled: data.ffmpegInstalled ?? false }, )}
						<Alert.Root class="border-red-500/20 bg-red-500/5">
							<InfoIcon class="size-4 text-red-600 dark:text-red-400" />
							<Alert.Title class="text-red-600 dark:text-red-400">
								Browser API Recording Requires FFmpeg
							</Alert.Title>
							<Alert.Description>
								You're using the Browser API recording method, which produces
								compressed audio that requires FFmpeg for Whisper C++
								transcription.
								<div class="mt-3 space-y-3">
									<div class="text-sm">
										<strong>Option 1:</strong>
										<Link href="/settings/recording"
											>Switch to CPAL recording</Link
										>
										for direct compatibility with local transcription
									</div>
									<div class="text-sm">
										<strong>Option 2:</strong>
										<Link href="/install-ffmpeg">Install FFmpeg</Link>
										to keep using Browser API recording
									</div>
								</div>
							</Alert.Description>
						</Alert.Root>
					{/if}
				{/if}
			</div>
		{:else if settings.get('transcription.service') === 'parakeet'}
			<div class="space-y-4">
				<!-- Parakeet Model Selector Component -->
				{#if window.__TAURI_INTERNALS__}
					<LocalModelSelector
						models={PARAKEET_MODELS}
						title="Parakeet Model"
						description="Parakeet is an NVIDIA NeMo model optimized for fast local transcription. It automatically detects the language and doesn't support manual language selection."
						fileSelectionMode="directory"
						bind:value={() => deviceConfig.get('transcription.parakeet.modelPath'),
						(v) => deviceConfig.set('transcription.parakeet.modelPath', v)}
					>
						{#snippet prebuiltFooter()}
							<Field.Description>
								Models are downloaded from{' '}
								<Link
									href="https://github.com/teachme-ai/speakpaste/releases/tag/models/parakeet-tdt-0.6b-v3-int8"
									target="_blank"
									rel="noopener noreferrer"
								>
									GitHub releases
								</Link>
								{' '}and stored in your app data directory. The pre-packaged
								archive contains the NVIDIA Parakeet model with INT8
								quantization and is extracted after download.
							</Field.Description>
						{/snippet}

						{#snippet manualInstructions()}
							<Card.Root class="bg-muted/50">
								<Card.Content class="p-4">
									<Field.Legend variant="label">
										Getting Parakeet Models
									</Field.Legend>
									<ul class="space-y-2 text-sm text-muted-foreground">
										<li class="flex items-start gap-2">
											<span
												class="mt-0.5 block size-1.5 rounded-full bg-muted-foreground/50"
											></span>
											<span>
												Download pre-built models from the "Pre-built Models"
												tab
											</span>
										</li>
										<li class="flex items-start gap-2">
											<span
												class="mt-0.5 block size-1.5 rounded-full bg-muted-foreground/50"
											></span>
											<span>
												Or download from{' '}
												<Link
													href="https://github.com/NVIDIA/NeMo"
													target="_blank"
													rel="noopener noreferrer"
												>
													NVIDIA NeMo
												</Link>
											</span>
										</li>
										<li class="flex items-start gap-2">
											<span
												class="mt-0.5 block size-1.5 rounded-full bg-muted-foreground/50"
											></span>
											<span>
												Parakeet models are directories containing ONNX files
											</span>
										</li>
									</ul>
								</Card.Content>
							</Card.Root>
						{/snippet}
					</LocalModelSelector>

					{#if hasNavigatorLocalTranscriptionIssue( { isFFmpegInstalled: data.ffmpegInstalled ?? false }, )}
						<Alert.Root class="border-red-500/20 bg-red-500/5">
							<InfoIcon class="size-4 text-red-600 dark:text-red-400" />
							<Alert.Title class="text-red-600 dark:text-red-400">
								Browser API Recording Requires FFmpeg
							</Alert.Title>
							<Alert.Description>
								You're using the Browser API recording method, which produces
								compressed audio that requires FFmpeg for Parakeet
								transcription.
								<div class="mt-3 space-y-3">
									<div class="text-sm">
										<strong>Option 1:</strong>
										<Link href="/settings/recording"
											>Switch to CPAL recording</Link
										>
										for direct compatibility with local transcription
									</div>
									<div class="text-sm">
										<strong>Option 2:</strong>
										<Link href="/install-ffmpeg">Install FFmpeg</Link>
										to keep using Browser API recording
									</div>
								</div>
							</Alert.Description>
						</Alert.Root>
					{/if}
				{/if}
			</div>
		{:else if settings.get('transcription.service') === 'moonshine'}
			<div class="space-y-4">
				<!-- Moonshine Model Selector Component -->
				{#if window.__TAURI_INTERNALS__}
					<LocalModelSelector
						models={MOONSHINE_MODELS}
						title="Moonshine Model"
						description="Moonshine is an efficient ONNX model by UsefulSensors. English-only with fast inference and small model sizes (~30 MB)."
						fileSelectionMode="directory"
						bind:value={() => deviceConfig.get('transcription.moonshine.modelPath'),
						(v) => deviceConfig.set('transcription.moonshine.modelPath', v)}
					>
						{#snippet prebuiltFooter()}
							<Field.Description>
								Models are downloaded from{' '}
								<Link
									href="https://huggingface.co/UsefulSensors/moonshine"
									target="_blank"
									rel="noopener noreferrer"
								>
									Hugging Face
								</Link>
								{' '}and stored in your app data directory. Moonshine uses
								quantized ONNX models for efficient local inference.
							</Field.Description>
						{/snippet}

						{#snippet manualInstructions()}
							<Card.Root class="bg-muted/50">
								<Card.Content class="p-4">
									<Field.Legend variant="label">
										Getting Moonshine Models
									</Field.Legend>
									<ul class="space-y-2 text-sm text-muted-foreground">
										<li class="flex items-start gap-2">
											<span
												class="mt-0.5 block size-1.5 rounded-full bg-muted-foreground/50"
											></span>
											<span>
												Download pre-built models from the "Pre-built Models"
												tab
											</span>
										</li>
										<li class="flex items-start gap-2">
											<span
												class="mt-0.5 block size-1.5 rounded-full bg-muted-foreground/50"
											></span>
											<span>
												Or download from{' '}
												<Link
													href="https://huggingface.co/UsefulSensors/moonshine"
													target="_blank"
													rel="noopener noreferrer"
												>
													UsefulSensors on Hugging Face
												</Link>
											</span>
										</li>
										<li class="flex items-start gap-2">
											<span
												class="mt-0.5 block size-1.5 rounded-full bg-muted-foreground/50"
											></span>
											<span>
												Moonshine models are directories containing ONNX files
												and tokenizer
											</span>
										</li>
									</ul>
									<div
										class="mt-3 rounded border border-amber-500/20 bg-amber-500/5 p-3"
									>
										<p
											class="text-xs font-medium text-amber-600 dark:text-amber-400"
										>
											Directory Naming Requirement
										</p>
										<p class="mt-1 text-xs text-muted-foreground">
											The model directory must be named{' '}
											<code class="rounded bg-muted px-1 py-0.5 font-mono"
												>moonshine-&#123;variant&#125;-&#123;lang&#125;</code
											>
											{' '}(e.g.,
											<code class="rounded bg-muted px-1 py-0.5 font-mono"
												>moonshine-tiny-en</code
											>,
											{' '}
											<code class="rounded bg-muted px-1 py-0.5 font-mono"
												>moonshine-base-en</code
											>). The variant (tiny/base) determines model architecture.
										</p>
									</div>
								</Card.Content>
							</Card.Root>
						{/snippet}
					</LocalModelSelector>

					{#if hasNavigatorLocalTranscriptionIssue( { isFFmpegInstalled: data.ffmpegInstalled ?? false }, )}
						<Alert.Root class="border-red-500/20 bg-red-500/5">
							<InfoIcon class="size-4 text-red-600 dark:text-red-400" />
							<Alert.Title class="text-red-600 dark:text-red-400">
								Browser API Recording Requires FFmpeg
							</Alert.Title>
							<Alert.Description>
								You're using the Browser API recording method, which produces
								compressed audio that requires FFmpeg for Moonshine
								transcription.
								<div class="mt-3 space-y-3">
									<div class="text-sm">
										<strong>Option 1:</strong>
										<Link href="/settings/recording"
											>Switch to CPAL recording</Link
										>
										for direct compatibility with local transcription
									</div>
									<div class="text-sm">
										<strong>Option 2:</strong>
										<Link href="/install-ffmpeg">Install FFmpeg</Link>
										to keep using Browser API recording
									</div>
								</div>
							</Alert.Description>
						</Alert.Root>
					{/if}
				{/if}
			</div>
		{/if}

		<Field.Field orientation="horizontal">
			<Switch
				id="advanced-engine-controls"
				bind:checked={showAdvancedEngineControls}
			/>
			<Field.Content>
				<Field.Label for="advanced-engine-controls">
					Advanced engine controls
				</Field.Label>
				<Field.Description>
					Show audio compression and low-level transcription tuning options.
				</Field.Description>
			</Field.Content>
		</Field.Field>

		{#if showAdvancedEngineControls}
			<CompressionBody />
		{/if}

		<Field.Field>
			<Field.Label for="output-language">Output Language</Field.Label>
			<Select.Root
				type="single"
				bind:value={() => settings.get('transcription.language'),
					(v) => settings.set('transcription.language', v)}
				disabled={!currentServiceCapabilities.supportsLanguage}
			>
				<Select.Trigger id="output-language" class="w-full">
					{outputLanguageLabel ?? 'Select a language'}
				</Select.Trigger>
				<Select.Content>
					{#each SUPPORTED_LANGUAGES_OPTIONS as item}
						<Select.Item value={item.value} label={item.label} />
					{/each}
				</Select.Content>
			</Select.Root>
			{#if !currentServiceCapabilities.supportsLanguage}
				<Field.Description>
					{settings.get('transcription.service') ===
					'moonshine'
						? 'Moonshine is English-only'
						: 'Parakeet automatically detects the language'}
				</Field.Description>
			{/if}
		</Field.Field>

		{#if showAdvancedEngineControls}
			<Field.Field>
				<Field.Label for="temperature">Temperature</Field.Label>
				<Input
					id="temperature"
					type="number"
					min="0"
					max="1"
					step="0.1"
					placeholder="0"
					autocomplete="off"
					disabled={!currentServiceCapabilities.supportsTemperature}
					bind:value={() => settings.get('transcription.temperature'),
						(value) =>
							settings.set('transcription.temperature', Number(value))}
				/>
				<Field.Description>
					{currentServiceCapabilities.supportsTemperature
						? "Controls randomness in the model's output. 0 is focused and deterministic, 1 is more creative."
						: 'Temperature is not supported for local models'}
				</Field.Description>
			</Field.Field>

			<Field.Field>
				<Field.Label for="transcription-prompt">Initial transcription hint</Field.Label>
				<Textarea
					id="transcription-prompt"
					placeholder="e.g., This is an academic lecture about quantum physics with technical terms like eigenvalue"
					disabled={!currentServiceCapabilities.supportsPrompt}
					bind:value={() => settings.get('transcription.prompt'),
						(value) => settings.set('transcription.prompt', value)}
				/>
				<Field.Description>
					{currentServiceCapabilities.supportsPrompt
						? 'Helps the local engine recognize specific terms during transcription.'
						: 'Hints are not supported for Parakeet or Moonshine'}
				</Field.Description>
			</Field.Field>
		{/if}
	</Field.Group>
</Field.Set>
