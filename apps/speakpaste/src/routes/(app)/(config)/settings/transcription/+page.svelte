<script lang="ts">
	import * as Card from '@epicenter/ui/card';
	import * as Field from '@epicenter/ui/field';
	import { Link } from '@epicenter/ui/link';
	import * as Select from '@epicenter/ui/select';
	import LocalModelSelector from '$lib/components/settings/LocalModelSelector.svelte';
	import TranscriptionServiceSelect from '$lib/components/settings/TranscriptionServiceSelect.svelte';
	import { SUPPORTED_LANGUAGES_OPTIONS } from '$lib/constants/languages';
	import { TRANSCRIPTION } from '$lib/constants/transcription';
	import { TRANSCRIPTION_SERVICES } from '$lib/services/transcription/registry';
	import { PARAKEET_MODELS } from '$lib/services/transcription/local/parakeet';
	import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';

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

	const dictationLanguageLabel = $derived(
		SUPPORTED_LANGUAGES_OPTIONS.find(
			(i) => i.value === settings.get('transcription.language'),
		)?.label,
	);

	$effect(() => {
		if (!selectedServiceIsLocal) settings.set('transcription.service', 'whispercpp');
	});
</script>

<svelte:head> <title>Local Engine & Models - Mynah</title> </svelte:head>

<Field.Set>
	<Field.Legend>Local Engine & Models</Field.Legend>
	<Field.Description>
		Choose the local engine and model files Mynah uses on this Mac.
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
										<strong>For Indian & Multilingual:</strong> Download <code>ggml-base.bin</code> or <code>ggml-small.bin</code> (without <code>.en</code>)
									</li>
									<li class="list-disc">
										<strong>For English-only:</strong> Download <code>ggml-base.en.bin</code> or <code>ggml-small.en.bin</code>
									</li>
								</ul>
							</div>
						{/snippet}
					</LocalModelSelector>

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
									href="https://github.com/teachme-ai/mynah/releases/tag/models/parakeet-tdt-0.6b-v3-int8"
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

				{/if}
			</div>
		{/if}

		<Field.Separator />

		<Field.Field>
			<Field.Label for="dictation-language">Spoken Language</Field.Label>
			<Select.Root
				type="single"
				bind:value={() => settings.get('transcription.language'),
					(v) => {
						if (v) settings.set('transcription.language', v);
					}}
				disabled={!currentServiceCapabilities.supportsLanguage}
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
			{#if !currentServiceCapabilities.supportsLanguage}
				<Field.Description>
					Parakeet is optimized for English transcription. Switch to Whisper for multilingual dictation.
				</Field.Description>
			{:else}
				<Field.Description>
					Select the language you speak. Mynah is English-first by default, with complete support for Indian and world languages via settings.
				</Field.Description>
			{/if}
		</Field.Field>

		{#if currentServiceCapabilities.supportsLanguage}
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
						For {dictationLanguageLabel} speech or translation, please select and activate a <strong>Multilingual</strong> model above (Base, Better, or Large v3 Turbo).
					</p>
				</div>
			{/if}
		{/if}
	</Field.Group>
</Field.Set>
