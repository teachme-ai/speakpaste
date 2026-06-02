<script lang="ts">
	import * as Accordion from '@epicenter/ui/accordion';
	import * as Alert from '@epicenter/ui/alert';
	import { Button } from '@epicenter/ui/button';
	import * as Card from '@epicenter/ui/card';
	import * as Field from '@epicenter/ui/field';
	import { Input } from '@epicenter/ui/input';
	import * as SectionHeader from '@epicenter/ui/section-header';
	import * as Select from '@epicenter/ui/select';
	import { Separator } from '@epicenter/ui/separator';
	import { Switch } from '@epicenter/ui/switch';
	import { Textarea } from '@epicenter/ui/textarea';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { nanoid } from 'nanoid/non-secure';
	import { slide } from 'svelte/transition';
	import { TRANSFORMATION_STEP_TYPE_OPTIONS } from '$lib/constants/database';
	import { generateDefaultStep } from '$lib/state/transformation-steps.svelte';
	import type { Transformation, TransformationStep } from '$lib/workspace';

	// Derived labels for select triggers
	const stepTypeLabel = (type: string) =>
		TRANSFORMATION_STEP_TYPE_OPTIONS.find((o) => o.value === type)?.label;

	let {
		transformation = $bindable(),
		steps = $bindable(),
	}: {
		transformation: Transformation;
		steps: TransformationStep[];
	} = $props();

	/** Update a single field on a step by index. */
	function updateStep(index: number, patch: Partial<TransformationStep>) {
		steps = steps.map((s, i) => (i === index ? { ...s, ...patch } : s));
	}

	function addStep() {
		steps = [
			...steps,
			generateDefaultStep({
				transformationId: transformation.id,
				order: steps.length,
			}),
		];
	}

	function removeStep(index: number) {
		steps = steps.filter((_, i) => i !== index);
	}

	function duplicateStep(index: number) {
		const stepToDuplicate = steps[index];
		if (!stepToDuplicate) return;
		steps = [
			...steps.slice(0, index + 1),
			{ ...stepToDuplicate, id: nanoid() },
			...steps.slice(index + 1),
		];
	}
</script>

<div class="flex flex-col gap-6 overflow-y-auto h-full px-2">
	<SectionHeader.Root>
		<SectionHeader.Title>Configuration</SectionHeader.Title>
		<SectionHeader.Description>
			Configure the title, description, and steps for how your transformation
			will process your text
		</SectionHeader.Description>
	</SectionHeader.Root>

	<Separator />

	<section class="space-y-4">
		<Field.Field>
			<Field.Label for="title">Title</Field.Label>
			<Input
				id="title"
				value={transformation.title}
				oninput={(e) => {
					transformation = {
						...transformation,
						title: e.currentTarget.value,
					};
				}}
				placeholder="e.g., Format Meeting Notes"
			/>
			<Field.Description>
				A clear, concise name that describes what this transformation does
			</Field.Description>
		</Field.Field>
		<Field.Field>
			<Field.Label for="description">Description</Field.Label>
			<Textarea
				id="description"
				value={transformation.description}
				oninput={(e) => {
					transformation = {
						...transformation,
						description: e.currentTarget.value,
					};
				}}
				placeholder="e.g., Converts meeting transcripts into bullet points and highlights action items"
			/>
			<Field.Description>
				Describe what this transformation does, its purpose, and how it will be
				used
			</Field.Description>
		</Field.Field>
	</section>

	<Separator />

	<section class="space-y-6">
		<h3 class="font-medium">Processing Steps</h3>
		{#if steps.length === 0}
			<Alert.Root variant="warning">
				<Alert.Title>Add your first processing step</Alert.Title>
				<Alert.Description>
					Each step will process your transcribed text in sequence. Start by
					adding a step below to define how your text should be transformed.
				</Alert.Description>
			</Alert.Root>
		{/if}

		<div class="space-y-4">
			{#each steps as step, index (index)}
				<div
					class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm"
					transition:slide
				>
					<Card.Header class="space-y-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<Card.Title class="text-xl"> Step {index + 1}: </Card.Title>
								<Select.Root
									type="single"
									bind:value={() => step.type,
										(value) => {
											if (value) {
												updateStep(index, { type: value });
											}
										}}
								>
									<Select.Trigger id="step-type" class="h-8">
										{stepTypeLabel(step.type) ?? 'Select a step type'}
									</Select.Trigger>
									<Select.Content>
										{#each TRANSFORMATION_STEP_TYPE_OPTIONS as item}
											<Select.Item value={item.value} label={item.label} />
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							<div class="flex items-center gap-2">
								<Button
									tooltip="Duplicate step"
									variant="ghost"
									size="icon"
									class="size-8"
									onclick={() => duplicateStep(index)}
								>
									<CopyIcon class="size-4" />
								</Button>
								<Button
									tooltip="Delete step"
									variant="ghost"
									size="icon"
									class="size-8"
									onclick={() => removeStep(index)}
								>
									<TrashIcon class="size-4" />
								</Button>
							</div>
						</div>
						{#if step.type === 'prompt_transform'}
							<Card.Description>Retired prompt step</Card.Description>
						{/if}
					</Card.Header>
					<Card.Content>
						{#if step.type === 'find_replace'}
							<div class="space-y-6">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Field.Field>
										<Field.Label for="findText">Find Text</Field.Label>
										<Input
											id="findText"
											value={step.findText}
											oninput={(e) => {
												updateStep(index, { findText: e.currentTarget.value });
											}}
											placeholder="Text or pattern to search for in the transcript"
										/>
									</Field.Field>
									<Field.Field>
										<Field.Label for="replaceText">Replace Text</Field.Label>
										<Input
											id="replaceText"
											value={step.replaceText}
											oninput={(e) => {
												updateStep(index, { replaceText: e.currentTarget.value });
											}}
											placeholder="Text to use as the replacement"
										/>
									</Field.Field>
								</div>
								<Accordion.Root type="single" class="w-full">
									<Accordion.Item class="border-none" value="advanced">
										<Accordion.Trigger class="text-sm">
											Advanced Options
										</Accordion.Trigger>
										<Accordion.Content>
											<Field.Field orientation="horizontal">
												<Switch
													id="useRegex"
													checked={step.useRegex}
													onCheckedChange={(v) => {
														updateStep(index, { useRegex: v });
													}}
												/>
												<Field.Content>
													<Field.Label for="useRegex">Use Regex</Field.Label>
													<Field.Description>
														Enable advanced pattern matching using regular
														expressions (for power users)
													</Field.Description>
												</Field.Content>
											</Field.Field>
										</Accordion.Content>
									</Accordion.Item>
								</Accordion.Root>
							</div>
						{:else if step.type === 'prompt_transform'}
							<Alert.Root variant="warning">
								<Alert.Title>Prompt steps are retired</Alert.Title>
								<Alert.Description>
									This step used a remote rewrite provider in the old build.
									Replace it with a find/replace step now; local writing modes
									will be introduced separately.
								</Alert.Description>
							</Alert.Root>
						{/if}
					</Card.Content>
				</div>
			{/each}
		</div>

		<Button
			onclick={addStep}
			variant={steps.length === 0 ? 'default' : 'outline'}
			class="w-full"
		>
			<PlusIcon class="size-4" />
			{steps.length === 0
				? 'Add Your First Step'
				: 'Add Another Step'}
		</Button>
	</section>
</div>
