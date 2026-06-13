# Spirit Plans

Status: planning baseline  
Date: 2026-06-13  
Scope: Build 178 hardening, licensing posture, AGPL cleanup investigation, website claim gates, next-major roadmap

## Purpose

This document freezes the current operating plan for Mynah after the repo audit, Fable/Fablefire review loop, and product-owner decisions.

The goal is to keep the current working app stable while moving toward:

- a strictly local-only public claim
- a safer Trial -> Lifetime upgrade path
- a fixed macOS Accessibility reinstall/replacement recovery flow
- a defensible proprietary product posture
- a future local writing layer with deterministic modes and Apple on-device enhancement

This is a planning document only. It does not represent completed implementation.

## Current Decision Register

| Area | Decision | Status |
| --- | --- | --- |
| Local-only promise | Strict local-only. No cloud transcription, no cloud rewrite, no remote telemetry, no hidden network fallback. | Decided |
| Trial network call | Remove `worldtimeapi.org` from trial status. Use local-only time strategy. | Build 178 |
| Trial clock strategy | Use local system time plus HMAC-signed high-water mark. Trial bypasses are acceptable because trial is honest-user friction. Known accepted bypass: deleting the keychain item can reset first launch. | Build 178 |
| Trial key | Move trial HMAC key out of source into build-time env. | Build 178 |
| Old trial signatures after key rotation | Treat as expired. Paid/Lifetime build must run normally. | Decided |
| Lifetime build behavior | Lifetime build must not read trial state and must work after an expired trial install. | Decided |
| Accessibility RB-001 | Add stale running process detection and explicit Restart Mynah flow. | Build 178 |
| Updater | Remove or quarantine inert updater config until updater is intentionally shipped. | Build 178 |
| Website hero | Before Build 178: "Built to keep your words on your Mac." After Build 178 validation: "Nothing leaves your Mac." | Decided |
| Writing modes | Next major release modes: Dictate, Clean Ramble, List, Prompt. | Next major |
| Apple Foundation Models | Allowed only when proven on-device. Never Private Cloud Compute. Deterministic fallback everywhere. | Next major |
| Raw vs shaped storage | Raw transcript is the only persisted record. Shaped output is pasted/transient only. | Decided |
| App context | May affect formatting/tone only. It must not choose the user's mode. | Decided |
| Repo/license posture | Desired product posture is proprietary, but current repo contains MIT and AGPL components. AGPL path must be audited/removed before broad proprietary/private claims. Broad "fully proprietary" public wording is owner/legal blocked until obligations are confirmed, even if engineering cleanup happens later. | Owner/legal + cleanup branch |

## Branch Strategy

Do not destabilize `main` while launch is near.

Recommended branches:

| Branch | Purpose | Merge timing |
| --- | --- | --- |
| `main` | Current stable working line. Keep clean. | Always stable |
| `release/1.0.0-b177` | Preserve current launchable build and DMG state. Tag as `v1.0.0-b177`. | Create before risky changes |
| `build-178-hardening` | Small trust/stability fixes: trial local-only, HMAC env key, RB-001, updater quarantine, README/site claim cleanup. | Merge before public local-only launch |
| `license-cleanup-remove-agpl-sync` | Longer dependency/license refactor to remove AGPL-linked workspace/sync path from shipped app. | Merge only after proof |
| `next-major-intent-router` | Writing modes, deterministic router, Apple FM capability gate. | After Build 178 |

Recommended order:

1. Create/tag stable current build.
2. Implement and validate `build-178-hardening`.
3. Launch using Build 178 if possible.
4. Continue `license-cleanup-remove-agpl-sync` separately.
5. Start `next-major-intent-router` after trust fixes are done.

## Build 178 Scope

Build 178 is the hardening release. It should make the app stable enough for stronger public claims.

### 1. Remove Hidden Trial Network Call

Current code:

- `apps/speakpaste/src-tauri/src/trial_license.rs`
- `fetch_internet_time()` calls `https://worldtimeapi.org/api/timezone/Etc/UTC`.
- `get_trial_status()` calls `fetch_internet_time()` to compare internet time against system time.

Problem:

- This contradicts `LOCAL_ONLY_BASELINE.md`.
- It prevents the website from honestly saying "Nothing leaves your Mac."

Implementation plan:

- Delete `WorldTimeResponse`.
- Delete `fetch_internet_time()`.
- Delete the branch in `get_trial_status()` that calls internet time.
- Replace trial state with a local anchor:

```rust
struct TrialAnchor {
    first_launch: u64,
    last_seen: u64,
}
```

Keychain payload v2:

```text
v2:first_launch:last_seen:signature
```

v1 compatibility:

- current v1 payload has no prefix and exactly two colon-separated fields: `timestamp:signature`.
- v2 begins with literal `v2:` and has four colon-separated fields.
- parser should detect v2 by checking the leading token first; otherwise parse only the exact two-field v1 shape.
- valid v1 records may migrate to v2 using `first_launch = timestamp` and `last_seen = max(timestamp, now)`.
- invalid v1 records should be treated as expired/invalid, not silently renewed.
- unknown payload shapes should be treated as expired/invalid.

Parser tests should pin:

- a valid two-field v1 payload routes through v1 migration.
- a `v2:` payload routes through v2 parsing.
- a malformed three-field no-prefix payload expires.
- an unknown version prefix expires.

High-water behavior:

```text
now = SystemTime::now()
if now < last_seen:
    expired with clock rollback / invalid trial message
else:
    last_seen = max(last_seen, now)
    persist signed anchor
    days_elapsed = (last_seen - first_launch) / 86400
```

Acceptance criteria:

- Trial status works offline.
- App launch + 10 trial status checks produce no network connections except user-started model downloads.
- Clock rollback expires trial.
- Restoring the clock does not un-expire a rollback-expired trial unless product owner later chooses a support reset path.

### 2. Move Trial HMAC Key Out Of Source

Current code:

- `apps/speakpaste/src-tauri/src/trial_license.rs`
- `const HMAC_KEY: &[u8] = b"mynah-app-trial-key-2026-06-10-secret";`

Problem:

- Repo is currently public.
- Trial payloads can be forged by anyone reading the source.

Implementation plan:

- Add build-time env injection in `apps/speakpaste/src-tauri/build.rs`, following the existing build metadata pattern.
- Env var: `MYNAH_TRIAL_HMAC_KEY`.
- Rust source should use a compile-time resolved key, not a literal source key.

Example target shape:

```rust
const HMAC_KEY: &[u8] = env!("MYNAH_TRIAL_HMAC_KEY_RESOLVED").as_bytes();
```

Build script behavior:

- `build.rs` must always resolve `MYNAH_TRIAL_HMAC_KEY_RESOLVED` so `env!` compiles for every build type.
- Dev builds may use a clearly marked dev fallback key with a cargo warning.
- Trial release builds must fail if `MYNAH_TRIAL_HMAC_KEY` is missing.
- Lifetime release builds do not need a meaningful trial key at runtime because they must return before reading trial state, but they still need the compile-time resolved env value if `env!` is used.
- The `cargo:rustc-env=MYNAH_TRIAL_HMAC_KEY_RESOLVED=...` emission must sit outside any Trial-only branch.

Script touchpoint:

- `apps/speakpaste/scripts/build-both.mjs`
- It already sets `MYNAH_TRIAL_MODE`.
- Add fail-fast check for trial release builds.

Owner decision already made:

- Existing trial signatures after key rotation are treated as expired.
- Lifetime builds must run normally.

Acceptance criteria:

- Dev build works without local secret.
- Trial release build fails without secret.
- Lifetime release build compiles because the resolved env value always exists.
- Rotated key does not crash app; it shows expired trial UX.
- Lifetime build ignores trial state at runtime.

### 3. Fix RB-001 Accessibility Stale Running Process

Problem:

macOS Accessibility can show Mynah enabled in System Settings but not activate the currently running app after reinstall/replacement. This is likely when the app bundle is replaced while an old process is still running.

Current files:

- `apps/speakpaste/src-tauri/src/accessibility_repair.rs`
- `apps/speakpaste/src-tauri/src/fn_key_listener.rs`
- `apps/speakpaste/src/routes/(app)/_layout-utils/register-permissions.ts`
- `apps/speakpaste/src/routes/(app)/setup/+page.svelte`
- `apps/speakpaste/src/routes/(app)/(config)/macos-enable-accessibility/+page.svelte`
- `apps/speakpaste/src-tauri/src/lib.rs`

Current behavior:

- Detects whether Accessibility is trusted.
- Detects install fingerprint changes.
- Resets TCC once per build.
- Prompts user.
- Polls readiness.

Missing behavior:

- No comparison of running process start time against on-disk executable modification time.
- No `relaunchRequired` state.
- No Restart Mynah UI path.

Implementation plan:

In `accessibility_repair.rs`:

- Add early process-start timestamp:

```rust
pub static PROCESS_STARTED_AT_MS: LazyLock<u128> = LazyLock::new(now_ms);
```

- Force initialize early in `run()` in `lib.rs`.
- Add stale detection:

```rust
fn is_stale(exe_modified_ms: Option<u128>, process_started_at_ms: u128) -> bool {
    match exe_modified_ms {
        None => true,
        Some(modified) => modified > process_started_at_ms,
    }
}
```

- Add macOS wrapper:

```rust
fn running_process_is_stale(current: &InstallFingerprint) -> bool {
    let exe_modified_ms = modified_at_ms(Path::new(&current.executable_path));
    is_stale(exe_modified_ms, *PROCESS_STARTED_AT_MS)
}
```

- Extend `AccessibilityRecoveryState`:

```rust
#[serde(default)]
pending_post_relaunch_prompt: bool,
```

- Extend `AccessibilityRepairResult`:

```rust
pub relaunch_required: bool,
```

- In untrusted branch, before prompting:
  - if stale:
    - reset TCC once if needed
    - set `pending_post_relaunch_prompt = true`
    - return `relaunch_required = true`
    - do not prompt from stale process

In frontend:

- Extend `AccessibilityRepairResult` type with `relaunchRequired`.
- Add Restart Mynah toast using `@tauri-apps/plugin-process` `relaunch()`.
- `tauri_plugin_process::init()` is already registered in `lib.rs`.
- If `relaunchRequired`, show Restart Mynah and do not start futile poll.
- Add 20-second poll escalation for cases where staleness is inferred but not detected.

UX copy:

Title:

```text
Restart needed to finish enabling
```

Body:

```text
Mynah was updated or reinstalled while it was running. macOS ties Accessibility permission to the exact app on disk, so a quick restart is needed before the Fn key can work.
```

Button:

```text
Restart Mynah
```

Manual validation:

1. Fresh install -> grant Accessibility -> no restart toast.
2. Replace bundle while running -> stale detected -> restart toast -> relaunch -> prompt -> listener works.
3. Trial -> Lifetime DMG swap over running trial -> same flow.
4. Untrusted user idle for 20 seconds -> escalation toast.
5. Grant during poll -> success, all toasts dismissed.
6. Recovery JSON deleted -> no crash.
7. Intel and Apple Silicon both pass.

### 4. Remove Or Quarantine Inert Updater Config

Current config:

- `apps/speakpaste/src-tauri/tauri.conf.json`
- `plugins.updater` has endpoint `https://mynah.site/update.json`.
- Updater plugin is not active in `Cargo.toml`/`package.json`/`lib.rs`.

Problem:

- It is inert today, but it creates future claim risk.
- If updater is activated later, "nothing leaves your Mac" must change or be carefully qualified.

Owner answer:

- Yes, remove/quarantine for now.

Implementation options:

Option A, recommended:

- Remove `plugins.updater` block until updater work is deliberately resumed.

Option B:

- Keep block only if documented internally as inert/deferred.

Acceptance criteria:

- No active updater plugin.
- No runtime request to `mynah.site/update.json`.
- Website does not claim auto-updates.

### 5. README And Claim Truth-Up

Current root README has stale claims:

- cloud transcription providers
- Ollama/cloud rewrite providers
- Aptabase telemetry
- old quickstart paths
- mixed/confusing license phrasing
- private repository language while repo is public

Build 178 README should say:

- Mynah is local-first Mac dictation.
- Local engines only in active product surface.
- No cloud transcription.
- No cloud rewrite.
- No remote telemetry.
- Model downloads are user-initiated.
- Trial and lifetime builds exist.
- Open-source acknowledgments are included.

Avoid until implemented:

- Apple on-device enhanced as current
- writing modes as current
- self-healing permissions until RB-001 lands
- "Nothing leaves your Mac" until trial egress is removed and validated
- "all rights reserved" for entire repo until license audit is complete

## Licensing And Proprietary Posture

Owner requirement:

- Mynah needs to be proprietary.

Current repo reality:

- Root `LICENSE` says most code is MIT, with AGPL components.
- `packages/sync/LICENSE` is AGPL.
- `packages/workspace/package.json` is MIT but depends on `@epicenter/sync`.
- Root `package.json` and app `package.json` say `UNLICENSED`.
- `ATTRIBUTION.md` acknowledges Whispering/Epicenter AGPL+MIT lineage.

Practical implication:

- MIT portions can be used in a proprietary commercial app if notices are retained.
- AGPL-linked code is the problem.
- The safest proprietary route is to remove AGPL code from the shipped app dependency path.
- Until that is complete, avoid broad "all rights reserved" language over the whole codebase.

Recommended public posture after cleanup:

```text
Mynah is proprietary software built on open-source components. Open-source licenses and acknowledgments are included in the app and documentation.
```

More precise internal posture:

```text
Mynah-specific product code, branding, packaging, and commercial distribution are proprietary. Third-party and upstream open-source components remain under their respective licenses.
```

Do not say yet:

```text
The entire repo/app is all rights reserved.
```

Owner/legal tasks:

1. Confirm upstream obligations for Whispering/Epicenter.
2. Confirm whether AGPL code is bundled or merely present in workspace.
3. Decide whether to remove AGPL packages before going private.
4. Decide whether to keep a source-offer/compliance page if any AGPL remains.
5. Treat broad "fully proprietary" public wording as owner/legal blocked until the above obligations are resolved.

Build 178 may still ship with careful wording:

```text
Mynah is proprietary software built on open-source components. Open-source licenses and acknowledgments are included in the app and documentation.
```

That wording is intentionally different from claiming the whole repo or every shipped component is all rights reserved.

## AGPL Workspace Cleanup Investigation

This is not a launch-day deletion.

### Current Dependency Findings

App dependency:

- `apps/speakpaste/package.json` depends on `@epicenter/workspace`.

Workspace dependency:

- `packages/workspace/package.json` depends on `@epicenter/sync`.

AGPL package:

- `packages/sync` is AGPL.

Current app imports:

- `apps/speakpaste/src/lib/workspace/definition.ts`
  - `defineKv`
  - `defineTable`
  - `InferTableRow`
- `apps/speakpaste/src/lib/whispering/index.ts`
  - `attachEncryption`
- `apps/speakpaste/src/lib/whispering/tauri.ts`
  - `attachIndexedDb`
  - `attachBroadcastChannel`
- `apps/speakpaste/src/lib/state/settings.svelte.ts`
  - `InferKvValue`
- `apps/speakpaste/src/lib/services/text/types.ts`
  - `MaybePromise`
- `apps/speakpaste/src/lib/recording-materializer.ts`
  - `MaybePromise`
  - `Table`

Functionality relying on workspace:

- settings KV
- recordings table
- transformation tables
- transformation run tables
- Yjs-backed IndexedDB persistence
- Markdown materialization
- reactive recording state
- same-origin BroadcastChannel syncing

### Why Removing `packages/sync` Directly Is Unsafe

`@epicenter/workspace` root barrel exports sync/RPC helpers and imports from `@epicenter/sync`.

Examples:

- `packages/workspace/src/index.ts` re-exports `RpcError` from `@epicenter/sync`.
- `packages/workspace/src/document/attach-broadcast-channel.ts` imports `BC_ORIGIN` from `@epicenter/sync`.
- App imports `attachBroadcastChannel`.

Therefore, deleting `packages/sync` can break the workspace package and app build.

### Safe Cleanup Direction

Option 1: Split a sync-free workspace entrypoint.

Create a new workspace subpath, for example:

```json
"./local": "./src/local.ts"
```

`local.ts` should export only:

- `defineKv`
- `defineTable`
- `attachEncryption`
- `attachIndexedDb`
- `attachKv`
- `attachTable`
- `attachTables`
- `InferKvValue`
- `InferTableRow`
- `Table`
- `MaybePromise`
- any local-only types actually used by Mynah

It must not export:

- `attachSync`
- `RpcError`
- `createRemoteActions`
- `peerPresence`
- `attachBroadcastChannel` if it still imports `@epicenter/sync`

Then update Mynah imports from:

```ts
from '@epicenter/workspace'
```

to:

```ts
from '@epicenter/workspace/local'
```

For BroadcastChannel:

- either remove it from Mynah if not needed
- or make a local copy that uses a local symbol:

```ts
const MYNAH_BC_ORIGIN = Symbol.for('mynah/broadcast-channel-origin');
```

Option 2: Vendor/copy minimal local workspace primitives into app.

Create app-local modules:

```text
apps/speakpaste/src/lib/local-workspace/
```

Copy/adapt only the primitives Mynah uses:

- table definitions
- KV definitions
- Yjs table/KV wrappers
- encryption attachment if still required
- IndexedDB attachment
- Markdown materialization interfaces

This is a larger refactor but gives the cleanest proprietary separation.

Option 3: Replace Yjs workspace entirely.

Use a simpler local persistence model:

- settings in localStorage or Tauri store/local file
- recordings metadata in SQLite/JSON
- transcripts as Markdown files
- no CRDT/Yjs

This is likely the clean long-term product direction, but it is too risky for current launch.

### Recommended Cleanup Plan

Do not block Build 178 on AGPL cleanup.

For `license-cleanup-remove-agpl-sync`:

1. Add `@epicenter/workspace/local` sync-free entrypoint.
2. Move app imports to that entrypoint.
3. Remove `attachBroadcastChannel` from app or provide sync-free local equivalent.
4. Run typecheck.
5. Build app.
6. Inspect bundle/dependency graph for `@epicenter/sync`.
7. Remove `@epicenter/sync` from `packages/workspace/package.json` only after no sync imports remain in exported app path.
8. Remove `packages/sync` from root workspaces only after all tests pass.

Parked model-hosting note:

- Parakeet currently depends on upstream `github.com/EpicenterHQ/epicenter` GitHub release assets. Do not address this in Build 178. During licensing/cleanup work, evaluate hosting or mirroring Mynah-owned model assets so user downloads are not dependent on upstream release availability.

Acceptance criteria:

- `rg "@epicenter/sync" apps/speakpaste packages/workspace/src/local.ts` returns no app-shipped dependency.
- App launches.
- Settings persist after restart.
- Recordings list persists after restart.
- Markdown materialization still works.
- Transformations still load if retained.
- `bun run typecheck` passes.
- Production build passes.

## Website Claim Gates

| Claim | Publish now | After Build 178 | After Router | After FM proof |
| --- | --- | --- | --- | --- |
| Audio/transcription/history stay on Mac | Yes | Yes | Yes | Yes |
| "Nothing leaves your Mac" | No | Yes, after packet validation | Yes | Yes |
| No hidden network fallback | No | Yes | Yes | Yes |
| Works fully offline after model download | No | Yes | Yes | Yes |
| Accessibility restart recovery | Roadmap tense only | Yes | Yes | Yes |
| Four writing modes | Roadmap tense only | Roadmap tense only | Yes | Yes |
| Raw transcript only; shaped output not stored | Roadmap tense only | Roadmap tense only | Yes | Yes |
| Apple on-device enhancement | Future tense only | Future tense only | Future tense only | Yes |
| Never uses Private Cloud Compute | No | No | No | Yes, re-verified per macOS update |

Pre-Build 178 hero:

```text
Speak. It types. Built to keep your words on your Mac.
```

Post-Build 178 hero:

```text
Speak. It types. Nothing leaves your Mac.
```

Current capability language:

```text
Mynah is a local-first dictation app for macOS. Hold Fn, speak, release, and your words appear at your cursor. Audio, transcription, and history stay on your Mac. Model downloads are explicit user actions.
```

Post-Build 178 privacy language:

```text
Mynah's privacy is architectural. Audio, transcription, history, diagnostics, and trial checks run on your Mac. The only network operation is downloading a speech model, which you initiate.
```

If website copy names model hosts for advanced-user reassurance, it must say model downloads may come from Hugging Face or GitHub Releases. Current sources are Hugging Face for Whisper/Moonshine and GitHub Releases for Parakeet. Do not claim Hugging Face is the only model host.

## Next Major Release: Local Writing Modes

This is not part of Build 178.

Modes:

- Dictate
- Clean Ramble
- List
- Prompt

Rules:

- Dictate is byte-identical passthrough.
- Clean Ramble tidies obvious filler/repeated words without changing meaning.
- List turns explicit or carefully inferred spoken lists into bullets/numbered steps.
- Prompt organizes rough thoughts into `Task`, `Context`, `Constraints`, and `Output Format`.
- Raw transcript remains the saved record.
- Shaped output is pasted and may be shown transiently only.
- Apple FM can enhance only if on-device status is proven.
- Intel/unsupported Macs use deterministic fallback.

Implementation branch:

```text
next-major-intent-router
```

Minimum PR sequence:

1. Pure TS `intent/` service and tests.
2. Rust active-app snapshot if needed.
3. Settings KV and UI picker.
4. Pipeline wiring.
5. Apple FM capability gate dark.
6. FM benchmark and owner sign-off.

## Stable Launch Recommendation

If launch must happen immediately from current build:

- Do not claim "Nothing leaves your Mac."
- Do not claim "works fully offline."
- Do not claim self-healing permissions.
- Use cautious local-first wording.
- Keep repo/license posture modest and attribution-forward.

If launch can wait for Build 178:

- Implement Build 178 hardening first.
- Packet-test network behavior.
- Validate Trial -> Lifetime install path.
- Then publish stronger website and release notes.

Recommended path:

```text
Ship Build 178 before broad public launch.
```

Reason:

- Build 178 is much smaller than AGPL cleanup.
- It fixes the most damaging trust contradictions.
- It enables the strongest website promise.
- It keeps AGPL/license cleanup off the critical path while still acknowledging the issue.

## Build 178 Validation Checklist

Runtime:

- App launches on Apple Silicon.
- App launches on Intel if available.
- Trial build status works offline.
- Lifetime build ignores trial state.
- Expired trial does not block Lifetime build.
- No trial network calls.
- User-started model download still works.
- Fn dictation works after fresh install.
- Fn dictation works after app replacement and Restart Mynah flow.
- Main window close-to-hide still works.
- Local diagnostics file can be opened/deleted.
- Settings persist.
- Recordings persist.
- Markdown materialization still works.

Network:

- Launch with network monitor.
- Perform 10 trial status checks.
- Record one dictation.
- Open history.
- Open diagnostics.
- No outbound connections except user-clicked model download.
- Trigger model downloads and confirm the only outbound connections are expected model hosts:
  - Whisper: `huggingface.co/ggerganov/whisper.cpp`
  - Moonshine: `huggingface.co/UsefulSensors/moonshine`
  - Parakeet: `github.com/EpicenterHQ/epicenter/releases/download/models`

Docs/site:

- README has no stale cloud provider claims.
- README has no Aptabase claim.
- README does not claim current Apple FM support.
- README does not claim current writing modes.
- Website uses pre/post-178 claim gates correctly.
- License/attribution page exists or is intentionally deferred with owner/legal review.

License:

- AGPL dependency path documented.
- No broad "all rights reserved" claim over the whole repo until cleanup/legal review.
- Open-source credits remain visible.

## Open Owner Decisions

1. Lifetime wording:

Recommended:

```text
One-time license for Mynah 1.x, including all 1.x updates.
```

2. Expired trial access:

Current interim plan:

- hard block with purchase path
- reassure user that recordings remain on disk

Later decision:

- whether expired users can access export/settings/history without dictation

3. Licensing/legal:

- confirm AGPL obligations
- decide exact public/proprietary wording
- decide whether source-offer/compliance route is needed if AGPL remains
- do not publish broad "fully proprietary" or whole-repo "all rights reserved" claims until owner/legal review clears them

## Final Priority Order

1. Preserve current stable state with branch/tag.
2. Build 178 hardening branch.
3. Validate Build 178.
4. Update website/README claim language.
5. Launch stronger local-only version.
6. Continue AGPL cleanup branch.
7. Build next-major Intent Router branch.
