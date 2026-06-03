# Settings Components

Settings components bind small pieces of UI directly to the reactive state stores.

## Stores

- `settings`: synced application preferences such as recording behavior, output behavior, selected local engine, sound toggles, and UI preferences.
- `deviceConfig`: device-bound preferences such as local model paths, hardware details, and global shortcuts.

The app no longer exposes account credentials or hosted-provider configuration. New settings should support the local-only product baseline unless a future product decision explicitly changes that.

## Organization

```text
settings/
├── selectors/              # Reusable selector controls
├── LocalModelDownloadCard.svelte
├── LocalModelSelector.svelte
└── README.md
```

## Usage

```svelte
<script lang="ts">
	import ManualDeviceSelector from '$lib/components/settings/selectors/ManualDeviceSelector.svelte';
</script>

<ManualDeviceSelector />
```

## Guidelines

- Keep each component focused on one setting or one tightly related setting group.
- Bind through `settings` or `deviceConfig`; page-only state belongs in the page.
- Prefer clear labels, validation, and visible local technology attribution.
- Keep capture-engine internals, FFmpeg command controls, compression controls, and VAD-specific selectors out of the product surface unless a future product decision explicitly reintroduces them.
- Do not add external account, hosted-provider, or off-device usage-reporting controls here.
