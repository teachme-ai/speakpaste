# Antigravity Prompt: Local Performance Profile Validation

## Context

Codex replaced the visible raw native sample-rate setting with a user-facing local performance profile selector.

Product direction:

- Native Mac Capture remains the only visible capture path.
- Capture backend is not hardware-tiered.
- Hardware/persona tuning is expressed as local performance profiles.
- The underlying `recording.cpal.sampleRate` key still exists as internal recorder configuration, but the user should not see raw sample-rate controls in the normal settings surface.

## Expected Product Surface

On the Capture settings page:

- The user should see `Local performance profile`.
- Available options should be:
  - `Balanced`
  - `Fast on Intel and basic Macs`
  - `Higher accuracy on Apple Silicon`
- The user should not see:
  - `Native sample rate`
  - raw `16 kHz / 44.1 kHz / 48 kHz` selector as the main control
  - CPAL/FFmpeg/Navigator capture-engine choices
  - FFmpeg command builder
  - Browser bitrate controls

On the Home and Control Center surfaces:

- The home engine badge should include the selected local performance profile alongside the local engine/model signal.
- The Control Center voice capture card should summarize the selected profile in user language.
- Quick settings/header controls should not expose compression, FFmpeg, Navigator, VAD device selection, or capture-engine internals.

## Validation Tasks

1. Run the app build:

```bash
cd /Users/irfan/projects/Mynah/mynah/apps/mynah
bun run build
```

2. Run the settings test:

```bash
cd /Users/irfan/projects/Mynah/mynah
bun test apps/mynah/src/lib/state/settings.test.ts
```

3. Inspect the Capture settings page:

- Confirm the profile selector appears.
- Confirm changing each profile persists.
- Confirm choosing `Higher accuracy on Apple Silicon` updates the runtime capture sample rate internally.
- Confirm raw sample-rate wording is not visible in the normal Capture settings page.

4. Inspect the Home and Control Center surfaces:

- Confirm the home engine badge changes when the selected profile changes.
- Confirm Control Center shows the profile as part of the voice capture summary.
- Confirm the quick settings popover no longer shows a compression control.
- Confirm the config header no longer shows compression or VAD-specific controls.

5. Runtime smoke, if available:

- Launch `/Applications/Mynah.app`.
- Select each profile.
- Trigger dictation with the configured global shortcut or Fn key.
- Confirm recording/transcription/paste still works.

## Report Format

Write results to a new file:

`apps/mynah/docs/product/ANTIGRAVITY_REVIEW_LOCAL_PROFILE_VALIDATION.md`

Include:

- Build result
- Unit test result
- UI inspection result
- Runtime smoke result
- Any concerns about profile wording or behavior
