<script lang="ts">
	import { Button } from '@epicenter/ui/button';
	import { useCombobox } from '@epicenter/ui/hooks';
	import * as Popover from '@epicenter/ui/popover';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import { createMutation } from '@tanstack/svelte-query';
	import { nanoid } from 'nanoid/non-secure';
	import { goto } from '$app/navigation';
	import TransformationPickerBody from '$lib/components/TransformationPickerBody.svelte';
	import { rpc } from '$lib/query';

	const combobox = useCombobox();

	const transformRecording = createMutation(
		() => rpc.transformer.transformRecording.options,
	);

	let { recordingId }: { recordingId: string } = $props();
</script>

<Popover.Root bind:open={combobox.open}>
	<Popover.Trigger bind:ref={combobox.triggerRef}>
		{#snippet child({ props })}
			<Button
				{...props}
				tooltip="Run a local text rule on this recording"
				role="combobox"
				aria-expanded={combobox.open}
				variant="ghost"
				size="icon"
			>
				<LayersIcon class="size-4" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-80 max-w-xl p-0">
		<TransformationPickerBody
			onSelect={(transformation) => {
				combobox.closeAndFocusTrigger();

				const toastId = nanoid();
				rpc.notify.loading({
					id: toastId,
					title: 'Running text rule...',
					description:
						'Applying your selected local text rule to the transcript.',
				});

				transformRecording.mutate(
					{ recordingId, transformation },
					{
						onError: (error) => rpc.notify.error(error),
						onSuccess: (transformationRun) => {
							if (transformationRun.status === 'failed') {
								rpc.notify.error({
									title: 'Text rule error',
									description: transformationRun.error,
									action: {
										type: 'more-details',
										error: transformationRun.error,
									},
								});
								return;
							}

							rpc.sound.playSoundIfEnabled('transformationComplete');

							rpc.delivery.deliverTransformationResult({
								text: transformationRun.output,
								toastId,
							});
						},
					},
				);
			}}
			onSelectManageTransformations={() => {
				combobox.closeAndFocusTrigger();
				goto('/transformations');
			}}
			placeholder="Select local text rule..."
		/>
	</Popover.Content>
</Popover.Root>
