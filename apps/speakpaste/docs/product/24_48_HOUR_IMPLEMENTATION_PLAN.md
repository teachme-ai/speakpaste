# 24-48 Hour Implementation Plan

Status: execution plan
Date: 2026-06-01

## Objective

Pivot the current app toward the local-only sovereign language layer without destabilizing the working local dictation path.

The target is not to finish every long-term feature. The target is to make the app's product direction, settings surface, and first local writing modes match the new baseline.

## Working Rule

Do not start with the hardest Apple framework integration.

Start with deterministic local behavior that works everywhere:

```text
local transcription -> local intent router -> local action -> cursor paste -> local metric
```

Then add Apple Natural Language and Foundation Models as enhanced layers.

## Phase 0: Commit Baseline Docs

Files:

- `LOCAL_ONLY_BASELINE.md`
- `SOVEREIGN_LANGUAGE_LAYER_PRD.md`
- `LOCAL_INTENT_ROUTER_ARCHITECTURE.md`
- `WHISPER_CPP_ENGINE_NOTES.md`
- `OBSERVABILITY_AND_TEST_STRATEGY.md`
- `24_48_HOUR_IMPLEMENTATION_PLAN.md`

Validation:

- Review docs.
- Commit docs before code changes.
- Use these docs as the shared baseline for Codex, Antigravity, and other coding agents.

## Phase 1: Inventory And Remove Cloud Product Surface

Goal:

Remove or transfer inherited cloud/provider UI from the user-facing product.

Tasks:

- Inventory routes and settings related to cloud transcription and cloud completion.
- Remove API key settings from visible navigation.
- Remove cloud providers from visible transcription selection.
- Remove remote provider copy, pricing, and model descriptions from the product surface.
- Keep local engine settings reachable.
- Replace "Transformations" product language with "Writing Modes" or "Local Actions."
- Add or update technology disclosure copy.

Testing:

- `bun run typecheck`
- Manual settings navigation smoke test.
- Confirm local transcription path still works.

## Phase 2: Add Local Intent Router MVP

Goal:

Add deterministic local routing after transcription and before delivery.

Tasks:

- Define local intent types.
- Add classifier function.
- Add app category type.
- Add local writing mode presets.
- Add unit tests for classification.
- Wire router into the transcription pipeline with safe fallback to Dictate.

Initial intents:

- `dictate`
- `clean_ramble`
- `make_prompt`
- `reply`
- `bulletize`
- `rewrite_selection`
- `summarize_short`
- `todo`

Testing:

- Bun unit tests for router.
- Manual dictation smoke test.
- Confirm fallback to raw dictation when router fails.

## Phase 3: Add Local Actions

Goal:

Make the first modes useful without Foundation Models.

Tasks:

- Implement Dictate cleanup.
- Implement Clean Ramble as deterministic cleanup.
- Implement Prompt mode using a local template.
- Implement Reply mode using a local template.
- Implement Bullets mode using deterministic line/bullet formatting.
- Add mode-specific tests.

Testing:

- Bun unit tests for mode outputs.
- Manual paste test in Notes or a text editor.

## Phase 4: Add Local Analytics Lite

Goal:

Create a small local dashboard and local metric store.

Tasks:

- Define local metric event shape.
- Store aggregate counters locally.
- Track sessions, words, latency, paste status, engine/model, and mode.
- Add dashboard cards.
- Avoid storing transcript/audio/selected text in analytics.

Testing:

- Unit tests for aggregation.
- Manual record/paste/dashboard smoke test.
- Inspect storage to confirm no private content in metrics.

## Phase 5: Apple Framework Spike

Goal:

Create the capability bridge without making the app depend on it.

Tasks:

- Add runtime capability command.
- Add Apple Natural Language bridge if environment is ready.
- Add Foundation Models availability check if SDK is ready.
- Expose capability status in UI.
- If possible, implement one Foundation Models-enhanced action: Clean Ramble.

Fallback:

- If Apple framework integration takes too long, keep deterministic local actions and commit the adapter interface only.

Testing:

- Availability false path.
- Availability true path if test machine supports it.
- Manual dictation with and without enhancement.

## Phase 6: Whole Package Smoke

Checklist:

- Launch app.
- Confirm local-only disclosure.
- Confirm settings no longer look like a cloud provider dashboard.
- Download/select local model if needed.
- Record.
- Transcribe.
- Apply writing mode.
- Paste at cursor.
- Confirm local dashboard updates.
- Quit and reopen.
- Confirm settings and local metrics persist.

## Agent Usage

Use Codex as primary implementer.

Use Antigravity for:

- Parallel UI copy review.
- Product wording.
- Checklist verification.
- Search/research.

Use Claude Code only if needed for:

- Diff review.
- Risk review.
- One-off test suggestions.

Do not run multiple agents editing the same files in parallel.

## Suggested Work Slices

### Slice A: Product Surface

Owner: primary coding agent.

Files likely touched:

- settings routes
- navigation components
- transcription selector
- product copy

### Slice B: Intent Router

Owner: primary coding agent or one isolated worker.

Files likely added:

- local intent router module
- tests
- mode definitions

### Slice C: Local Analytics

Owner: primary coding agent.

Files likely added:

- local metric types
- aggregation module
- dashboard UI

### Slice D: Apple Bridge

Owner: primary coding agent after A-C stabilize.

Files likely added:

- Tauri command
- Swift helper or plugin bridge
- capability UI

## Kickoff Checklist

1. Commit baseline docs.
2. Create a small branch for local-only pivot.
3. Run current typecheck before edits.
4. Implement Phase 1.
5. Typecheck and smoke test.
6. Implement Phase 2 with tests.
7. Implement Phase 3 with tests.
8. Implement Phase 4.
9. Attempt Phase 5 only after core flow is stable.
10. Final smoke test.

## Done Definition

The 48-hour pivot is done when:

- Product docs are committed.
- User-facing cloud settings are removed or transferred.
- Local dictation still works.
- At least three local writing modes work.
- Intent router has unit tests.
- Local analytics dashboard shows basic value.
- App clearly communicates local-only and sovereign-data behavior.
- No remote analytics are sent.
