# Release Blocking Issues

Date: 2026-06-04

This file tracks issues that can block a public release candidate. Keep entries concrete enough for Codex, AG, or a lower-cost implementation agent to pick up without needing chat history.

---

## RB-001: Accessibility Permission Appears Selected But Does Not Activate Current App

Status: open

Severity: release blocker

Reported behavior:

- SpeakPaste shows the macOS Accessibility guide.
- In System Settings / System Preferences > Privacy & Security > Accessibility, `SpeakPaste` appears in the list but is not selected.
- User selects/checks `SpeakPaste`; it visually appears selected.
- User closes System Settings and returns to SpeakPaste.
- SpeakPaste still behaves as if Accessibility is not active:
  - Fn trigger does not work, or
  - permission guide remains active, or
  - the app does not initialize the global Fn listener.
- Removing the existing Accessibility entry and re-adding `/Applications/SpeakPaste.app` does not reliably activate the currently running app.
- In some reinstall flows, the second remove/reinstall attempt works, which suggests macOS may be applying the permission to a different bundle instance, stale TCC entry, or a process that must be restarted.

Why this matters:

- The core product depends on Accessibility for the global Fn trigger and cursor paste.
- Users cannot be expected to manually remove stale entries, reinstall twice, or understand macOS TCC internals.
- We previously claimed stale Accessibility self-repair in product and website docs, but this observed behavior shows the fix is not reliable enough yet.

Current implementation references:

- Rust permission repair:
  - `apps/speakpaste/src-tauri/src/accessibility_repair.rs`
- Rust Fn key listener:
  - `apps/speakpaste/src-tauri/src/fn_key_listener.rs`
- Frontend permission registration:
  - `apps/speakpaste/src/routes/(app)/_layout-utils/register-permissions.ts`
- Accessibility guide:
  - `apps/speakpaste/src/routes/(app)/(config)/macos-enable-accessibility/+page.svelte`
- Permission service:
  - `apps/speakpaste/src/lib/services/desktop/permissions.ts`

Initial investigation notes:

- `repair_accessibility_permissions_if_needed` uses `macos_accessibility_client::application_is_trusted()` to determine trust and runs `tccutil reset Accessibility <bundle-id>` only when `should_reset_stale_accessibility(...)` returns true.
- `should_reset_stale_accessibility(...)` currently resets only when:
  - the app has previously seen Accessibility trusted, and
  - the current build signature has not already had a reset.
- This means a bad first-run/reinstall state may not reset if local recovery state does not show prior trust, even if System Settings contains a stale visible `SpeakPaste` entry.
- The frontend polls `desktopServices.permissions.accessibility.check()`, which comes from `tauri-plugin-macos-permissions-api`.
- The Fn listener separately checks `accessibility_sys::AXIsProcessTrusted()` before creating the CGEventTap.
- If the plugin check and `AXIsProcessTrusted()` disagree briefly, or if macOS needs process restart after TCC change, the UI can show misleading recovery progress.
- `initialize_fn_key_listener` starts the listener only if `AXIsProcessTrusted()` is true. There is no explicit TCC-applied event from macOS; we rely on polling.
- `LISTENER_RUNNING` is only a boolean. If a listener fails after permission is granted later, the app depends on another initialization attempt.

Working hypotheses:

1. Stale TCC entry:
   - The Accessibility row shown in System Settings belongs to a previous bundle/executable/signature path.
   - Selecting it does not grant trust to the currently running `/Applications/SpeakPaste.app`.

2. Permission applies only after process restart:
   - macOS may mark the app trusted in TCC, but the running process/event tap path does not become usable until the process restarts.
   - This matches the report that reinstalling/removing a second time can make it work.

3. Detection mismatch:
   - `checkAccessibilityPermission()` may return a different or cached result than `AXIsProcessTrusted()`.
   - The UI may believe the user selected the app while Rust still cannot create `CGEventTap`.

4. Reset is too conservative:
   - The self-repair only resets once per build and only after a previously trusted state.
   - It may skip reset in exactly the first bad install/reinstall case we need to fix.

Recommended fix direction:

1. Make Rust the source of truth for Accessibility readiness:
   - Add a command that returns both:
     - `AXIsProcessTrusted()` / `application_is_trusted()`
     - whether `initialize_fn_key_listener` can actually create or confirm the listener.
   - The UI should not show “granted” until Rust confirms the listener is initialized.

2. Add a guided “Repair Accessibility” action:
   - Run `tccutil reset Accessibility com.speakpaste.app`.
   - Open the Accessibility pane.
   - Keep polling Rust trust state.
   - If selected but still not usable after a timeout, prompt the user to fully quit and reopen SpeakPaste.

3. Make stale-entry repair more aggressive, but controlled:
   - If install fingerprint changed and trust is false, consider allowing one reset for the current build even when `has_seen_accessibility_trusted` is false.
   - Persist `last_tcc_reset_build_signature` to avoid reset loops.
   - Log `bundlePath`, `executablePath`, build signature, and repair state.

4. Improve user copy:
   - Stop implying the app can silently fix all stale entries.
   - Say macOS may require “refresh and reopen” when replacing an app.
   - The guide should explain that the selected checkbox is not considered complete until SpeakPaste reports “Fn trigger ready.”

5. Add validation cases:
   - Fresh install with no existing TCC entry.
   - Replace existing `/Applications/SpeakPaste.app` while old app was previously trusted.
   - Delete app, install new build, existing Accessibility row remains.
   - Remove row manually, re-add `/Applications/SpeakPaste.app`, keep app running.
   - Remove row manually, re-add app, quit/reopen.

Acceptance criteria:

- If Accessibility is missing, SpeakPaste opens the guide and can open the correct System Settings pane.
- If a stale entry exists, clicking Repair resets the bundle-id TCC entry once for that build and asks the user to approve the current app.
- The UI does not mark Accessibility as complete until Rust confirms the Fn listener can initialize.
- If macOS requires restart, the app says so clearly and provides a “Quit SpeakPaste” action.
- After reinstall/replace, the user should not need to discover manual remove/re-add steps by trial and error.

