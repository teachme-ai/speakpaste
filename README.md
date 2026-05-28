# 🎙️ SpeakPaste

**SpeakPaste** is a premium, Mac-only, local-first, and privacy-first voice dictation utility. Operating seamlessly in the background, it captures your speech at the press of a shortcut, transcribes it instantly, processes it through customizable formatting pipelines, and types it directly at your active text cursor.

```
Fn key (or ⌘ ⇧ F8) ──> Speak ──> local whisper.cpp ──> Post-Process ──> Auto-Paste
```

---

## ✨ Features

* **Global Hotkey Dictation**: Trigger voice typing system-wide from any active application (Apple Notes, Slack, VS Code, Browser, etc.).
* **Push-to-Talk & Toggle Modes**: Keep keys pressed while speaking (Push-to-Talk) or press once to start and press again to stop.
* **Offline Local Transcription**: Fully private speech recognition using **Whisper C++**, UsefulSensors **Moonshine**, or NVIDIA **Parakeet** models running locally on your hardware.
* **Flexible Recording Methods**: 
  - **CPAL (Native Rust)**: Low-latency uncompressed WAV recording, immune to background app sleeping (macOS AppNap).
  - **FFmpeg**: Advanced audio customization via shell parameters.
  - **Browser API**: Web MediaRecorder API for lightweight compressed recording.
* **Cloud Transcription Integrations**: Fast cloud dictation via **OpenAI (Whisper)**, **Groq**, **Deepgram**, **Mistral**, or **ElevenLabs** API keys.
* **Intelligent Voice Activation (VAD)**: Hands-free dictation using browser-based neural network Voice Activated Detection.
* **Post-Transcription Automation**: Simulate clipboard copy, direct cursor typing (via Enigo), and automatic Enter/Return key chimes.
* **Text Post-Processing Pipelines (Transformations)**:
  - Create sequential, multi-step workflows.
  - Mix **Find & Replace** (plaintext or Regular Expressions) and **AI Prompt** steps.
  - Format, rewrite, translate, or code-block your spoken words dynamically using local LLMs (Ollama) or Cloud APIs (ChatGPT, Claude, Gemini, OpenRouter).
  - Live split-pane testing workspace and nested execution run history logs.
* **Recordings & History Manager**:
  - Secure local filesystem database of raw WAV files and past transcripts.
  - Integrated audio player and shortcut folder access.
  - Bulk operations: bulk transcribe, bulk delete, and template-based custom batch copying (e.g., compile notes using `[Recorded at {{recordedAt}}]: {{transcript}}` with custom line delimiters).
* **Tray & Overlay Indicators**:
  - Color-coded system tray status chimes (Idle, Recording, Transcribing, Pasted, Error).
  - Desktop status overlay window showing active dictation progress.
* **Opt-In Telemetry Transparency**: Strict analytics disclosure (Aptabase)—we track UI actions and completion rates, but **never** collect voice audio, transcriptions, API keys, or identifiers.

---

## 🛠️ Technology Stack

SpeakPaste is engineered for maximum performance, minimal resource usage, and clean isolation:
* **Core Core**: Rust (`CPAL` for low-latency audio capture + `Enigo` for hardware keyboard emulation).
* **App Runtime**: **Tauri v2** (native Rust shell wrapping web views securely).
* **Interface**: **Svelte 5** (reactive rendering using fine-grained runes) & SvelteKit.
* **Local Engines**: `whisper.cpp` (native C++ Whisper port), ONNX runtimes.
* **Error Handling**: **WellCrafted** (TypeScript control flow error mapping library).

---

## 🚀 Getting Started & Development

### Dependencies
Before running the application locally, make sure you have:
1. **Bun** installed (`npm i -g bun` or via homebrew).
2. **Xcode Command Line Tools** (`xcode-select --install`).
3. **FFmpeg** (Highly recommended, run `brew install ffmpeg`).

### Install and Run
```bash
# 1. Clone the private repository
Visit the official website for installation instructions and downloads:
https://speakpaste.online
cd speakpaste

# 2. Install monorepo workspace dependencies
bun install

# 3. Boot up the Tauri v2 developer environment
cd apps/speakpaste
bun run dev
```

*On First Launch:* Navigate to **Settings** > **Transcription** > select **Whisper C++** > click **Download a Model** (Small recommended) > Grant macOS Accessibility Permissions under System Settings > Press the standalone **Fn** key (or the `Command+Shift+F8` shortcut) and speak!

---

## 🔒 Auto-Updates without Source Exposure

SpeakPaste leverages Tauri v2's native **Updater Plugin** to deliver secure, automated software updates without exposing private repository source code:

* **Secure Signature Validation**: All release binaries are signed using a private key (configured in secure CI environments). The app verifies the signature using a public key configured in `tauri.conf.json`.
* **Zero-Source Exposure**: The update workflow checks a public `update.json` file hosted on anonymous/free static hosting (such as GitHub Pages or Cloudflare Pages/R2):
  ```
  [SpeakPaste App] ──> Fetch update.json ──> Validate Signature ──> Download & Install .dmg
  ```
* **Seamless Installation**: Updates are downloaded in the background, showing a non-intrusive progress state, and can be activated with a single click to hot-restart the application.

---

## 📁 Repository Structure

SpeakPaste is organized as a high-performance **Bun monorepo** to maximize code reuse, type safety, and component isolation:

```
speakpaste/
├── apps/
│   └── speakpaste/              # Main Tauri v2 + SvelteKit Application
│       ├── src-tauri/           # Native Rust shell (audio recorder, keyboard emulation, tray)
│       └── src/                 # Svelte 5 frontend (TanStack Query, custom pipelines UI)
├── packages/                    # Monorepo Shared Libraries
│   ├── constants/               # Universal configurations, settings defaults, and schemas
│   ├── svelte-utils/            # Reusable Svelte utility logic and hooks
│   ├── sync/                    # Yjs state sync logic and protocols
│   ├── ui/                      # Beautiful design tokens & custom Tailwind components
│   └── workspace/               # Collaborative CRDT structures and model managers
└── licenses/                    # Legal compliance documentation
```

---

## 📦 Building and Packaging

Compile the standalone, optimized production bundle (DMG installer) without App Store sandbox restrictions:

```bash
cd apps/speakpaste
bun tauri build
```

The output installer will be packaged directly to:
📁 `apps/speakpaste/src-tauri/target/release/bundle/dmg/SpeakPaste_0.1.0_x64.dmg` (or `_aarch64.dmg` for Apple Silicon).

---

## 📖 Complete Guides & Manuals

We maintain comprehensive user-facing product manuals and technical guidelines:
* **[User Guide & Troubleshooting Manual](apps/speakpaste/docs/USER_GUIDE.md)**: Details onboarding, configurations, recording methods, Docker-based Speaches servers, custom AI post-processing prompt templates, macOS system accessibility workaround databases, and FFmpeg environment setups.
* **[Architecture Deep Dive](apps/speakpaste/ARCHITECTURE.md)**: Explains Svelte 5 state reactivity, platform service injection, WellCrafted error transformation boundaries, and monorepo shared packages structure.

---

## 📄 License & Attribution

SpeakPaste is developed and distributed under the **MIT** and **AGPL-3.0** licensing agreements. 

### Attribution Credits
SpeakPaste is adapted from the open-source **Whispering** project, which is part of the **Epicenter** application monorepo created and maintained by **Braden Wong** and contributors. All original copyrights and structural layouts are fully acknowledged and respected under standard open-source guidelines.

