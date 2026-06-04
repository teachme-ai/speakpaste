# Current Phase Status

Date: 2026-06-02

## Executive State

SpeakPaste is now launch-stable for the core local dictation loop.

Current release blocker:

- `RB-001` in `RELEASE_BLOCKING_ISSUES.md`: macOS Accessibility can appear selected in System Settings but not activate the currently running SpeakPaste app after reinstall/replacement. Treat stale Accessibility self-repair as not release-ready until this is fixed and validated.

Validated:

- local-only product surface cleanup
- simplified settings/control center
- background-safe window close behavior
- native window recovery menu action
- runtime settings bridge
- Rust-owned Fn/native trigger capture handoff
- Rust-owned primary global shortcut registration
- live native shortcut reload after settings changes
- installed `/Applications/SpeakPaste.app` runtime validation

The app can now be treated as a working local macOS dictation product, not only a prototype.

## Original 24-48 Hour Plan Status

### Phase 0: Commit Baseline Docs

Status: done.

Docs are committed under `apps/speakpaste/docs/product`.

### Phase 1: Inventory And Remove Cloud Product Surface

Status: substantially done.

Completed:

- cloud/API/provider surface removed from visible launch product
- local-only baseline documented
- settings moved toward local control center
- advanced/unfocused controls hidden or demoted
- updater deferred

Remaining:

- final local-only package sweep before release
- confirm lockfile/distribution bundle does not accidentally include unused cloud packages

### Phase 2: Add Local Intent Router MVP

Status: not yet implemented as a dedicated router.

Current app still primarily uses:

- raw dictation
- deterministic text rules / transformations
- selected transformation pipeline

Remaining:

- define local intent types
- add deterministic classifier
- add tests
- wire router before paste with safe raw-dictation fallback

### Phase 3: Add Local Actions

Status: partial through existing deterministic transformations.

Remaining:

- rename/reframe as local writing modes if product direction still wants it
- add first-class modes such as Dictate, Clean Up, Bullets, Prompt Shape
- add mode-specific tests

### Phase 4: Add Local Analytics Lite

Status: not yet implemented as a visible local intelligence dashboard.

Remaining:

- local metric event shape
- aggregate counters
- latency/session/word/paste metrics
- persona-style local insight surface
- ensure no transcript/audio/private content in metrics

### Phase 5: Apple Framework Spike

Status: deferred.

Reason:

- not needed for launch-stable core dictation
- user does not want local LLM dependency
- Apple Natural Language / Foundation Models availability should remain optional

### Phase 6: Whole Package Smoke

Status: core runtime smoke passed.

Remaining:

- distribution packaging smoke
- first-run non-dev user smoke
- design/polish smoke after UI refresh

## Backend-Owned Runtime Status

Current completed slices:

- Slice 1: launch-safe background app
- Slice 2: backend runtime state skeleton
- Slice 3: runtime settings bridge
- Slice 4A: native trigger/capture handoff
- Slice 4B: native primary shortcut ownership

Remaining backend north-star slice:

- Slice 5: move transcription, deterministic text rules, paste delivery, and runtime analytics fully into Rust.

Recommendation:

Do not start Slice 5 today unless a runtime bug forces it. The validated hybrid runtime is stable enough. Today is better spent on distribution readiness, first-run UX, and design identity.

## Today's Recommended Work Order

1. Design thread produces a concrete visual direction for the home surface.
2. Implementation lane prepares distribution/packaging audit prompt for AG.
3. Codex implements only a small home-surface visual refresh after design direction is chosen.
4. AG validates the refreshed app against the runtime checklist.
5. Decide whether local intent router is still part of today's launch scope or becomes the next product milestone.

## Not Done Yet

- product rename
- DMG/signing/notarization
- release-blocking Accessibility stale-entry/current-process recovery fix
- first-run model onboarding polish
- local intent router
- local analytics dashboard
- Apple Natural Language / Foundation Models bridge
- full Rust-owned transcription/paste pipeline
