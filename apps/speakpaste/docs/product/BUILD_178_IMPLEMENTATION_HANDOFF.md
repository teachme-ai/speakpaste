# Build 178 Implementation Handoff

Status: implementation handoff  
Date: 2026-06-13  
Source context: `SPIRIT_PLANS.md`, repo audit, Fable/Fablefire review, owner decisions in planning thread

## Goal

Build 178 is the launch-hardening build.

It should make the current Mynah app stable and truthful enough for a stronger local-only public launch without taking on the larger AGPL/workspace cleanup or next-major writing modes work.

Build 178 must focus on:

- strict local-only trial behavior
- trial integrity hardening
- macOS Accessibility stale-process recovery
- updater config cleanup
- README/site claim truth-up
- validation that supports the website claim gates

Build 178 must **not** include:

- AGPL/workspace removal
- Intent Router
- Apple Foundation Models
- new writing modes
- storage/data-layer replacement
- large UI redesign

## Owner Decisions Already Made

1. Proceed with **Option B**: Build 178 hardening now.
2. Defer **Option C**: AGPL/workspace cleanup later.
3. Strict local-only means:
   - no cloud transcription
   - no cloud rewrite
   - no remote telemetry
   - no hidden network fallback
4. Remove the trial internet time check.
5. Use local time for trial checks, accepting that trials are honest-user friction.
6. If old trial signatures fail after key rotation, treat trial as expired.
7. Lifetime/paid builds must continue to run normally, including after an expired trial.
8. RB-001 should use an explicit **Restart Mynah** flow with clear user explanation.
9. Remove or quarantine the inert updater config for now.
10. Keep licensing wording careful until AGPL cleanup/legal posture is resolved.

## Branch Plan

Recommended commands for the next implementation chat:

```sh
git status --short
git branch --show-current
git switch -c release/1.0.0-b177
git switch main
git tag v1.0.0-b177
git switch -c build-178-hardening
```

Important:

- Do not include untracked DMG artifacts in commits.
- Do not modify generated release artifacts unless explicitly requested.
- Keep `main` stable.
- All Build 178 commits should land on `build-178-hardening`.

If tags/branches already exist, inspect first and do not recreate destructively.

Before implementing, confirm referenced planning docs exist:

```sh
ls apps/speakpaste/docs/product/SPIRIT_PLANS.md \
  apps/speakpaste/docs/product/BUILD_178_IMPLEMENTATION_HANDOFF.md \
  apps/speakpaste/docs/product/LOCAL_ONLY_BASELINE.md \
  apps/speakpaste/docs/product/CURRENT_PHASE_STATUS.md
```

## Scope Summary

| Area | Files | Required outcome |
| --- | --- | --- |
| Trial network removal | `src-tauri/src/trial_license.rs` | No `worldtimeapi.org`, no internet time fetch |
| Trial high-water mark | `src-tauri/src/trial_license.rs` | Local HMAC-signed `{first_launch, last_seen}` |
| HMAC env key | `src-tauri/build.rs`, `scripts/build-both.mjs`, `trial_license.rs` | Secret not hardcoded in source; release trial build fails without key |
| RB-001 | `accessibility_repair.rs`, `lib.rs`, `register-permissions.ts`, `setup/+page.svelte` | Stale process detects replacement and offers Restart Mynah |
| Updater cleanup | `src-tauri/tauri.conf.json` | No inert updater endpoint/key in config, or explicitly quarantined |
| README truth-up | root `README.md`, possibly app README | Remove stale cloud/Aptabase/updater/license claims |
| Release validation | docs/release notes if needed | Packet/no-network, Trial -> Lifetime, permission recovery checklist |

Paths in this document are relative to:

```text
apps/speakpaste/
```

unless otherwise noted.

## Task 1: Remove Hidden Trial Network Call

### Current Problem

File:

```text
src-tauri/src/trial_license.rs
```

Current code has:

```rust
struct WorldTimeResponse {
    unixtime: u64,
}

async fn fetch_internet_time() -> Option<u64> {
    ...
    client.get("https://worldtimeapi.org/api/timezone/Etc/UTC")
}
```

`get_trial_status()` calls this and uses remote time to defend against clock rollback.

This blocks the public claim:

```text
Nothing leaves your Mac.
```

### Required Implementation

Delete:

- `WorldTimeResponse`
- `fetch_internet_time()`
- the internet-time branch in `get_trial_status()`

Replace keychain state with a local high-water mark.

Recommended v2 payload:

```text
v2:first_launch:last_seen:signature
```

Recommended Rust shape:

```rust
struct TrialAnchor {
    first_launch: u64,
    last_seen: u64,
}
```

HMAC input should cover:

- version marker
- first launch timestamp
- last seen timestamp

Behavior:

```text
now = SystemTime::now()
anchor = read keychain

if now < anchor.last_seen:
    expired = true
    error = "Trial period could not be verified on this Mac."
else:
    anchor.last_seen = max(anchor.last_seen, now)
    save signed anchor
    elapsed = anchor.last_seen - anchor.first_launch
```

UI wording should avoid "tamper" and avoid blaming the user.

Acceptable expired copy:

```text
Mynah couldn't verify the trial period on this Mac, so the trial is shown as ended.
```

### v1 Compatibility

Current payload is:

```text
timestamp:signature
```

Important parser rule:

- v1 has no version prefix and exactly two colon-separated fields.
- v2 begins with literal `v2:` and has four colon-separated fields.
- detect v2 by checking the leading token first; otherwise parse only the exact two-field v1 shape.
- any unknown shape should be treated as invalid/expired, not as a fresh install.

Owner decision:

- old invalid signatures after key rotation should be treated as expired.

Recommended migration:

- valid v1 payload may migrate to v2 with `first_launch = timestamp`, `last_seen = max(timestamp, now)`.
- invalid v1 payload should return an expired/invalid state.

Do not silently grant a fresh 60 days after signature failure.

Required parser tests:

- v1 string with exactly two fields, for example `1700000000:<valid-signature>`, routes through v1 parser and migrates if the signature is valid.
- v2 string beginning with `v2:` routes through v2 parser.
- malformed three-field string without `v2:` prefix returns invalid/expired.
- unknown version prefix returns invalid/expired.

### Acceptance Criteria

- `rg "worldtimeapi|fetch_internet_time|WorldTimeResponse" apps/speakpaste/src-tauri/src/trial_license.rs` finds nothing.
- Trial status works offline.
- Rolling clock backward below `last_seen` expires trial.
- Trial check makes no network request.
- Lifetime build still returns non-trial status early.

## Task 2: Move Trial HMAC Key Out Of Source

### Current Problem

File:

```text
src-tauri/src/trial_license.rs
```

Current code has:

```rust
const HMAC_KEY: &[u8] = b"mynah-app-trial-key-2026-06-10-secret";
```

The repo is currently public. This makes trial payloads forgeable.

### Required Implementation

Use build-time env injection:

- env var: `MYNAH_TRIAL_HMAC_KEY`
- build output env: `MYNAH_TRIAL_HMAC_KEY_RESOLVED`

Files:

```text
src-tauri/build.rs
scripts/build-both.mjs
src-tauri/src/trial_license.rs
```

Expected source shape:

```rust
const HMAC_KEY: &[u8] = env!("MYNAH_TRIAL_HMAC_KEY_RESOLVED").as_bytes();
```

Build behavior:

- `build.rs` must always resolve `MYNAH_TRIAL_HMAC_KEY_RESOLVED` so `env!` compiles for every build type.
- Dev builds may resolve to a marked dev fallback key and emit a cargo warning.
- Trial release builds must fail fast if `MYNAH_TRIAL_HMAC_KEY` is missing.
- Lifetime release builds do not need a meaningful trial key at runtime because they must return before reading trial state.
- If `env!` is used, Lifetime builds still need `MYNAH_TRIAL_HMAC_KEY_RESOLVED` to exist at compile time; a resolved dev/fallback value is acceptable only if no Lifetime runtime path reads it.

`scripts/build-both.mjs` already sets:

```js
MYNAH_TRIAL_MODE: String(isTrial)
```

Add a release-build guard near that logic.

Implementation check:

- confirm the `cargo:rustc-env=MYNAH_TRIAL_HMAC_KEY_RESOLVED=...` emission in `build.rs` sits outside any Trial-only branch, so Lifetime builds compile too.

### Acceptance Criteria

- No production trial key literal remains in source.
- Dev build can run without local secret and emits warning.
- Trial release build fails without `MYNAH_TRIAL_HMAC_KEY`.
- Lifetime release build compiles because `MYNAH_TRIAL_HMAC_KEY_RESOLVED` is always set by `build.rs`.
- Rotated/old signature shows expired trial state, not a crash.
- Lifetime build ignores trial status at runtime.

## Task 3: RB-001 Accessibility Stale Process Recovery

### Current Problem

RB-001:

macOS Accessibility can appear selected in System Settings but not activate the currently running Mynah app after reinstall/replacement.

Most likely scenario:

1. User runs old `/Applications/Mynah.app`.
2. User replaces app bundle while old process is still running.
3. Mynah resets/prompts Accessibility for the new on-disk bundle.
4. System Settings shows Mynah enabled.
5. Current running process is still old/unlinked code.
6. `AXIsProcessTrusted()` still returns false.
7. Current polling loops forever.

### Current Relevant Files

```text
src-tauri/src/accessibility_repair.rs
src-tauri/src/fn_key_listener.rs
src-tauri/src/lib.rs
src/routes/(app)/_layout-utils/register-permissions.ts
src/routes/(app)/setup/+page.svelte
src/routes/(app)/(config)/macos-enable-accessibility/+page.svelte
```

`tauri_plugin_process::init()` is already registered in `lib.rs`, so frontend can use `relaunch()`.

### Required Rust Changes

In `accessibility_repair.rs`:

Add process start timestamp:

```rust
use std::sync::LazyLock;

pub static PROCESS_STARTED_AT_MS: LazyLock<u128> = LazyLock::new(now_ms);
```

In `lib.rs`, force early initialization after build-info log:

```rust
let _ = *accessibility_repair::PROCESS_STARTED_AT_MS;
```

Add pure helper:

```rust
fn is_stale(exe_modified_ms: Option<u128>, process_started_at_ms: u128) -> bool {
    match exe_modified_ms {
        None => true,
        Some(modified) => modified > process_started_at_ms,
    }
}
```

Add macOS wrapper:

```rust
fn running_process_is_stale(current: &InstallFingerprint) -> bool {
    let exe_modified_ms = modified_at_ms(Path::new(&current.executable_path));
    is_stale(exe_modified_ms, *PROCESS_STARTED_AT_MS)
}
```

Extend recovery state:

```rust
#[serde(default)]
pending_post_relaunch_prompt: bool,
```

Extend result:

```rust
pub relaunch_required: bool,
```

When untrusted and stale:

- reset TCC once for current build if needed
- set `pending_post_relaunch_prompt = true`
- update recovery state
- return:

```rust
AccessibilityRepairResult {
    trusted: false,
    prompted: false,
    did_reset,
    install_changed,
    needs_user_approval: true,
    relaunch_required: true,
    recovery_state: "relaunch_required".to_string(),
    ...
}
```

Do not call `application_is_trusted_with_prompt()` from a stale process.

When trusted:

- clear `pending_post_relaunch_prompt`.

### Required Frontend Changes

File:

```text
src/routes/(app)/_layout-utils/register-permissions.ts
```

Add field:

```ts
relaunchRequired: boolean;
```

Add relaunch toast:

```ts
const { relaunch } = await import('@tauri-apps/plugin-process');
await relaunch();
```

When `repairResult?.relaunchRequired`:

- log diagnostic
- show restart toast
- do not start permission poll

Add poll escalation:

- after about 20 seconds of unsuccessful polling, show "Already enabled? Restart Mynah" toast.
- keep polling.
- dismiss restart toast on success.

Mirror state in setup:

```text
src/routes/(app)/setup/+page.svelte
```

If relaunch required:

- show explanation
- render `Restart Mynah` button
- do not ask user to keep toggling System Settings first

Optional recovery page update:

```text
src/routes/(app)/(config)/macos-enable-accessibility/+page.svelte
```

Add explanation for why restart may be needed after app replacement.

### User Copy

Toast title:

```text
Restart needed to finish enabling
```

Toast body:

```text
Mynah was updated or reinstalled while it was running. macOS ties Accessibility permission to the exact app on disk, so a quick restart is needed before the Fn key can work.
```

Button:

```text
Restart Mynah
```

Poll escalation title:

```text
Already enabled in System Settings?
```

Poll escalation body:

```text
If Mynah shows as enabled under Privacy & Security -> Accessibility but dictation is not starting, restarting Mynah completes the activation.
```

### Tests

Rust unit tests:

- stale when exe mtime newer than process start
- not stale when exe mtime older
- stale when exe mtime unavailable
- old recovery JSON deserializes with default `pending_post_relaunch_prompt`

Manual matrix:

1. Fresh install -> grant -> works; no restart toast.
2. Replace bundle while running -> restart required -> relaunch -> grant -> works.
3. Trial -> Lifetime DMG swap over running trial -> same.
4. Untrusted idle 20 seconds -> escalation toast.
5. Grant during poll -> all toasts dismissed.
6. Recovery JSON deleted -> no crash.
7. Apple Silicon and Intel validation if available.

## Task 4: Remove Or Quarantine Updater Config

Current file:

```text
src-tauri/tauri.conf.json
```

Current config includes:

```json
"plugins": {
  "updater": {
    "pubkey": "...placeholder...",
    "endpoints": ["https://mynah.site/update.json"]
  }
}
```

Updater plugin is not active in Rust/package dependencies, but config creates future claim risk.

Owner answer:

- yes, cleanup.

Recommended implementation:

- remove the `plugins.updater` block from `tauri.conf.json` for Build 178.
- keep `createUpdaterArtifacts: false`.
- do not market updater.

Acceptance criteria:

- no active updater plugin
- no updater endpoint in config
- no runtime request to `mynah.site/update.json`

## Task 5: README / Product Claim Truth-Up

Current root README has stale claims:

- cloud transcription integrations
- Ollama/ChatGPT/Claude/Gemini/OpenRouter rewriting
- Aptabase telemetry
- broken private-repo/dev quickstart
- confusing MIT/AGPL/proprietary posture
- updater story not matching current deferred status

Build 178 README should say:

- Mynah is local-first Mac dictation.
- Current app supports local transcription engines only.
- No cloud transcription.
- No cloud rewrite.
- No remote telemetry.
- Diagnostics are local JSONL.
- Model downloads are explicit user actions.
- Trial and Lifetime builds exist.
- Open-source acknowledgments are included.

Avoid:

- "Nothing leaves your Mac" until Build 178 is validated.
- "fully proprietary codebase" until AGPL cleanup/legal posture is resolved.
- "Apple on-device enhanced" as current.
- "Writing modes" as current.
- "self-healing permissions" until RB-001 implementation passes validation.

Safer licensing wording:

```text
Mynah is proprietary software built on open-source components. Open-source licenses and acknowledgments are included in the app and documentation.
```

This wording is allowed for Build 178.

Do not claim:

```text
The entire codebase is all rights reserved.
```

Broad "fully proprietary" or whole-repo "all rights reserved" wording remains blocked until AGPL obligations are resolved by owner/legal review.

## Website Copy Gates

Before Build 178:

```text
Speak. It types. Built to keep your words on your Mac.
```

After Build 178 packet/no-network validation:

```text
Speak. It types. Nothing leaves your Mac.
```

Current capabilities copy:

```text
Mynah is a local-first dictation app for macOS. Hold Fn, speak, release, and your words appear at your cursor. Audio, transcription, and history stay on your Mac. Model downloads are explicit user actions.
```

Post-Build 178 privacy copy:

```text
Mynah's privacy is architectural. Audio, transcription, history, diagnostics, and trial checks run on your Mac. The only network operation is downloading a speech model, which you initiate.
```

If website copy names model hosts for advanced users, it must disclose both current sources: Hugging Face for Whisper/Moonshine and GitHub Releases for Parakeet. Do not say "only Hugging Face."

Do not publish as current:

- Local Writing Modes
- Apple Foundation Models
- Private Cloud Compute exclusion
- self-healing permissions
- fully offline if trial call still exists

## Validation Checklist

### Commands

Run from repo root unless noted:

```sh
git status --short
cd apps/speakpaste
bun run typecheck
cd src-tauri
cargo test
```

If build validation is requested:

```sh
cd apps/speakpaste
bun run build
```

For full DMG build:

```sh
cd apps/speakpaste
bun run build:all
```

Only run full DMG build when owner is ready; it may take time and require signing env.

### Static Checks

```sh
rg "worldtimeapi|fetch_internet_time|WorldTimeResponse" apps/speakpaste/src-tauri/src
rg "tauri-plugin-updater|update.json|plugins.*updater" apps/speakpaste/src-tauri apps/speakpaste/package.json apps/speakpaste/src
rg "Aptabase|OpenAI|Groq|Deepgram|Mistral|ElevenLabs|Claude|Gemini|OpenRouter|Ollama" README.md apps/speakpaste/README.md apps/speakpaste/src
```

Expected:

- no `worldtimeapi` trial code
- no active updater plugin
- no stale public cloud-provider claims in README/product surface

### Manual Runtime Checks

1. Launch Trial build.
2. Confirm trial status renders.
3. Disconnect network.
4. Confirm trial status still renders.
5. Use network monitor during launch + trial status checks.
6. Confirm no connections except user-started model download.
7. Download a model explicitly and confirm network request is user-initiated.
8. Confirm the model download path is the only allowed egress and domain-pins to the expected model hosts:
   - Whisper: `huggingface.co/ggerganov/whisper.cpp`
   - Moonshine: `huggingface.co/UsefulSensors/moonshine`
   - Parakeet: `github.com/EpicenterHQ/epicenter/releases/download/models`
9. Record one dictation.
10. Confirm local transcription.
11. Confirm paste at cursor.
12. Open diagnostics folder.
13. Confirm diagnostics are local.
14. Install Lifetime over expired/old Trial.
15. Confirm Lifetime app works.
16. Test Accessibility stale replacement flow.

## Explicitly Deferred Work

Do not implement in Build 178:

- `license-cleanup-remove-agpl-sync`
- removing `@epicenter/workspace`
- removing `packages/sync`
- replacing Yjs data layer
- Intent Router
- Clean Ramble/List/Prompt modes
- Apple Foundation Models
- Prompt benchmarking
- Hinglish claims
- broad UI redesign

Future hosting note:

- Parakeet currently downloads from upstream `github.com/EpicenterHQ/epicenter` release assets. Do not change this in Build 178, but revisit during licensing/cleanup work so Mynah can host or mirror its own model assets instead of depending on upstream release availability.

## Context For The Next Chat

Paste this summary into the Build 178 implementation chat:

```text
We are implementing Build 178 hardening only.

Do not touch AGPL/workspace cleanup or Intent Router.

Branch target: build-178-hardening.

Must implement:
1. Remove worldtimeapi.org trial call.
2. Replace with local HMAC-signed trial high-water mark.
3. Move trial HMAC key to build-time env.
4. Treat invalid/old trial signature as expired.
5. Ensure Lifetime build ignores trial state and runs normally.
6. Fix RB-001 with stale running process detection and Restart Mynah flow.
7. Remove/quarantine inert updater config from tauri.conf.json.
8. Truth-up README/product claims.
9. Validate no network except user-started model downloads.

Use docs:
- apps/speakpaste/docs/product/SPIRIT_PLANS.md
- apps/speakpaste/docs/product/BUILD_178_IMPLEMENTATION_HANDOFF.md
- apps/speakpaste/docs/product/LOCAL_ONLY_BASELINE.md
- apps/speakpaste/docs/product/CURRENT_PHASE_STATUS.md
```
