# RUNTIME handoff

## Scope

The runtime worker owned `src-tauri/src/dictation_state_machine.rs` and `src-tauri/src/dictation_manager.rs`.

## Implemented

- Moved transcription and paste work into a spawned task so the state-machine command loop remains responsive.
- Added a session-scoped `CancellationToken` and cancellation checks before transcription, before the Pasting event, and before delivery.
- Cancel now aborts an active processing task and suppresses stale completion/error events.
- Start reports `Recording` only after the recorder runtime confirms that state.
- Finalization errors emit `Error` and release the App Nap assertion.
- Idle synchronization also releases the App Nap assertion for frontend-driven stops.

## Validation and limits

- Rust formatting was run on the scoped files.
- Native Cargo verification reaches the existing Swift toolchain/cache blocker documented in `STATUS.md`; this handoff is therefore `Review`, not `Verified`.
- Delivery remains a separate pure module until the coordinator integrates the commit boundary with the OS clipboard/keyboard path.

