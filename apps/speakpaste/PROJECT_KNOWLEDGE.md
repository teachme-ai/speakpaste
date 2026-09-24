# Mynah app project knowledge

Updated: 2026-09-19

## Current execution authority

- `docs/product/MULTI_AGENT_EXECUTION_PLAN_V2.md` controls the next implementation sequence: first-wave review, measurable contracts and repairs, diagnostics/recovery/intelligence, measured optimizations, independent validation, then remaining feature backlog.
- The user requested a multi-agent implementation plan after stopping work. Only documentation was changed for this request; application implementation remains paused.
- One coordinator and up to three workers, exclusive source/build/benchmark leases, independent reviews, required observability per packet and explicit correctness/quality/performance gates are specified.
- Earlier Integrated labels are not runtime verification. Cargo checks and existing router tests do not prove cancellation safety, listener lifecycle, audio quality or a linked app. Revalidate those changes first.
- The developer has an M5. Efficient-profile constraints do not emulate other chips; cross-device claims require actual device evidence. Timing budgets remain provisional until measured, and quality must accompany latency comparisons.

## Confirmed scope and decisions

- User accepted the app source-review findings and requested a detailed implementation/enhancement plan.
- Windows was considered and explicitly excluded. Focus on the Mac app.
- App is free to download/use. No mandatory paid inference dependency is planned.
- Scope is this app directory; website and other codebases are excluded.
- Retain Rust/Tauri, Svelte, and Swift framework adapters.

## Current artifact

- Forward plan: `docs/product/MAC_APP_IMPLEMENTATION_PLAN.md`.
- Covers native pipeline repair, async Foundation Models bridge, voice editing, prompt creation, personalization, streaming/performance, local actions, optional technology evaluation, and validation/release gates.
- Recommended start: coordinator BOOT, three bounded baseline workers, then C0 contract/seam gate. Dispatch using the task catalog, not the former sequential batch numbers.
- Companion analysis: `docs/product/CORE_TECH_UX_AND_USER_OPPORTUNITIES.md`, covering rolling-energy silence scanning, quiet-speech/VAD evaluation, endpointing, stable partials, audio callback allocation, native panel/capture experiments, UI recovery/accessibility, and user opportunity validation.
- At the user's explicit request, these companion recommendations are now integrated directly into `MAC_APP_IMPLEMENTATION_PLAN.md`: priority-user matrix, source findings, Phases 3C–3E UI/accessibility, detailed Phase 5 algorithms/native experiments, language/script behavior, pilot protocol, and 14 detailed sub-batches with dependencies and evidence gates. The main plan is the implementation source of truth; the companion retains research context.
- The user subsequently requested a redesign for multi-agent implementation. Main-plan Section 13 now defines one coordinator plus up to three workers, contract-first dispatch, exclusive file/build/Mac-test leases, integration gates, and handoff/review/rollback rules. Feature phases retain their full requirements; their numbering is not the execution order.
- `docs/product/MULTI_AGENT_TASK_CATALOG.md` is the execution dependency graph and bounded work-packet catalog. It maps every prior batch/sub-batch to new IDs, separates experiments and human pilot work, and avoids false dependencies between router/FM/UI and between streaming/batch retry.

## Important source findings

- `src-tauri/src/dictation_state_machine.rs` currently pastes raw transcription; existing frontend intent router is not integrated into that native path.
- Native stop processing awaits work within the command loop, delaying cancellation.
- Native path does not enforce configured auto-paste/text rules.
- Paste can return `Ok("paste_failed")` and be treated as completed by the caller.
- Swift Foundation Models calls use blocking timeout bridges without cancelling the generation task.
- Existing Metal/Core ML configurations and model caching should be measured rather than presented as missing features.
- Historical status docs and pipeline tests may describe retired implementations.
- Additional source findings: fixed RMS threshold and overlapping full-window recomputation in silence trimming; callback allocations; fixed home/history window dimensions; List-mode mismatch between router and visible general settings. These are source observations, not installed-app reproductions.
- Current competitor features show that styles/dictionaries/context are not unique positioning. Prioritize testing faithful prompt creation and multilingual workflows; no population-wide voice adoption-growth estimate was established.

## Policy and limits

- `LOCAL_ONLY_BASELINE.md` historically prohibits cloud and third-party local generative models. Latest discussion accepts their evaluation; the plan preserves a local shipping baseline and requires an explicit policy reconciliation before adopting optional providers. No cloud fallback is enabled or authorized by this document.
- Findings are based on source review, not installed-app benchmarks. Establish checkout/installed build identity before implementation.
- Implementation has started in the app source only. Contract types, Rust delivery decision helpers, and the first runtime cancellation/state pass are present but uncommitted. Website and other codebases remain untouched.
- The first source wave is still under coordinator review. Native end-to-end verification is blocked by the pre-existing Swift SDK/compiler mismatch and local module-cache issue recorded in `docs/product/agent-work/STATUS.md`.
- The installed Xcode 26.6 toolchain is the matching SDK/compiler pair. Use `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` for app builds; both debug and release Cargo checks now succeed with the real Foundation Models bridge. The build script uses an app-local Clang module cache and keeps a debug-only fallback for machines with mismatched Apple toolchains.
- Multi-agent redesign verification: independent read-only dependency/conflict review, task ID/dependency-cycle/traceability checks, main-plan section preservation and local document links. Implementation ledger is to be created at BOOT; no task is claimed implemented or shipped. Benchmark targets and pilot size/duration remain proposals, not measured outcomes.
