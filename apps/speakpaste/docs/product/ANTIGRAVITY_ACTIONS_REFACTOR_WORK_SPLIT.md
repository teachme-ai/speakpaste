# Antigravity Work Split: Actions And Pipeline Refactor

## Purpose

This document splits the upcoming `actions.ts` / recording pipeline reengineering work between Codex and Antigravity.

The goal is to improve software design without breaking the current product behavior:

`Fn -> record -> transcribe locally -> paste -> preserve clipboard -> cooldown`

This is not a feature redesign. It is a behavior-preserving engineering cleanup.

---

## Ground Rules

- Do not change user-facing behavior unless the task explicitly says so.
- Do not change Rust recorder/transcription command signatures.
- Do not alter the current Fn trigger loop.
- Do not remove clipboard preservation behavior.
- Do not re-enable voice activation or hidden legacy surfaces.
- Prefer reports, inventories, and test plans from AG before code changes.
- Keep any AG code changes small and explicitly scoped.

---

## Current Refactor Target

Primary file:

- `apps/speakpaste/src/lib/query/actions.ts`

Related files:

- `apps/speakpaste/src/lib/query/delivery.ts`
- `apps/speakpaste/src/lib/query/transcription.ts`
- `apps/speakpaste/src/lib/query/transcription-cleanup.ts`
- `apps/speakpaste/src/lib/query/recorder.ts`
- `apps/speakpaste/src/lib/state/dictation-runtime.svelte.ts`
- `apps/speakpaste/src/lib/constants/app/timing.ts`
- `apps/speakpaste/src/lib/services/analytics/types.ts`
- `apps/speakpaste/src/lib/state/settings.test.ts`
- `apps/speakpaste/src/lib/query/transcription.test.ts`

---

## Work Split Summary

### Codex owns

- actual refactor commits in `actions.ts`
- runtime state service extraction
- guard helper implementation
- pipeline splitting
- error handling changes
- final behavior verification
- committing changes

### AG owns

- broad audit and inventory
- behavior characterization
- test case design
- magic number/event-name inventory
- side-effect mapping
- post-refactor validation reports

This keeps expensive coding tokens focused on implementation and lets AG handle broad reading/checklist work.

---

## Phase 0: Behavior Characterization

### AG Task 0A: Pipeline Side-Effect Map

AG should inspect `actions.ts` and produce a report listing every observable side effect in order.

Include:

- settings reads/writes
- recorder calls
- transcription calls
- delivery calls
- notification calls
- sound calls
- analytics events
- runtime status changes
- window events
- recording table writes
- blob/file writes
- cooldown transitions
- text-rule / transformation flows

Output file:

- `apps/speakpaste/docs/product/ANTIGRAVITY_ACTIONS_PIPELINE_SIDE_EFFECT_MAP.md`

No code changes.

### AG Task 0B: Behavior Test Plan

AG should produce a behavior-preserving test checklist.

Cover:

- normal Fn dictation
- double-start guard
- stop while busy
- cooldown retrigger block
- empty transcription
- transcription failure
- paste failure
- clipboard preservation default
- clipboard replace mode
- clipboard ask mode
- hidden-window dictation
- selected text rule flow
- audio save failure

Output file:

- `apps/speakpaste/docs/product/ANTIGRAVITY_ACTIONS_REFACTOR_TEST_PLAN.md`

No code changes.

---

## Phase 1: Constants Extraction

### AG Task 1A: Magic Number And Event Inventory

AG should scan for:

- cooldown durations
- paste/delivery timing literals
- pipeline event names
- repeated toast/status strings
- repeated command IDs
- repeated recording mode strings

Output:

- `apps/speakpaste/docs/product/ANTIGRAVITY_ACTIONS_CONSTANTS_INVENTORY.md`

AG may propose constants but should not edit code unless explicitly instructed.

### Codex Task 1B

Codex will extract low-risk constants into existing constants modules and verify build/tests.

---

## Phase 2: Runtime State Encapsulation

### AG Task 2A: State Variable Usage Audit

AG should map every read/write of:

- `isRecordingOperationBusy`
- `isCooldown`
- `isPipelineRunning`
- `manualRecordingStartTime`

For each variable, list:

- where it is set
- where it is read
- what invariant it protects
- what could break if moved incorrectly

Output:

- `apps/speakpaste/docs/product/ANTIGRAVITY_ACTIONS_RUNTIME_STATE_AUDIT.md`

No code changes.

### Codex Task 2B

Codex will create a small runtime state service/wrapper and move the variables without changing behavior.

---

## Phase 3: Guard Helper Extraction

### AG Task 3A: Guard Pattern Review

AG should identify duplicated guard/mutex patterns and propose the smallest reusable helper shape.

Output:

- `apps/speakpaste/docs/product/ANTIGRAVITY_ACTIONS_GUARD_HELPER_REVIEW.md`

No code changes.

### Codex Task 3B

Codex will implement guard helpers and apply them incrementally.

---

## Phase 4: Pipeline Splitting

### AG Task 4A: Stage Boundary Proposal

AG should propose exact stage boundaries for `processRecordingPipeline`.

Include:

- suggested function names
- inputs/outputs
- side effects per stage
- failure behavior per stage
- which stages must remain latency-critical

Output:

- `apps/speakpaste/docs/product/ANTIGRAVITY_ACTIONS_PIPELINE_STAGE_PROPOSAL.md`

No code changes.

### Codex Task 4B

Codex will split `processRecordingPipeline` into private focused functions first, without moving files or changing behavior.

---

## Phase 5: Telemetry Consolidation

### AG Task 5A: Telemetry Inventory

AG should list all telemetry/analytics calls in the pipeline and recommend a compact helper interface.

Output:

- `apps/speakpaste/docs/product/ANTIGRAVITY_ACTIONS_TELEMETRY_INVENTORY.md`

No code changes.

### Codex Task 5B

Codex will extract timing helpers if the earlier refactor is stable.

---

## Phase 6: Post-Refactor Validation

### AG Task 6A: Validation Pass

After Codex completes each code slice, AG should validate against the behavior test plan.

Output:

- `apps/speakpaste/docs/product/ANTIGRAVITY_ACTIONS_REFACTOR_VALIDATION.md`

Include:

- build result
- tests run
- manual/installed-app checks if performed
- any behavior mismatch
- exact file/line concerns

---

## Recommended Execution Order

1. AG Task 0A: side-effect map
2. AG Task 0B: behavior test plan
3. AG Task 1A: constants inventory
4. Codex Slice 1: constants extraction
5. AG Task 2A: runtime state audit
6. Codex Slice 2: runtime state encapsulation
7. AG Task 3A: guard helper review
8. Codex Slice 3: guard helper extraction
9. AG Task 4A: pipeline stage proposal
10. Codex Slice 4: pipeline splitting
11. AG Task 5A: telemetry inventory
12. Codex Slice 5: telemetry helper extraction
13. AG Task 6A: validation

---

## Short Prompt To Give AG

Read:

- `apps/speakpaste/docs/product/ANTIGRAVITY_ACTIONS_REFACTOR_WORK_SPLIT.md`

Start with:

- AG Task 0A
- AG Task 0B
- AG Task 1A

Write outputs exactly to the file paths named in the document.

Do not make code changes unless explicitly asked.

---

## Success Criteria

- `actions.ts` becomes smaller and easier to reason about.
- Behavior does not regress.
- Clipboard preservation remains intact.
- Fn dictation remains stable.
- Hidden-window dictation remains stable.
- Tests/build pass after each Codex slice.
- AG handles broad audit/reporting work so Codex tokens are spent mainly on implementation.

