# Constants Directory

The `constants` directory is the source of truth for immutable values used by the app: audio modes, keyboard mappings, language metadata, local transcription engines, UI options, and platform checks.

Constants are grouped by product domain instead of technical type.

```text
constants/
├── app/
├── audio/
├── database/
├── keyboard/
├── languages/
├── platform/
├── sounds/
├── transcription/
└── ui/
```

## Local-Only Baseline

Transcription constants should describe on-device engines and model options only. The current product surface supports `whispercpp`, `parakeet`, and `moonshine`; removed provider constants should not be reintroduced unless the product baseline changes.

## Import Pattern

Import from category barrels:

```ts
import { DEFAULT_BITRATE_KBPS, RECORDING_MODES } from '$lib/constants/audio';
import { IS_MACOS } from '$lib/constants/platform';
```

Avoid importing from individual source files outside the category unless there is a clear reason.

## Adding Constants

- Pick the domain first.
- Keep names explicit and stable.
- Use `as const` where it improves type safety.
- Keep platform or service assumptions visible in comments near the constant.
