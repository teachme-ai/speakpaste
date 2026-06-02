# Runtime Validation Manual Notes

Date: 2026-06-02

Installed app tested:

```text
/Applications/SpeakPaste.app
Version: 0.1.1
Bundle identifier: com.speakpaste.app
```

## Manual Test Result

User reported:

```text
worked
paste success
```

## Interpreted Result

The core local macOS runtime loop succeeded:

1. App launched from `/Applications/SpeakPaste.app`.
2. User triggered recording with the configured shortcut/Fn flow.
3. Recording/transcription completed.
4. Paste at cursor succeeded.

## Remaining Manual Checks

The user has confirmed the primary paste loop. The following checks are still useful before public release:

- Repeat with Wi-Fi disabled after the local model is already present.
- Confirm clipboard fallback contains the transcript after paste.
- Confirm the same flow works after app restart.
- Confirm background/minimized shortcut trigger still starts recording.
- Confirm microphone and accessibility permission recovery messaging is clear on a fresh Mac or after revoking permissions.
