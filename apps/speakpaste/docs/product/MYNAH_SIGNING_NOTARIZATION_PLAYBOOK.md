# Mynah Signing And Notarization Playbook

## Purpose

This document captures the exact successful Developer ID signing and Apple notarization flow for Mynah.

Use this before publishing any public DMG. The goal is to avoid the macOS warning:

> "Mynah.app is damaged and can't be opened. You should move it to the Trash."

That warning can appear when a downloaded app is unsigned, incorrectly signed, unnotarized, unstapled, quarantined, or packaged incorrectly.

For public paid releases, do not rely on `xattr` as the normal install path. Use Developer ID signing and notarization.

---

## Successful Run Summary

Date observed: 2026-06-09

Developer ID identity:

```text
Developer ID Application: Khalid Irfan (99YAK7YU3M)
```

Bundle identifier:

```text
com.mynah.app
```

Signed app:

```text
apps/speakpaste/src-tauri/target/release/bundle/macos/Mynah.app
```

Notarized DMG:

```text
apps/speakpaste/src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
```

Notary submission ID from the successful run:

```text
97404a1b-52c2-4ded-b1e8-837ccda6f93d
```

Successful final checks:

```text
spctl DMG: accepted, source=Notarized Developer ID
stapler validate: The validate action worked!
spctl app: accepted, source=Notarized Developer ID
```

---

## Pre-Release Metadata Checks

Before building, confirm release-facing metadata says Mynah, not SpeakPaste.

### Required Tauri Values

File:

```text
apps/speakpaste/src-tauri/tauri.conf.json
```

Required values:

```json
"productName": "Mynah",
"identifier": "com.mynah.app"
```

Bundle homepage:

```json
"homepage": "https://mynah.site"
```

macOS signing identity:

```json
"signingIdentity": "Developer ID Application: Khalid Irfan (99YAK7YU3M)"
```

Hardened runtime:

```json
"hardenedRuntime": true
```

### Required Package Metadata

Root `package.json` and `apps/speakpaste/package.json` should not advertise MIT licensing for the paid product:

```json
"license": "UNLICENSED"
```

Cargo package should not point to the old SpeakPaste repository.

File:

```text
apps/speakpaste/src-tauri/Cargo.toml
```

Expected:

```toml
name = "mynah"
authors = ["Khalid Irfan"]
```

Do not include an old `repository = "...speakpaste"` field.

### Acceptable Internal References

These may still exist and are not release blockers:

- source directory path `apps/speakpaste`
- migration docs explaining SpeakPaste to Mynah
- support docs telling old testers to remove old SpeakPaste permission entries
- dev-only references that do not enter app metadata

---

## One-Time Local Setup

### 1. Confirm Apple Developer Account

You need an active paid Apple Developer Program membership.

### 2. Create Developer ID Application Certificate

Use Xcode:

1. Open Xcode.
2. Go to **Xcode > Settings > Accounts**.
3. Add the Apple Developer Apple ID.
4. Select the paid developer team.
5. Click **Manage Certificates**.
6. Click `+`.
7. Choose **Developer ID Application**.

Do not use the Personal Team for public Developer ID distribution.

### 3. Verify Signing Identity

Run from any folder:

```bash
security find-identity -v -p codesigning
```

Expected:

```text
1) ... "Developer ID Application: Khalid Irfan (99YAK7YU3M)"
   1 valid identities found
```

If it says `0 valid identities found`, the Developer ID Application certificate is not installed in the local login keychain.

---

## Build Signed App And DMG

From the app package:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste
bun run tauri build
```

During signing, macOS may show a Keychain prompt:

```text
codesign wants to access key "Mac Developer ID Application: Khalid Irfan" in your keychain.
To allow this, enter the "login" keychain password.
```

This password is the Mac login password, not the Apple ID password.

Recommended button:

```text
Always Allow
```

This avoids repeated prompts while codesign signs nested files.

Expected successful build lines:

```text
Signing with identity "Developer ID Application: Khalid Irfan (99YAK7YU3M)"
Finished 2 bundles at:
  .../bundle/macos/Mynah.app
  .../bundle/dmg/Mynah_0.1.1_aarch64.dmg
```

Tauri may warn:

```text
Warn skipping app notarization, no APPLE_ID & APPLE_PASSWORD & APPLE_TEAM_ID ...
```

That is okay if notarization will be done manually with `notarytool`.

---

## Verify Local Code Signing

From:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste
```

Run:

```bash
codesign --verify --deep --strict --verbose=2 src-tauri/target/release/bundle/macos/Mynah.app
codesign -dv --verbose=4 src-tauri/target/release/bundle/macos/Mynah.app
```

Expected good output includes:

```text
src-tauri/target/release/bundle/macos/Mynah.app: valid on disk
src-tauri/target/release/bundle/macos/Mynah.app: satisfies its Designated Requirement
Identifier=com.mynah.app
Authority=Developer ID Application: Khalid Irfan (99YAK7YU3M)
TeamIdentifier=99YAK7YU3M
flags=0x10000(runtime)
```

The `runtime` flag confirms hardened runtime is enabled.

---

## Notarization Credentials

Create an Apple app-specific password:

1. Go to `https://account.apple.com/account/manage`.
2. Open app-specific passwords.
3. Create a password named something like `Mynah Notarization`.

Do not use the normal Apple ID password.

Do not paste app-specific passwords into chat or commit logs.

If a password is exposed, revoke it and create a new one.

Set credentials in Terminal:

```bash
export APPLE_ID="your-apple-id-email"
export APPLE_TEAM_ID="99YAK7YU3M"
read -s APPLE_APP_SPECIFIC_PASSWORD
```

Paste the app-specific password when prompted. It will not visibly type.

---

## Submit DMG For Notarization

Run:

```bash
xcrun notarytool submit src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg \
  --apple-id "$APPLE_ID" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --wait
```

Expected progress:

```text
Submission ID received
Upload progress: 100.00%
Successfully uploaded file
Waiting for processing to complete.
Current status: In Progress...
Processing complete
status: Accepted
```

Notarization may take:

- usually 1-5 minutes
- sometimes 5-15 minutes
- occasionally longer if Apple's notary service is slow

Do not cancel just because it stays `In Progress` for a few minutes.

---

## If Notarization Is Rejected

If the status is:

```text
Invalid
```

Fetch the notary log:

```bash
xcrun notarytool log <SUBMISSION_ID> \
  --apple-id "$APPLE_ID" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD"
```

Common causes:

- nested executable is unsigned
- bundled helper/dylib/framework is unsigned
- entitlement problem
- hardened runtime missing
- app bundle changed after signing
- DMG contains an incorrectly signed app

Useful diagnostics:

```bash
codesign --verify --deep --strict --verbose=4 src-tauri/target/release/bundle/macos/Mynah.app
codesign -d --entitlements :- src-tauri/target/release/bundle/macos/Mynah.app
```

Do not guess. Use the notary log.

---

## Staple Notarization Ticket

After `status: Accepted`, run:

```bash
xcrun stapler staple src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
xcrun stapler validate src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
```

Expected:

```text
The validate action worked!
```

Stapling lets Gatekeeper validate the DMG even when the user is offline.

---

## Gatekeeper Validation

### DMG Validation

Use the primary-signature context for DMGs:

```bash
spctl --assess --type open --context context:primary-signature --verbose src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
```

Expected:

```text
src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg: accepted
source=Notarized Developer ID
```

Without `--context context:primary-signature`, `spctl` may return:

```text
rejected
source=Insufficient Context
```

That does not necessarily mean notarization failed.

### App Validation

Run:

```bash
spctl --assess --type execute --verbose src-tauri/target/release/bundle/macos/Mynah.app
```

Expected:

```text
src-tauri/target/release/bundle/macos/Mynah.app: accepted
source=Notarized Developer ID
```

---

## Final Release Artifact

After signing, notarization, stapling, and Gatekeeper validation pass, the release DMG is:

```text
apps/speakpaste/src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
```

This is the artifact to upload to the website/release host.

Do not upload an unstapled or unnotarized DMG for paid public users.

---

## Post-Notarization Website Update

After choosing the final artifact URL, update the website:

- `/download/`
- `downloads.json`
- release notes/changelog if present

Include:

- version
- release/build number
- architecture
- DMG URL
- SHA256 checksum
- notarized status

Calculate SHA256:

```bash
shasum -a 256 src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
```

---

## Fresh Download Test

Before announcing the release:

1. Upload the notarized DMG.
2. Download it from the website using Chrome or Safari.
3. Open the DMG.
4. Drag Mynah to Applications.
5. Launch `/Applications/Mynah.app`.
6. Confirm there is no "damaged and can't be opened" warning.
7. Confirm Microphone prompt appears if not already granted.
8. Confirm Accessibility setup works.
9. Confirm Fn dictation and paste work in TextEdit or Notes.

This is the true user-path validation.

---

## Security Hygiene

- Do not paste app-specific passwords into chat.
- If a password is exposed, revoke it immediately.
- Prefer `read -s` for notarization password input.
- Do not commit Apple credentials.
- Do not store app-specific password in docs.
- Do not publish `xattr` as the normal paid-user install path.

---

## Release Status Checklist

Use this before publishing:

```markdown
- [ ] Developer ID Application identity installed
- [ ] Tauri homepage is `https://mynah.site`
- [ ] Bundle identifier is `com.mynah.app`
- [ ] Signing identity is configured
- [ ] App builds successfully
- [ ] `codesign --verify` passes
- [ ] `Authority=Developer ID Application: Khalid Irfan (99YAK7YU3M)`
- [ ] `TeamIdentifier=99YAK7YU3M`
- [ ] Hardened runtime flag is present
- [ ] Notary status is `Accepted`
- [ ] Stapler validation passes
- [ ] DMG `spctl` check passes with primary-signature context
- [ ] App `spctl` execute check passes
- [ ] SHA256 checksum generated
- [ ] Website download metadata updated
- [ ] Fresh browser download test passes
```
