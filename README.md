# SpeakPaste

SpeakPaste is a Mac-only, local-first voice typing utility powered by whisper.cpp.

Press a shortcut, speak, and your words are transcribed locally and pasted into the active app.

```
⌘ ⇧ ; → Speak → whisper.cpp → Pasted
```

## Features

- Global shortcut dictation
- Local whisper.cpp transcription
- Auto-paste into the active app
- Local transcription history
- No account required
- No cloud transcription
- No API key required for MVP

## Development

```bash
bun install
cd apps/speakpaste
bun run dev
```

On first launch: Settings → Transcription → Download a model (Small recommended) → Press `⌘ ⇧ ;` → speak → done.

## Build

```bash
cd apps/speakpaste
bun tauri build
```

Output: `apps/speakpaste/src-tauri/target/release/bundle/dmg/`

## Stack

Svelte 5 · SvelteKit · Tauri v2 · Rust (CPAL + whisper.cpp + enigo) · TypeScript

## License

[MIT](licenses/LICENSE-MIT) · [AGPL-3.0](licenses/LICENSE-AGPL-3.0)

See [ATTRIBUTION.md](ATTRIBUTION.md) for upstream credits.
