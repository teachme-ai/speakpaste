# Antigravity Parallel Work Instructions

Date: 2026-06-03

Branch:

- `local-only-product-surface`

Latest implementation commit at time of writing:

- `5eb1d96` - `Persist local analytics signals`

## Purpose

This file is the active coordination brief for parallel Antigravity work while Codex continues implementation locally.

Use this document when delegating work to Antigravity so the outputs land in the right places and can be consumed directly without manual translation.

## Important Guardrails

- Prefer **analysis, audit, and spec work** over risky runtime code changes.
- Do **not** redesign the architecture or reopen already-validated runtime decisions unless the task explicitly asks for that.
- Do **not** make broad refactors.
- If a task proposes code changes, keep them as recommendations in markdown unless explicitly asked to implement.
- Stay aligned with the current product direction:
  - local-only
  - no cloud telemetry
  - background-safe dictation
  - simplified settings
  - reduced Whispering/Wispr-like product surface

## Current Codex Implementation Lane

Codex is currently working on:

1. local dictation quality hardening
2. local observability / analytics persistence
3. diagnostics usability
4. final product-surface cleanup informed by audits

Antigravity outputs should support those lanes, not compete with them.

## Priority Order For Antigravity

Run these in this order unless told otherwise.

### Task 1: Diagnostics Usability Spec

#### Goal

Design the smallest useful diagnostics experience for launch.

This should help us use the new local analytics log without creating a heavy dashboard.

#### Focus

Propose a lean, user-respectful diagnostics surface for a local-only Mac app.

At minimum consider:

- open diagnostics folder
- copy diagnostics path
- export diagnostics bundle
- clear diagnostics
- short explanation of what is stored locally
- where this belongs in Settings

#### Constraints

- no cloud concepts
- no transcript/audio content in diagnostics
- no heavy dashboard requirement
- should feel like a support/verification utility, not surveillance

#### Output File

Write results to:

`apps/mynah/docs/product/ANTIGRAVITY_DIAGNOSTICS_USABILITY_SPEC.md`

#### Why This Matters Now

Codex will use this output directly in the next implementation slice.

This is the most important AG output for current coding work.

---

### Task 2: Settings Wording Audit

#### Goal

Audit the current settings surface and identify jargon, confusing terms, leftover internal language, and wording that still feels inherited from older products.

#### Focus

Review user-facing wording across:

- Home surface labels
- Voice / recording labels
- Models / engine labels
- Trigger / shortcut labels
- Privacy / local analytics labels
- Text rules / transformation wording
- output language wording

For each issue found, provide:

- file or route
- current wording
- why it is confusing
- recommended replacement wording

#### Constraints

- do not redesign the whole UI
- do not propose long marketing copy
- optimize for normal Mac users, not technical users
- avoid exposing internal implementation terms unless required

#### Output File

Write results to:

`apps/mynah/docs/product/ANTIGRAVITY_SETTINGS_WORDING_AUDIT.md`

#### Why This Matters

Codex will use this after the diagnostics slice for settings/product-surface polish.

---

### Task 3: Release Readiness Checklist

#### Goal

Create a crisp pre-release checklist for this local-only launch phase.

#### Focus

The checklist should cover:

- correct installed app path
- build artifact sanity
- first-run permissions
- restart persistence
- hidden-window dictation
- local analytics log persistence
- silence-tail sanity checks
- confirmation that tested app is the actual app to ship

Separate:

- must-pass before release
- nice-to-have
- deferred

#### Constraints

- practical and short
- not a generic release template
- tailored to Mynah’s current state

#### Output File

Write results to:

`apps/mynah/docs/product/ANTIGRAVITY_RELEASE_READINESS_CHECKLIST.md`

#### Why This Matters

This will support the final stabilization pass after implementation and manual testing.

---

### Task 4: Product Surface Residual Audit

#### Goal

Do one more pass on remaining residual routes and surfaces that may still feel legacy or too internal.

#### Focus

Review and classify any remaining concerns around:

- `/recordings`
- `/transformations`
- `/debug`
- route reachability by direct URL
- menu/popover leftovers
- wording or layout patterns that still echo Whispering/Wispr unnecessarily

For each finding provide:

- route or file
- issue
- severity
- recommended action:
  - keep
  - hide
  - redirect
  - merge
  - delete later

#### Constraints

- do not reopen already-validated core runtime behavior
- do not mix speculative redesign with audit findings

#### Output File

Write results to:

`apps/mynah/docs/product/ANTIGRAVITY_PRODUCT_SURFACE_RESIDUAL_AUDIT.md`

#### Why This Matters

Codex may use this in a later cleanup slice, but it is lower priority than diagnostics and wording.

## Files Antigravity Should Read First

Before doing the tasks above, Antigravity should review:

- `apps/mynah/docs/product/CURRENT_PHASE_STATUS.md`
- `apps/mynah/docs/product/ANTIGRAVITY_PERFORMANCE_MATRIX.md`
- `apps/mynah/docs/product/ANTIGRAVITY_BENCHMARK_CORPUS_RUNBOOK.md`
- `apps/mynah/docs/product/ANTIGRAVITY_REVIEW_FULL_PRODUCT_SURFACE_AUDIT.md`
- `apps/mynah/docs/product/OBSERVABILITY_AND_TEST_STRATEGY.md`

## Files Codex Will Consume Directly

These outputs are most likely to affect the next live implementation slices:

1. `ANTIGRAVITY_DIAGNOSTICS_USABILITY_SPEC.md`
   - direct input into Codex diagnostics usability implementation

2. `ANTIGRAVITY_SETTINGS_WORDING_AUDIT.md`
   - direct input into settings/product-language polish

3. `ANTIGRAVITY_RELEASE_READINESS_CHECKLIST.md`
   - direct input into final release stabilization and manual validation

The residual audit is useful, but not the first thing Codex needs.

## Completion Format For Antigravity

At the top of each output file, include:

- branch tested
- latest commit reviewed
- whether work is:
  - audit only
  - audit + recommendations
  - audit + proposed implementation plan

## Summary

If you want the shortest delegation possible, send Antigravity this:

1. Read `ANTIGRAVITY_PARALLEL_WORK_INSTRUCTIONS.md`
2. Complete Task 1 first
3. Write outputs exactly to the named markdown files
4. Do not make broad code changes unless explicitly requested
