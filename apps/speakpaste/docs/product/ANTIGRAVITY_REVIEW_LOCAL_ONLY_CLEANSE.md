# Review of Local-Only Hard-Cleanse Changes

**Date**: 2026-06-02  
**Branch**: `local-only-product-surface`  
**Status**: Completed Review  

---

## Executive Summary

The transition of **Mynah** to a strictly local-only sovereign Mac language utility is structurally sound and compiles successfully. The most recent commit (`675fef6`) represents an aggressive and thorough "hard-cleanse" of the codebase, removing over 5,000 lines of remote integrations. All cloud providers (OpenAI, Groq, Mistral, Deepgram, ElevenLabs), self-hosted remote transcription backends (Speaches), and API key settings panels have been completely purged from the user interface and service definitions.

The application successfully builds in both development and production configurations. Unit tests for the settings schemas pass 100% cleanly. The codebase is highly secure against outbound information leaks: remote analytics are completely stubbed out as no-ops at the API service layer, and prompt-transform pipelines are strictly retired, returning immediate error messages to prevent accidental remote LLM invocation.

This document reviews the current local-only changes, analyzes outstanding runtime/product risks, identifies dead code surfaces, and proposes a clear implementation sequence to transition into **Tier 2 (Apple Intelligence Enhanced)** capabilities.

---

## Blockers

* **None**: The application compiles and packages perfectly.
  * **Backend**: `cargo check` inside `src-tauri` builds successfully in **0.58s**.
  * **Frontend**: `bun run build` inside `apps/mynah` successfully packages all static assets in **8.18s** with zero compilation or TypeScript routing errors.
  * **Tests**: `bun test` inside `apps/mynah` runs the full settings suite successfully (**7 passed, 0 failed**).
  * No compiler blockers, broken imports, or functional deadlocks prevent startup, CPAL audio capture, local `whisper.cpp` transcription, or Enigo paste injection.

---

## Runtime Risks

### 1. Tauri Updater Active Connections
* **Risk**: The Tauri Native Auto-Updater is still enabled and initialized. 
* **Details**: In `src-tauri/src/lib.rs` (line 133), the builder registers `.plugin(tauri_plugin_updater::Builder::new().build())`. Although the `LOCAL_ONLY_BASELINE.md` states *"No auto-updater work in the current phase,"* the updater will still trigger asynchronous HTTP check requests on app startup against the endpoint configured in `tauri.conf.json` (pointing to `https://mynah.online`). This represents an outbound network call that violates pure off-grid baseline expectations.

### 2. Local Model Bootstrapping (Outbound Download URLs)
* **Risk**: High-performance local models still rely on external HTTP download endpoints on first launch.
* **Details**: 
  * `local/whispercpp.ts` (lines 27, 39, 51) hardcodes HuggingFace URLs (`https://huggingface.co/ggerganov/whisper.cpp/...`).
  * `local/parakeet.ts` (lines 24, 29, 34, 39, 44) hardcodes GitHub release URLs (`https://github.com/EpicenterHQ/epicenter/releases/download/...`).
  * `local/moonshine.ts` (line 22) hardcodes HuggingFace URLs (`https://huggingface.co/UsefulSensors/moonshine/...`).
* While necessary to obtain local model files, this establishes an outbound connection path that fails under fully air-gapped environments. If a strict "100% offline" environment is enforced, these fetch calls must fail gracefully with descriptive guides on how to manually place models into `Application Support/com.mynah.app/models/`.

### 3. Orphaned Package Dependencies
* **Risk**: Unused remote library packages remain in local filesystems.
* **Details**: While `package.json` was cleaned of direct dependencies like `groq-sdk`, the local `node_modules` and lockfile structures still contain nested transitive dependencies for these packages. A clean filesystem prune (`bun install --production` or purging `node_modules` and re-running `bun install`) is needed in distribution pipelines to ensure zero remote package bloating in the final compiled bundle.

---

## UI / Product Risks

### 1. Informational Pages Remaining
* **Analytics Tab**: The `/settings/analytics` route still exists. While it has been redesigned to be purely informational (disclosing what operational metrics stay local and that no telemetry is sent), having an "Analytics" tab at all could trigger privacy concerns for skeptical users. The PRD thesis states: *"Sovereign Mac language layer: keep everything on your Mac."* Merging this local metric disclosure directly into **Local Technology** or **General** settings and completely deleting the `analytics` page from the settings sidebar would align better with user perception.

### 2. Retired Step Warning Alerts in transformations-editor
* **UI State**: In `Configuration.svelte`, the UI displays a warning banner when a legacy `prompt_transform` is loaded. While this prevents crashes and provides excellent guidance, it exposes "Whispering-like" setup context to the user. A cleaner long-term solution is to hide or filter out `prompt_transform` items from active lists completely or offer an automated button to "Purge Retired Steps."

---

## Transformation Migration Risks

### 1. Legacy Step Failure Loop
* **Risk**: If a user runs a previously configured transformation pipeline containing a `prompt_transform` step, it enters `handleStep` in `transformer.ts` and returns a hard error:
  `Prompt transformations have been retired from the local-only build. Use find/replace steps until local writing modes are implemented.`
  This protects data boundaries perfectly, but creates a frustrating user experience for users migrating from the old version whose pre-configured shortcuts suddenly fail.
* **Mitigation**: An automated database migration helper is needed inside `migrate-settings.ts` to scan existing `transformationSteps` and either:
  * Automatically convert or flag them in the DB.
  * Offer to duplicate the pipeline with only valid `find_replace` steps.

### 2. Schema Key Deadweight
* **Risk**: To prevent database loading crashes, `definition.ts` retains the exact fields for retired cloud steps (`openaiModel`, `anthropicModel`, `customBaseUrl`, etc.) as standard `'string'` definitions. While essential for schema compatibility, these properties remain as dead weight inside the Yjs CRDT database structure. 

---

## Dead Code / Docs Cleanup

### 1. Empty Source Folders
The following directories are completely empty and should be deleted from the Git index:
* 📁 `apps/mynah/src/lib/services/completion/` (the entire LLM completions folder was deleted).
* 📁 `apps/mynah/src/lib/services/transcription/cloud/` (all cloud services deleted).
* 📁 `apps/mynah/src/lib/services/transcription/self-hosted/` (speaches server deleted).

### 2. Technical Readmes & Developer Docs
Several local developers files still reference remote models and providers:
* 📝 `apps/mynah/src/lib/constants/README.md` (mentions configuration for OpenAI, Groq, Anthropic, Google on line 51).
* 📝 `apps/mynah/src/lib/components/settings/README.md` (mentions `OpenAiApiKeyInput.svelte`, `GroqApiKeyInput.svelte`, etc.).
* 📝 `apps/mynah/src/lib/services/README.md` (mentions cloud models on lines 18, 413, 414).
* 📝 `apps/mynah/README.md` (mentions telemetry and Aptabase integrations on line 35).
* 📝 `apps/mynah/docs/USER_GUIDE.md` (needs a thorough sweep to remove references to API Key settings, docker-based Speaches setups, and cloud integrations).

---

## Recommended Next Steps

### Step 1: Prune Empty Directories & Clean lockfiles
Run a clean script to purge empty directories and update the lockfile:
```bash
rm -rf apps/mynah/src/lib/services/completion
rm -rf apps/mynah/src/lib/services/transcription/cloud
rm -rf apps/mynah/src/lib/services/transcription/self-hosted
bun install
```

### Step 2: Stub the Tauri Updater
Remove or comment out the `tauri_plugin_updater` integration to guarantee zero outbound queries:
* **Tauri Config**: Remove the `"updater"` plugin block from `tauri.conf.json`.
* **Rust lib.rs**: Remove `.plugin(tauri_plugin_updater::Builder::new().build())` on line 133.

### Step 3: Integrate Apple Natural Language Layer (Tier 1 Enhancement)
Begin migrating local-only intelligence features into the Svelte query layer using the macOS Native FFI:
* Expose Apple Natural Language tokenizers and language classifiers through Tauri Rust commands.
* Integrate on-device tokenization for clean, fast local formatting.

### Step 4: Sweep Developer Docs & Readmes
Update all internal `README.md` and user-facing guide files to align with the strictly local, private-by-design baseline of version `0.1.1`.

---

## Exact Files/Lines Referenced

### 1. Tauri Backend & Plugins
* **`apps/mynah/src-tauri/src/lib.rs`**
  * Lines 100–108: `log_plugin` configuration (removed Aptabase integration).
  * Line 133: `tauri_plugin_updater::Builder::new().build()` (still active).
  * Lines 187–218: `app.run` handler de-instrumented from tracking events.
* **`apps/mynah/src-tauri/Cargo.toml`**
  * Lines 22–55: Pure local dependencies (completely pruned of `tauri-plugin-aptabase`).
  * Lines 60–81: Target-conditional `transcribe-rs` configurations.
* **`apps/mynah/src-tauri/capabilities/default.json`**
  * Line 87: Removed `aptabase:allow-track-event` capability.

### 2. Frontend Services & Analytics
* **`apps/mynah/src/lib/services/analytics/index.ts`**
  * Lines 5–9: `logEvent` stubbed out completely to return `Ok(undefined)`.
* **`apps/mynah/src/lib/services/transcription/registry.ts`**
  * Lines 31–72: Only local providers (`whispercpp`, `parakeet`, `moonshine`) exist in the active `TRANSCRIPTION_SERVICES` array.
* **`apps/mynah/src/lib/services/transcription/index.ts`**
  * Lines 1–11: Exports only local models (`moonshine`, `parakeet`, `whispercpp`).

### 3. State & Validation
* **`apps/mynah/src/lib/settings/transcription-validation.ts`**
  * Lines 28–39: Validates only model paths for `whispercpp`, `parakeet`, and `moonshine`.
* **`apps/mynah/src/lib/migration/migrate-settings.ts`**
  * Lines 181–183: `toLocalTranscriptionService` defaults legacy cloud setups to `whispercpp`.
  * Lines 335–350: Pruned all references to remote API keys from settings mapping schemas.
* **`apps/mynah/src/lib/state/device-config.svelte.ts`**
  * Lines 24–40: Removed all remote API keys and Base URL config parameters.
* **`apps/mynah/src/lib/state/settings.test.ts`**
  * Lines 11–26: Suite rewritten to verify that retired keys stay `null`.
  * Lines 90–96: Verified transcription services list contains only `whispercpp`, `parakeet`, and `moonshine`.

### 4. Workspace Schemas & Database
* **`apps/mynah/src/lib/workspace/definition.ts`**
  * Lines 87–109: flat union schema for `transformationSteps` keeps legacy parameters as simple `'string'` types for database safety.
  * Lines 245–269: Completely pruned all remote transcription service keys and OpenRouter models.

### 5. Svelte User Interface
* **`apps/mynah/src/routes/(app)/(config)/settings/SidebarNav.svelte`**
  * Lines 8–24: "API Keys" and "Analytics" page entries cleanly removed from settings tabs.
* **`apps/mynah/src/routes/(app)/(config)/settings/analytics/+page.svelte`**
  * Lines 1–100: Re-designed into a local-only disclosure page with no tracking toggles.
* **`apps/mynah/src/routes/(app)/(config)/settings/transcription/+page.svelte`**
  * Lines 370–445: De-instrumented from all remote/speaches components, displaying only local settings parameters.
* **`apps/mynah/src/lib/components/transformations-editor/Configuration.svelte`**
  * Lines 1–250: Prompt transform options deleted; warn alert triggers on legacy steps.
* **`apps/mynah/src/lib/query/transformer.ts`**
  * Lines 46–48: `handleStep` throws retired error for `prompt_transform` steps.
