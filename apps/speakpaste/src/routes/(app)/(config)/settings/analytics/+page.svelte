<script lang="ts">
	import { Badge } from '@epicenter/ui/badge';
	import * as Card from '@epicenter/ui/card';
	import * as SectionHeader from '@epicenter/ui/section-header';
</script>

<div class="space-y-8">
	<SectionHeader.Root>
		<div class="flex items-center gap-3">
			<SectionHeader.Title level={3} class="text-xl tracking-tight">
				Local Analytics
			</SectionHeader.Title>
			<Badge
				variant="outline"
				class="text-xs text-green-700 dark:text-green-400 border-green-200 dark:border-green-400/30"
			>
				Device only
			</Badge>
		</div>
		<SectionHeader.Description class="max-w-2xl">
			SpeakPaste keeps analytics on the Mac and limits them to operational
			signals that help the app stay fast and predictable.
		</SectionHeader.Description>
	</SectionHeader.Root>

	<Card.Root class="transition-colors duration-200">
		<Card.Content>
			<div class="space-y-3">
				<div class="flex flex-wrap gap-2">
					<Badge variant="secondary">Session count</Badge>
					<Badge variant="secondary">Latency</Badge>
					<Badge variant="secondary">Paste result</Badge>
					<Badge variant="secondary">Mode used</Badge>
				</div>
				<p class="text-sm text-muted-foreground leading-relaxed">
					The app can keep approximate operational metrics like session count,
					recording duration, transcription latency, paste outcome, and the mode
					used. It should not store transcript text, raw audio, selected text, or
					private content in analytics.
				</p>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root class="border-green-100 dark:border-green-900/20">
			<Card.Header>
				<Card.Title
					class="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2"
				>
					<div class="w-2 h-2 bg-green-500 rounded-full"></div>
					What we may keep locally
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-green-500"></span>
						<span>Session count and recording duration</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-green-500"></span>
						<span>Transcription latency and model load time</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-green-500"></span>
						<span>Paste result and local mode used</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-green-500"></span>
						<span>Approximate word count</span>
					</li>
				</ul>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-warning dark:border-warning/20">
			<Card.Header>
				<Card.Title
					class="text-sm font-medium text-warning dark:text-warning flex items-center gap-2"
				>
					<div class="w-2 h-2 bg-warning rounded-full"></div>
					What stays private
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-warning"></span>
						<span>Transcript text and raw audio</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-warning"></span>
						<span>Selected text and private app content</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-2 size-1.5 rounded-full bg-warning"></span>
						<span>Off-device usage reporting</span>
					</li>
				</ul>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root class="bg-muted/30 border-dashed">
		<Card.Header>
			<Card.Title class="text-base font-medium">Local disclosure</Card.Title>
			<Card.Description>
				If a feature depends on Apple Intelligence or a system permission,
				SpeakPaste should say so at runtime rather than pretending it is a cloud
				service.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
			<a
				href="/settings/local-technology"
				class="group flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
			>
				<span class="text-muted-foreground group-hover:text-primary/60 transition-colors"
					>&gt;</span
				>
				<span
					class="underline underline-offset-4 decoration-transparent group-hover:decoration-current transition-colors"
				>
					Read the local technology disclosure
				</span>
			</a>
			<a
				href="/settings/sound"
				class="group flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
			>
				<span class="text-muted-foreground group-hover:text-primary/60 transition-colors"
					>&gt;</span
				>
				<span
					class="underline underline-offset-4 decoration-transparent group-hover:decoration-current transition-colors"
				>
					Adjust local sound cues
				</span>
			</a>
		</Card.Content>
	</Card.Root>

	<div class="flex items-center gap-2 text-xs">
		<div class="flex items-center gap-2 text-green-700 dark:text-green-400">
			<div class="w-2 h-2 bg-green-500 rounded-full"></div>
			<span class="font-medium">Local analytics only</span>
			<span class="text-muted-foreground">Stored on this Mac</span>
		</div>
	</div>
</div>
