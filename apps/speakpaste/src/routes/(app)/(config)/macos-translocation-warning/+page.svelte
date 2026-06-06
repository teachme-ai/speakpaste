<script lang="ts">
	import { Button } from '@epicenter/ui/button';
	import * as Card from '@epicenter/ui/card';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
</script>

<svelte:head>
	<title>Action Required</title>
</svelte:head>

<main class="flex flex-1 items-center justify-center p-6 bg-background">
	<Card.Root class="w-full max-w-lg border-destructive/20 shadow-lg">
		<Card.Header class="text-center pb-2">
			<div class="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
				<AlertTriangle class="size-8 text-destructive" />
			</div>
			<Card.Title class="text-2xl font-bold tracking-tight">Move to Applications Folder</Card.Title>
			<Card.Description class="text-base mt-2">
				macOS is currently running Mynah from a temporary restricted location.
			</Card.Description>
		</Card.Header>
		<Card.Content class="pt-6">
			<div class="space-y-4 text-sm leading-relaxed text-muted-foreground">
				<p>
					Because you opened the app directly from the Downloads folder or the installer `.dmg`, macOS has placed Mynah into a security quarantine called <strong>App Translocation</strong>.
				</p>
				<p>
					While in quarantine, macOS completely blocks Mynah from requesting Accessibility or Microphone permissions, meaning the global Fn key listener will not work.
				</p>
				<div class="bg-muted p-4 rounded-lg mt-4 border border-border">
					<h3 class="font-semibold text-foreground mb-2">How to fix this:</h3>
					<ol class="list-decimal list-inside space-y-1">
						<li>Quit this application completely (Cmd + Q).</li>
						<li>Drag <strong>Mynah.app</strong> into your Mac's <span class="text-foreground font-medium">Applications</span> folder.</li>
						<li>Open it from Launchpad or the Applications folder.</li>
					</ol>
				</div>
			</div>
		</Card.Content>
		<Card.Footer class="flex justify-center pt-2 pb-6">
			<Button variant="destructive" class="w-full font-medium" onclick={() => window.__TAURI_INTERNALS__.invoke('plugin:process|exit', { code: 0 })}>
				Quit Mynah
			</Button>
		</Card.Footer>
	</Card.Root>
</main>
