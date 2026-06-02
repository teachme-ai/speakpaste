<script lang="ts">
	import { Badge } from '@epicenter/ui/badge';
	import * as Field from '@epicenter/ui/field';
	import { Link } from '@epicenter/ui/link';
</script>

<svelte:head>
	<title>Local Technology - SpeakPaste</title>
</svelte:head>

<Field.Set>
	<Field.Legend>Local Technology</Field.Legend>
	<Field.Description>
		SpeakPaste keeps the core writing surface on your Mac and documents the
		technology that powers it.
	</Field.Description>
	<Field.Separator />

	<div class="flex flex-wrap gap-2">
		<Badge variant="secondary">Local-only</Badge>
		<Badge variant="secondary">On your Mac</Badge>
		<Badge variant="secondary">No cloud fallback</Badge>
		<Badge variant="secondary">Private by design</Badge>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<div class="space-y-3 rounded-lg border bg-muted/20 p-4">
			<h3 class="text-sm font-semibold tracking-tight">On-device stack</h3>
			<ul class="space-y-2 text-sm text-muted-foreground leading-relaxed">
				<li>Local speech engines already present in the app, including whisper.cpp, Parakeet, and Moonshine.</li>
				<li>Apple Natural Language for local detection, tokenization, entity extraction, and lightweight classification.</li>
				<li>Apple Foundation Models only when Apple Intelligence is available at runtime.</li>
				<li>Tauri, Svelte, Rust, CPAL, and Enigo for the desktop shell and system integration.</li>
			</ul>
		</div>

		<div class="space-y-3 rounded-lg border bg-muted/20 p-4">
			<h3 class="text-sm font-semibold tracking-tight">What settings no longer surface</h3>
			<ul class="space-y-2 text-sm text-muted-foreground leading-relaxed">
				<li>Remote API key panels.</li>
				<li>Cloud transcription provider selection.</li>
				<li>Remote completion and rewrite providers.</li>
				<li>Remote analytics or telemetry controls.</li>
			</ul>
		</div>
	</div>

	<div class="space-y-3 rounded-lg border border-dashed p-4">
		<h3 class="text-sm font-semibold tracking-tight">Local metrics</h3>
		<p class="text-sm text-muted-foreground leading-relaxed">
			SpeakPaste may keep operational metrics on the device, such as session
			count, recording duration, transcription latency, paste result, mode used,
			and approximate word count. It does not need transcript text, raw audio, or
			private context to keep that local dashboard useful.
		</p>
		<p class="text-sm text-muted-foreground leading-relaxed">
			When a capability depends on Apple Intelligence or a system permission,
			SpeakPaste should say so at runtime instead of hiding the requirement.
		</p>
		<div class="pt-1">
			<Link href="/settings/about" class="text-sm">
				See the broader acknowledgements and credits
			</Link>
		</div>
	</div>
</Field.Set>
