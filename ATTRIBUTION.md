# Attribution

Mynah is adapted from the open-source [Whispering](https://github.com/EpicenterHQ/epicenter/tree/main/apps/whispering) project, part of the [Epicenter](https://github.com/EpicenterHQ/epicenter) monorepo by [Braden Wong](https://github.com/braden-w) and contributors.

The upstream project is licensed under AGPL-3.0 and MIT. Both license files are included in this repository under `licenses/`.

Mynah is a focused fork adapted into a single-purpose local macOS dictation tool. The Rust audio backend (CPAL recorder, whisper.cpp via transcribe-rs, clipboard paste via enigo), the Tauri shell, and the Svelte UI framework are all inherited from the upstream project.

Upstream license files:
- [licenses/LICENSE-MIT](licenses/LICENSE-MIT)
- [licenses/LICENSE-AGPL-3.0](licenses/LICENSE-AGPL-3.0)
