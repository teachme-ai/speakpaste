# Mynah multi-agent task catalog

Execution update (2026-09-19): [Revision 2](MULTI_AGENT_EXECUTION_PLAN_V2.md) controls the next dispatch sequence and verification gates. This catalog retains broader feature requirements. Original creation status below is historical, not current implementation status.

Date: 2026-09-14. Status: all tasks planned; no implementation dispatched by creation of this catalog.

Read [the main plan](MAC_APP_IMPLEMENTATION_PLAN.md), especially Sections 12–13, before dispatch. That plan defines behavior, team capacity, leases, contracts, and gates. This catalog defines the dependency graph and bounded work packets. Both are app-only and Mac-only.

`Requires` lists hard dependencies that must be accepted on the assigned base. A row with `—` has no task dependency. Experimental policy/hardware gates still apply. Scope hints are relative to the app and must become exact write allowlists at dispatch; proposed modules are not claims that files already exist. Coordinator-owned shared wiring is excluded from worker scopes even when listed as an integration touchpoint.

## Foundation packets

| ID | Owner | Requires | Scope / deliverable | Acceptance evidence |
| --- | --- | --- | --- | --- |
| BOOT | Coordinator | — | Record checkout/installed identities, user changes, host/tool availability; create ownership/status ledger and isolated workspaces or file leases | Preserved baseline, actual app scope, worktree/shared-directory strategy, no invented clean build |
| B-NATIVE | Runtime worker | BOOT | Read-only trigger/state/FFI/delivery/audio audit; write task report and native test inventory | Reproduction or explicit unverified status for Section 2 findings; host capability and minimum-OS questions |
| B-UI | UI worker | BOOT | Read-only setup/home/settings/overlay audit; task-specific UX checklist | Current mode mapping, small-screen/focus/accessibility checks, retired event paths |
| B-EVAL | Validation worker | BOOT | App-local evaluation fixtures/harness and benchmark protocol; baseline quality/task metrics | Dataset provenance, cold/warm protocol, existing failures, separate synthetic/consented material |
| C0 | Coordinator with specialist reviewers | B-NATIVE, B-UI, B-EVAL | Section 13B contract package, fixture adapters, minimal module seams, schema migration design, feature flags | Cross-language fixtures and baseline build; versioned ABI/events; exact owners; stubs cannot claim production success |
| RUNTIME | Runtime worker | C0 | State machine/manager/runtime and lifecycle tests; use agreed config adapter | Responsive command loop, stale-result rejection, explicit commit boundary, App Nap/capture cleanup; all state transitions tested |
| DELIVERY | Mac worker | C0 | Proposed `src-tauri/src/delivery/` module; pasteboard snapshots, focus checks, typed results; coordinator extracts old `lib.rs` implementation | Clipboard race/failure fixtures, modifier release, auto-paste off, verified versus attempted outcome; real-Mac checks identified |
| INTENT | Intelligence worker | C0 | Proposed `src-tauri/src/intent/` and deterministic formatters; port reviewed router fixtures | Spoken overrides opt-in, ordinary content preserved, verbatim/rule precedence, no duplicate branch implementations |
| FM | Intelligence worker | C0 | `src-tauri/src/fm_bridge.rs` and `swift/MynahFM/Sources/MynahFM/`; async bridge, typed structures, capability/fallback | FFI lifetime/late callback/cancel/timeout tests, actual supported-host generation, unchanged is distinct from failure |
| UI-BASE | UI worker | C0 | Home/setup/settings and app-local components using fixture-backed adapters; registry-driven actions, geometry, accessible onboarding | Type/build checks, all fixture states, keyboard/VoiceOver/contrast/motion test list; native acceptance deferred to gate |
| G-CORE | Coordinator | RUNTIME, DELIVERY, INTENT | Connect native pipeline, config migration, trigger wiring and native-to-UI compatibility | Section 13G core gate on integrated revision; no frontend-owned paste; no cancelled pre-commit result delivered |
| V-ENHANCED | Independent validation worker | G-CORE, FM, UI-BASE | Native end-to-end tests plus focused semantic/capability fixtures | Real Fn path invokes formatting; hidden window, unavailable FM, timeout, unchanged, cancellation, and content-free logs |
| G-ENHANCED | Coordinator | V-ENHANCED | Integrate reviewed fixes and record enhanced-mode gate | Relevant Section 12 checks pass on exact artifact; unresolved baseline/hardware issues explicit |

Review/integration of FM can run independently of INTENT once C0 is accepted. If both need the same intelligence file lease, schedule them sequentially or give disjoint new modules; do not invent a dependency to conceal a file conflict.

## Editing and prompt packets

| ID | Owner | Requires | Scope / deliverable | Acceptance evidence |
| --- | --- | --- | --- | --- |
| MAC-EDIT | Mac worker | C0, DELIVERY | Proposed native context/edit modules: bounded selection capture, target fingerprint, apply/undo; keyboard/copy fallback | Secure-field exclusion, timeout, changed target, stale undo and clipboard cases; adapters obey DELIVERY commit semantics |
| PROMPT | Intelligence worker | C0 | Proposed prompt extraction/rendering module and fixtures; source-grounded task/context/constraints/questions | Short/long/mixed-language fidelity; omit invented fields; deterministic renderer; integration request for FM adapter |
| UI-EDIT | UI worker | UI-BASE | Edit/prompt previews, original/result comparison, typed instruction, copy/retry/last-result recovery | Fixture and keyboard tests; typed/voice requests equivalent; no direct insertion; geometry/focus requirements |
| V-FEATURE | Independent validation worker | G-ENHANCED, MAC-EDIT, PROMPT, UI-EDIT | Composed dictation/edit/prompt regression; accessibility and host-application matrix | Wrong-target/cancel/undo cases, factual preservation, actual onboarding/insertion, small screen and native focus tests |
| G-FEATURE | Coordinator | V-FEATURE | First differentiated release candidate; feature flags and migration/rollback verification | Sections 7 and 12 satisfied on integrated artifact; document any unverified platform cases; no publishing implied |

PROMPT can develop against C0 fixture generation while FM is in progress. FM integration is mandatory before V-FEATURE through G-ENHANCED. Existing Swift file changes require the FM author's handoff; isolated prompt modules avoid concurrent edits.

## Personalization packets

| ID | Owner | Requires | Scope / deliverable | Acceptance evidence |
| --- | --- | --- | --- | --- |
| PERSONAL | Runtime/intelligence worker | C0 | Proposed profile/glossary/language services; scoped preferences, explicit saving, import/export/delete; schema change requests | No context leakage; old settings migrate; vocabulary hints do not force words; script/translation distinction |
| UI-PERSONAL | UI worker | UI-BASE | Profile, glossary, language/script and retention controls against agreed contracts | Discoverable overrides, reversible saves, keyboard access and fixture state coverage |
| FOLLOWUP | Runtime worker | G-FEATURE, PERSONAL | Bounded last-result revision service, stale-target checks and version history; request shared UI/config wiring | Replace versus append, correction ambiguity, expiring target/undo, prior-version recovery |
| V-PERSONAL | Independent validation worker | FOLLOWUP, UI-PERSONAL | Integrated glossary/profile/language/follow-up regression | Cross-app isolation, mixed-language entities, spoken and typed revisions; Section 8 acceptance |
| G-PERSONAL | Coordinator | V-PERSONAL | Integrate and gate personalization release increment | Migration/feature-off behavior and actual consumer integration verified |

PERSONAL does not wait for prompt creation. C0 must include the agreed persistence and language contracts, or the coordinator must land a versioned contract extension before dispatching either producer or UI consumer.

## Audio and native performance packets

| ID | Owner | Requires | Scope / deliverable | Acceptance evidence |
| --- | --- | --- | --- | --- |
| A-RMS | Audio worker | B-NATIVE, B-EVAL | Silence scan helper and benchmarks in transcription; coordinator handles shared module extraction if needed | Rolling-energy boundary parity, invalid sample handling, silence-heavy O(N) timing comparison; no classifier change |
| A-BUFFER | Audio worker | C0 | Recorder/WAV writer buffer ownership, bounded queue, error propagation, retention-aware memory/spill prototype | No silent drops; overflow/disk/device failures; callback duration and memory bound; compare block encoding before adoption |
| A-VAD | Audio worker | A-RMS, A-BUFFER | Isolated segmentation/endpoint module; adaptive noise, hysteresis, short/patient pauses | Quiet words/ends retained, false/missed speech rates, release/toggle/VAD semantics, no always-on pre-roll |
| A-POWER | Runtime/audio worker | A-BUFFER | Model manager scheduling and native trace adapter; thermal/memory policy | Cold/warm/memory/thermal measurements; metadata-only traces; speculative work reduced before quality |
| A-STREAM | Audio worker | C0, A-BUFFER | Engine partial-result adapter, overlap alignment and stable-prefix logic using existing endpointing initially | Boundary duplicate/loss rates, revision rate, memory bound, comparison with whole-utterance decode |
| A-RETRY | Audio/intelligence worker | C0, B-EVAL | Batch-ASR retry policy and score calibration; bounded alternate decode/engine route | Reduced correction/entity errors within energy/latency budget; no fabricated certainty or forced glossary words |
| V-AUDIO | Independent validation worker | G-CORE, A-VAD, A-POWER, A-STREAM, A-RETRY | Integrated capture/decode regression and uncontended performance run | Section 9/12 gates; deterministic versus behavioral changes measured separately; feature-off baseline works |
| G-AUDIO | Coordinator | V-AUDIO | Adopt individually supported improvements and record benchmark decisions | Quality/performance evidence per hardware class; unsuccessful experiments remain disabled/deferred |

A-RMS can begin after accepted baseline reports while C0 proceeds, using disjoint files or a temporary pure helper. A-RETRY deliberately does not depend on streaming: evaluate the batch-ASR policy first. A streaming-specific retry extension requires A-STREAM later. A-STREAM can use existing endpointing; only integration of the new adaptive VAD requires A-VAD. Buffer integration precedes capture-loop VAD integration to prevent competing rewrites.

G-AUDIO covers the combined later enhancement set. Individual reliability fixes may ship with G-CORE/G-FEATURE after their own affected tests and reviewer acceptance; the whole audio bundle is not a prerequisite for a product release.

## Local actions, research, and release packets

| ID | Owner | Requires | Scope / deliverable | Acceptance evidence |
| --- | --- | --- | --- | --- |
| DRAFTS | Intelligence worker | FM, INTENT | Typed meeting brief/action-list/note output and preview contract | Missing facts stay missing; schema/fidelity fixtures; preview/copy/export useful without side effects |
| APP-INTENTS | Mac worker | C0, DRAFTS | App Intents packaging spike, then scoped native action adapter and integration requests | No implicit sending; validated dates/destinations; idempotent retry; real Shortcuts test before claiming availability |
| UI-ACTIONS | UI worker | UI-BASE, DRAFTS | Draft preview/copy/export screens, missing-field collection, resolved-date/destination review, explicit execution confirmation and action receipts | Useful draft-only mode without permissions; accessible confirmation; no direct native side effects or ambiguous retry |
| V-ACTIONS | Independent validation worker | G-FEATURE, DRAFTS, APP-INTENTS, UI-ACTIONS | Composed draft/action and adversarial tool-instruction tests | Section 10 gate; no arbitrary tool invocation, duplicate actions, or silent side effects |
| G-ACTIONS | Coordinator | V-ACTIONS | Integrate local-action increment | Packaging, permissions, fallback, and action receipts verified |
| PILOT-PREP | Validation/product worker | B-EVAL | Consent/script/task materials and predeclared evaluation criteria; no participant contact | Section 12 matched-task and privacy-comprehension protocol; content handling documented |
| PILOT-RESULT | Human participants with validation worker | G-FEATURE, PILOT-PREP | Run authorized exploratory Mac pilot; summarize baseline-relative results and limitations | Consented evidence, correction/task time, repeat use, negative results retained; cannot substitute agent-generated users |
| RELEASE | Coordinator with independent reviewer | G-FEATURE, PILOT-RESULT | Release-readiness report for selected verified feature set | Installed-artifact identity, compatibility, migration/recovery and rollback evidence; Section 12; signing/distribution remains separately scoped |

BOOT/B-EVAL do not require recruiting participants. PILOT-RESULT remains blocked if real participants/authorization are unavailable; record that limitation while other tasks proceed. A prototype or engineering candidate can be complete without claiming the pilot/release gate passed.

## Optional experiments

Only dispatch when evidence, user intent, hardware, and the main plan's adoption gates justify the work. Task dependencies alone do not grant data-sharing or publishing authorization. These tasks have no edge into G-FEATURE or RELEASE unless their capability is explicitly selected for that release.

| ID | Owner | Requires | Scope / deliverable | Adoption evidence |
| --- | --- | --- | --- | --- |
| X-PANEL | Mac worker | C0 | Isolated NSPanel spike with coordinator-owned window/build registration | Existing Tauri approach insufficient; better focus/Spaces/monitor behavior and accessible interaction |
| X-SPEECH | Mac/audio worker | C0 | Swift SpeechAnalyzer adapter behind engine capability interface | Actual supported SDK/host; language/entity/latency/energy comparison; no automatic default replacement |
| X-CAPTURE | Mac/audio worker | A-BUFFER, A-POWER | AVAudioEngine voice-processing adapter with bypass | CPAL comparison on playback, soft speech, microphone routes, setup latency, and power |
| X-MODEL | Intelligence worker | FM | One optional local model/Core AI/MLX runtime spike | Explicit local-model policy reconciliation; license, size, RAM, language and quality benefit; older-Mac fallback |
| X-VISION | Mac/intelligence worker | MAC-EDIT, FM | User-selected screenshot context and multimodal request adapter | Supported on-device capability, explicit capture, bounded data, useful advantage over selection |
| X-REMOTE | Intelligence worker | FM | Optional cloud/PCC provider evaluation and cost/data-flow proposal | Explicit product-policy change and opt-in, no hidden fallback; no live private data sent without authorization |
| X-XPC | Runtime/Mac worker | G-CORE | Isolated inference helper only if crash baseline warrants it | Measured recovery benefit, ABI/IPC/cancel/resource tests, packaging cost and feature-off path |

## Per-packet completion and rollback

Every row inherits its linked main-plan acceptance requirements and Section 13 dispatch/handoff template. Before claiming Running, the coordinator records an exact file lease, base/contract revisions, reviewer, test commands, hardware lease if needed, and scope exclusions. Each packet reports one bounded behavior change and scoped diff; split a row into children in the ledger if necessary, keeping its original gate unmet until all children are verified.

Rollback policy:

- BOOT/B-* / C0: preserve baseline; version contracts and adapters instead of deleting user settings/history.
- RUNTIME/DELIVERY: revert the scoped change only after assessing config compatibility; do not fall back to a path known to deliver after cancellation. Maintain copy-only recovery when insertion is unsafe.
- INTENT/FM/PROMPT: disable enhanced transformation and retain raw transcription with an explicit outcome.
- UI-*/MAC-EDIT/FOLLOWUP/PERSONAL: disable affected action/profile migration safely; retain original/result recovery and existing readable data.
- A-* / X-*: independent flags/config preserve previous capture/engine behavior. A benchmark-only experiment cannot silently change defaults.
- DRAFTS/APP-INTENTS: disable execution while preserving preview/copy/export; retries must not repeat prior effects.
- V-*/G-*/RELEASE: no bypass. Record failed checks and return the affected packet to its owner; release only the verified feature set.

## Traceability from the previous schedule

The old batch/sub-batch IDs are retired to prevent confusion with phase headings such as 5A. This mapping preserves coverage rather than imposing the old artificial dependencies.

| Previous ID | New packets |
| --- | --- |
| Batch 0 | BOOT, B-NATIVE, B-UI, B-EVAL, C0 |
| Batch 1 | RUNTIME, G-CORE |
| Batch 2 | C0, DELIVERY, G-CORE |
| Batch 3 | INTENT, G-CORE |
| Batch 4 | FM, V-ENHANCED, G-ENHANCED |
| Batch 5 | UI-BASE, V-ENHANCED, G-ENHANCED |
| Batch 6 | MAC-EDIT, UI-EDIT, V-FEATURE, G-FEATURE |
| Batch 7 | PROMPT, V-FEATURE, G-FEATURE |
| Batch 8 | PERSONAL, UI-PERSONAL, V-PERSONAL, G-PERSONAL |
| Batch 9 | FOLLOWUP, V-PERSONAL, G-PERSONAL |
| Batch 10 | A-RMS, A-BUFFER, A-VAD, A-POWER, V-AUDIO, G-AUDIO |
| Batch 11 | A-STREAM, A-RETRY, X-SPEECH, V-AUDIO, G-AUDIO |
| Batch 12 | DRAFTS, APP-INTENTS, UI-ACTIONS, V-ACTIONS, G-ACTIONS |
| Batch 13 | X-MODEL, X-VISION, X-REMOTE |
| Sub-batch 0A | B-EVAL, PILOT-PREP, PILOT-RESULT |
| Sub-batch 5A | C0, UI-BASE |
| Sub-batch 5B | UI-BASE, V-FEATURE |
| Sub-batch 6A | UI-BASE, UI-EDIT, X-PANEL, V-FEATURE |
| Sub-batch 6B | UI-EDIT, MAC-EDIT, V-FEATURE |
| Sub-batch 8A | PERSONAL, UI-PERSONAL, V-PERSONAL |
| Sub-batch 10A | A-RMS |
| Sub-batch 10B | A-VAD |
| Sub-batch 10C | A-BUFFER |
| Sub-batch 10D | A-POWER |
| Sub-batch 11A | A-STREAM |
| Sub-batch 11B | A-RETRY |
| Sub-batch 11C | X-CAPTURE |
| Sub-batch 13A | X-XPC |

All phases' evidence/requirements remain in main-plan Sections 4–12. A mapped task is planned coverage, not a completed requirement.
