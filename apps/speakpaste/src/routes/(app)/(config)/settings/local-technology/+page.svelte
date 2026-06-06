<script lang="ts">
	import { Badge } from '@epicenter/ui/badge';
	import * as Field from '@epicenter/ui/field';
	import { Link } from '@epicenter/ui/link';
</script>

<svelte:head>
	<title>Local Technology - Mynah</title>
</svelte:head>

<Field.Set>
	<Field.Legend>Local Technology</Field.Legend>
	<Field.Description>
		Mynah documents the local frameworks and engines used by the app.
		Nothing here implies cloud processing.
	</Field.Description>
	<Field.Separator />

	<div class="flex flex-wrap gap-2">
		<Badge variant="secondary">Local-only</Badge>
		<Badge variant="secondary">On your Mac</Badge>
		<Badge variant="secondary">Private by design</Badge>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<div class="space-y-3 rounded-lg border bg-muted/20 p-4">
			<h3 class="text-sm font-semibold tracking-tight">In the app today</h3>
			<ul class="space-y-2 text-sm text-muted-foreground leading-relaxed">
				<li>Local speech engines available in the app, including whisper.cpp, Parakeet, and Moonshine.</li>
				<li>Tauri, Svelte, Rust, CPAL, and Enigo for the desktop shell and system integration.</li>
				<li>Local model files and runtime configuration stored on this Mac.</li>
			</ul>
		</div>

		<div class="space-y-3 rounded-lg border bg-muted/20 p-4">
			<h3 class="text-sm font-semibold tracking-tight">Under consideration</h3>
			<ul class="space-y-2 text-sm text-muted-foreground leading-relaxed">
				<li>Apple Natural Language for local language signals and lightweight text intelligence.</li>
				<li>Apple Foundation Models only where Apple Intelligence is available and explicitly disclosed.</li>
				<li>Personal language insights that stay on the Mac.</li>
			</ul>
		</div>
	</div>

	<div class="space-y-3 rounded-lg border border-dashed p-4">
		<h3 class="text-sm font-semibold tracking-tight">Local metrics</h3>
		<p class="text-sm text-muted-foreground leading-relaxed">
			Mynah may keep operational metrics on the device, such as session
			count, recording duration, transcription latency, paste result, mode used,
			and approximate word count. It does not need transcript text, raw audio, or
			private context to keep that local dashboard useful.
		</p>
		<p class="text-sm text-muted-foreground leading-relaxed">
			When a capability depends on a system permission or Apple framework,
			Mynah should say so at runtime instead of hiding the requirement.
		</p>
		<div class="pt-1">
			<Link href="/settings/about" class="text-sm">
				See the broader acknowledgements and credits
			</Link>
		</div>
	</div>
</Field.Set>
