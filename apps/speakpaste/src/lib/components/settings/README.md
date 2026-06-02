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
├── CompressionBody.svelte
└── README.md
```

## Usage

```svelte
<script lang="ts">
	import VadDeviceSelector from '$lib/components/settings/selectors/VadDeviceSelector.svelte';
</script>

<VadDeviceSelector settingKey="recording.navigator.deviceId" />
```

## Guidelines

- Keep each component focused on one setting or one tightly related setting group.
- Bind through `settings` or `deviceConfig`; page-only state belongs in the page.
- Prefer clear labels, validation, and visible local technology attribution.
- Do not add external account, hosted-provider, or off-device usage-reporting controls here.
