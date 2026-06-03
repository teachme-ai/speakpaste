<script lang="ts">
	import { Badge } from '@epicenter/ui/badge';
	import * as Field from '@epicenter/ui/field';
	import { Link } from '@epicenter/ui/link';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import InfoIcon from '@lucide/svelte/icons/info';
	import { BUILD_INFO } from '$lib/generated/build-info';
</script>

<svelte:head>
	<title>About & Credits - SpeakPaste</title>
</svelte:head>

<Field.Set>
	<Field.Legend>About & Credits</Field.Legend>
	<Field.Description>
		SpeakPaste is a local-first, privacy-first, and system-wide voice typing utility.
	</Field.Description>
	<Field.Separator />

	<div class="space-y-6">
		<!-- App Metadata Info Card -->
		<div class="rounded-xl border border-muted bg-card p-6 shadow-sm">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div class="space-y-1">
					<h3 class="text-xl font-bold tracking-tight">🎙️ SpeakPaste</h3>
					<p class="text-sm text-muted-foreground">Local Voice Typing utility for macOS</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<Badge variant="default" class="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">Version {BUILD_INFO.marketingVersion}</Badge>
					<Badge variant="outline">Release {BUILD_INFO.gitCommitCount}</Badge>
					<Badge variant="outline">Bundle {BUILD_INFO.bundleVersion}</Badge>
					<Badge variant="outline" class="font-mono">{BUILD_INFO.gitCommit}</Badge>
					<Badge variant="outline">Mac Only</Badge>
					<Badge variant="outline" class="text-green-600 dark:text-green-400 border-green-500/20">Local-First</Badge>
				</div>
			</div>
			
			<div class="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
				<ShieldCheckIcon class="size-4 text-green-600 dark:text-green-400 shrink-0" />
				<span><strong>Privacy Promise:</strong> Your voice data, raw audio clips, and transcribed text are stored and processed entirely on your machine. No accounts, no clouds, and absolute data control.</span>
			</div>

			<div class="mt-4 rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
				<p><strong>Build accountability:</strong> SpeakPaste now advances its release number with Git history, while still stamping every build with the exact commit reference and build time for traceability.</p>
			</div>
		</div>

		<!-- Creator Card -->
		<div class="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
			<div class="flex flex-col sm:flex-row sm:items-center gap-4">
				<div class="flex items-center gap-4 flex-1">
					<div class="size-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xl font-bold text-primary">
						KI
					</div>
					<div class="space-y-0.5">
						<p class="text-xs font-semibold uppercase tracking-wider text-primary/70">Creator</p>
						<h3 class="text-base font-bold tracking-tight">Khalid Irfan</h3>
						<p class="text-xs text-muted-foreground">TeachMe AI · SpeakPaste</p>
					</div>
				</div>
				<div class="flex flex-col gap-1.5 text-xs sm:items-end">
					<Link href="https://www.linkedin.com/in/irfankhalid/" target="_blank" class="flex items-center gap-1.5 hover:text-primary transition-colors">
						<svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
							<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
						</svg>
						linkedin.com/in/irfankhalid
					</Link>
					<Link href="mailto:irfan@teachmeai.in" class="flex items-center gap-1.5 hover:text-primary transition-colors">
						<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
						</svg>
						irfan@teachmeai.in
					</Link>
				</div>
			</div>
		</div>

		<!-- Open Source Acknowledgements Section -->

		<div class="space-y-3">
			<h4 class="text-lg font-semibold tracking-tight flex items-center gap-2">
				<HeartIcon class="size-4 text-red-500 fill-red-500 animate-pulse" />
				Upstream Acknowledgements
			</h4>
			<p class="text-sm text-muted-foreground leading-relaxed">
				SpeakPaste stands on the shoulders of giants. We express our deepest gratitude to the creators of the following open-source frameworks and libraries that power the core transcription, audio capturing, and automation features of this application:
			</p>

			<div class="grid gap-4 sm:grid-cols-2 mt-2">
				<!-- whisper.cpp -->
				<div class="rounded-lg border bg-muted/20 p-4 space-y-2">
					<div class="flex items-center justify-between">
						<span class="font-semibold text-sm">whisper.cpp</span>
						<Link href="https://github.com/ggerganov/whisper.cpp" target="_blank" class="text-xs">GitHub ↗</Link>
					</div>
					<p class="text-xs text-muted-foreground leading-relaxed">
						High-performance, pure C/C++ port of OpenAI's Whisper speech-to-text models by Georgi Gerganov. Enables lightning-fast, offline local audio processing.
					</p>
				</div>

				<!-- Tauri -->
				<div class="rounded-lg border bg-muted/20 p-4 space-y-2">
					<div class="flex items-center justify-between">
						<span class="font-semibold text-sm">Tauri v2</span>
						<Link href="https://tauri.app" target="_blank" class="text-xs">Website ↗</Link>
					</div>
					<p class="text-xs text-muted-foreground leading-relaxed">
						Security-focused, low-resource multi-platform application building framework. Used to bind our Rust audio threads and Svelte web frontend together.
					</p>
				</div>

				<!-- Svelte -->
				<div class="rounded-lg border bg-muted/20 p-4 space-y-2">
					<div class="flex items-center justify-between">
						<span class="font-semibold text-sm">Svelte 5</span>
						<Link href="https://svelte.dev" target="_blank" class="text-xs">Website ↗</Link>
					</div>
					<p class="text-xs text-muted-foreground leading-relaxed">
						Ultra-performant reactive frontend rendering library driving our lightning-fast, sleek, and intuitive settings dashboard.
					</p>
				</div>

				<!-- Rust Audio & Keyboard Drivers -->
				<div class="rounded-lg border bg-muted/20 p-4 space-y-2">
					<div class="flex items-center justify-between">
						<span class="font-semibold text-sm">CPAL & Enigo</span>
						<span class="text-xs text-muted-foreground font-mono">Rust Backend</span>
					</div>
					<p class="text-xs text-muted-foreground leading-relaxed">
						<strong>CPAL</strong> provides cross-platform low-level audio recording. <strong>Enigo</strong> drives system-wide keyboard event injection to write transcribed texts directly at your cursor.
					</p>
				</div>
			</div>
		</div>

		<Field.Separator />

		<!-- Original Project Fork Attribution (Licensing Compliance) -->
		<div class="rounded-lg border border-dashed p-5 bg-muted/10 space-y-3">
			<h4 class="text-base font-semibold flex items-center gap-2">
				<InfoIcon class="size-4 text-primary shrink-0" />
				Branding & Copyright Disclosure
			</h4>
			<p class="text-xs text-muted-foreground leading-relaxed">
				SpeakPaste is adapted from the open-source **Whispering** project, which is part of the **Epicenter** application monorepo created and maintained by **Braden Wong** and contributors.
			</p>
			<p class="text-xs text-muted-foreground leading-relaxed">
				In complete compliance with the **MIT** and **AGPL-3.0** licensing agreements of the upstream source, all original copyrights, framework abstractions, and shared library structures remain owned by their respective authors. We sincerely thank Braden and the Epicenter community for providing the architectural layout that made this utility possible.
			</p>
			<div class="flex gap-4 text-xs font-medium mt-1">
				<Link href="https://speakpaste.online" target="_blank">SpeakPaste Website ↗</Link>
			</div>
		</div>

		<div class="rounded-lg border border-border bg-muted/10 p-5 space-y-2">
			<h4 class="text-base font-semibold">Permission Recovery</h4>
			<p class="text-xs text-muted-foreground leading-relaxed">
				If macOS keeps an old Accessibility entry after you reinstall or replace
				SpeakPaste, the app now attempts to refresh that stale entry
				automatically in the background and then asks for approval again only if
				macOS still requires it.
			</p>
		</div>
	</div>
</Field.Set>
