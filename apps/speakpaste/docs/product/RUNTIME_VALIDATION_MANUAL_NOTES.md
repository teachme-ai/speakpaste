# Runtime Validation Manual Notes

Date: 2026-06-02

Installed app tested:

```text
/Applications/Mynah.app
Version: 0.1.1
Bundle identifier: com.mynah.app
```

## Manual Test Result

User reported:

```text
worked
paste success
```

Follow-up restart check:

```text
permissions/shortcut flow survived app restart
```

## Interpreted Result

The core local macOS runtime loop succeeded:

1. App launched from `/Applications/Mynah.app`.
2. User triggered recording with the configured shortcut/Fn flow.
3. Recording/transcription completed.
4. Paste at cursor succeeded.
5. App restart did not break the working shortcut/permission/paste loop.

## Remaining Manual Checks

The user has confirmed the primary paste loop. The following checks are still useful before public release:

- Repeat with Wi-Fi disabled after the local model is already present.
- Confirm clipboard fallback contains the transcript after paste.
- Confirm background/minimized shortcut trigger still starts recording.
- Confirm microphone permission recovery messaging is clear on a fresh Mac or after revoking permissions.
- Release blocker: investigate `RB-001` in `RELEASE_BLOCKING_ISSUES.md` before relying on Accessibility stale-entry self-repair. User observed that Mynah can appear selected in System Settings but remain inactive for the current running app after reinstall/replacement.
