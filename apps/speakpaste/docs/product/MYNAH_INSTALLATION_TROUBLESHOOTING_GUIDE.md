# Mynah Installation And Troubleshooting Guide

## Purpose

This document is website-ready source content for Mynah's installation, permissions, and troubleshooting pages.

It explains what users should expect during first launch, why macOS asks for permission, and how to recover from common installation states. It is written for normal Mac users, not developers.

AG should use this document to create or improve the website support pages, especially:

- `/download`
- `/support/permissions`
- `/privacy`
- `/facts`
- FAQ sections

---

## Short User-Facing Summary

Mynah is a Mac app distributed directly by the developer, not through the Apple App Store.

Because of that, macOS may ask you to confirm that you want to open it. Mynah also needs two system permissions to work:

- **Microphone**: to hear your voice when you hold Fn
- **Accessibility**: to place the transcript into the active app at your cursor

Mynah cannot silently grant these permissions. macOS requires the user to approve them.

---

## Non-App-Store Disclaimer

### Recommended Website Copy

Mynah is distributed directly from `mynah.site` and is not currently distributed through the Apple App Store.

macOS may show a security prompt the first time you open the app. This is normal for many independently distributed Mac apps. You may need to explicitly allow Mynah to open from System Settings.

Only download Mynah from the official website:

`https://mynah.site`

Do not install Mynah from unknown mirrors or unofficial download links.

### Short Version

Mynah is not from the Apple App Store. macOS may ask you to approve opening it the first time.

### Tone To Use

Be clear, calm, and direct.

Do not make this sound scary.

Do not imply Apple has approved or notarized the app unless the release is actually notarized.

Do not say "bypass security." Say "allow Mynah to open" or "approve Mynah in System Settings."

---

## Recommended First Install Flow

### Title

Install Mynah Correctly

### Steps

1. Download Mynah from `https://mynah.site`.
2. Open the downloaded DMG.
3. Drag **Mynah** into the **Applications** folder.
4. Launch Mynah from **Applications**.
5. Approve macOS prompts for Microphone and Accessibility.
6. Keep Mynah running from the menu bar.
7. Hold **Fn**, speak, release, and confirm text appears at the cursor.

### Important Note

Run Mynah from:

`/Applications/Mynah.app`

Running it from Downloads, Desktop, the mounted DMG, or a temporary location can make macOS permissions harder to manage.

---

## macOS Security Prompt

### What Users May See

Depending on release signing and notarization state, macOS may show one of these behaviors:

- "Mynah is an app downloaded from the internet. Are you sure you want to open it?"
- "Mynah cannot be opened because Apple cannot check it for malicious software."
- a blocked-open prompt requiring System Settings approval

### Recommended Guidance

If macOS blocks Mynah on first launch:

1. Open **System Settings**.
2. Go to **Privacy & Security**.
3. Scroll to the security message about Mynah.
4. Click **Open Anyway** or the equivalent macOS approval control.
5. Launch Mynah again from Applications.

### Website FAQ

#### Why does macOS warn me when opening Mynah?

Mynah is currently distributed directly from `mynah.site`, not through the Apple App Store. macOS may ask you to confirm that you trust the app before opening it.

#### Is this expected?

Yes. This is expected for independently distributed Mac apps. Only download Mynah from the official site.

---

## Required Permissions

Mynah needs user-approved macOS permissions to work correctly.

| Permission | Why Mynah needs it | What happens if it is missing |
| --- | --- | --- |
| Microphone | Captures your voice when you hold Fn | Mynah cannot record your speech |
| Accessibility | Lets Mynah place text into the active app and use system-wide typing behavior | Fn/paste behavior may not work |

Mynah cannot grant these permissions automatically. macOS requires the user to approve them.

---

## Microphone Permission

### User-Facing Explanation

Mynah needs Microphone permission to capture your voice while you are dictating.

The app is designed around press-to-speak behavior. It should not continuously record by default.

### How To Enable

1. Open **System Settings**.
2. Go to **Privacy & Security**.
3. Open **Microphone**.
4. Enable **Mynah**.
5. Restart Mynah if macOS asks.

### Troubleshooting

If Mynah does not appear in the Microphone list:

1. Quit Mynah.
2. Open Mynah from `/Applications/Mynah.app`.
3. Start a dictation attempt again.
4. Return to **System Settings > Privacy & Security > Microphone**.

---

## Accessibility Permission

### User-Facing Explanation

Mynah needs Accessibility permission so it can place your transcript into the active app at the cursor.

This permission is also important for system-wide behavior while Mynah runs from the menu bar.

### How To Enable

1. Open **System Settings**.
2. Go to **Privacy & Security**.
3. Open **Accessibility**.
4. Enable **Mynah**.
5. Return to Mynah and test the Fn trigger again.

### Why This Permission Matters

Without Accessibility permission, Mynah may be able to run but may not be able to type into other apps.

That means:

- the menu-bar icon may appear
- the app window may open
- settings may be visible
- but Fn dictation or paste may not work correctly

---

## Stale Accessibility Permission After Reinstall

### What We Learned

macOS can keep an old Accessibility entry after an app has been deleted, replaced, renamed, or reinstalled.

This can create confusing behavior:

- Mynah appears in the Accessibility list
- the toggle looks enabled
- the app still does not respond to Fn or paste correctly
- removing and adding the app may not apply immediately
- reinstalling again may appear to fix it later

This is a macOS permission identity issue. The permission entry may be attached to an older app bundle identity or location.

### User-Facing Explanation

If Mynah appears enabled in Accessibility but dictation still does not work, macOS may be holding an old permission entry.

This can happen after replacing a previous build, moving the app, or upgrading from an older SpeakPaste test version.

### Recommended Recovery Steps

1. Quit Mynah completely from the menu bar.
2. Move the current app to `/Applications/Mynah.app`.
3. Open **System Settings > Privacy & Security > Accessibility**.
4. Remove old entries for **Mynah** or **SpeakPaste**.
5. Add Mynah again from `/Applications/Mynah.app`.
6. Enable the Mynah toggle.
7. Launch Mynah again from Applications.
8. Test Fn dictation in TextEdit or Notes.

### If It Still Does Not Work

1. Quit Mynah.
2. Restart the Mac.
3. Open Mynah from Applications.
4. Return to Accessibility and confirm Mynah is enabled.
5. Test again in TextEdit or Notes.

### Important Website Note

Do not present manual permission removal as the normal install path.

Present it as a troubleshooting step for reinstall, rename, or old-beta users.

---

## SpeakPaste To Mynah Migration Note

### Context

Earlier builds used the product name SpeakPaste and bundle identifier `com.speakpaste.app`.

Mynah now uses the new product identity and bundle identifier:

`com.mynah.app`

macOS treats this as a different app.

### User-Facing Copy

If you previously tested SpeakPaste, Mynah may need fresh Microphone and Accessibility approval.

You can remove old SpeakPaste permission entries from System Settings after installing Mynah.

### What Users Should Do

1. Delete old `SpeakPaste.app` if it exists.
2. Install `Mynah.app` into Applications.
3. Remove old SpeakPaste entries from Accessibility if needed.
4. Approve Mynah fresh.

---

## App Location And Translocation

### What We Learned

Downloaded Mac apps can sometimes run from temporary randomized locations if they are opened before being moved into Applications.

This can make permissions unstable or confusing.

### User-Facing Copy

Move Mynah to Applications before opening it.

Running Mynah from the mounted DMG, Downloads, Desktop, or a temporary location may cause macOS to attach permissions to the wrong app location.

### Fix

1. Quit Mynah.
2. Drag Mynah into Applications.
3. Open Mynah from Applications.
4. Re-approve permissions if macOS asks.

---

## Menu-Bar Behavior

### Expected Behavior

Mynah is designed as a menu-bar utility.

Closing the main window should not quit the app.

Expected behavior:

- the main window can be closed or hidden
- the menu-bar icon remains available
- Fn dictation should still work
- the app window can be reopened from the menu bar

### User-Facing Copy

Mynah lives in the menu bar. You do not need to keep the main window open for dictation.

If the menu-bar icon is visible, Mynah is still running.

---

## Basic Troubleshooting Checklist

Use this section as the website's general troubleshooting checklist.

### Mynah Does Not Open

Try:

1. Confirm the app was downloaded from `https://mynah.site`.
2. Move Mynah to Applications.
3. Open System Settings > Privacy & Security.
4. Approve Mynah if macOS shows an "Open Anyway" option.
5. Launch Mynah again.

### Mynah Opens But Fn Does Nothing

Try:

1. Confirm Mynah is running in the menu bar.
2. Confirm Microphone permission is enabled.
3. Confirm Accessibility permission is enabled.
4. Quit and reopen Mynah from Applications.
5. Test in TextEdit or Notes.
6. If you previously installed another build, remove stale Mynah/SpeakPaste Accessibility entries and approve Mynah again.

### Mynah Records But Text Does Not Paste

Try:

1. Confirm Accessibility permission is enabled.
2. Click into a normal editable text field.
3. Test in TextEdit or Notes.
4. Check whether paste-at-cursor is enabled in Mynah settings.
5. Restart Mynah.

### Mynah Does Not Appear In Permission Lists

Try:

1. Quit Mynah.
2. Open Mynah from `/Applications/Mynah.app`.
3. Trigger the action that needs permission.
4. Return to System Settings.

### Mynah Worked Once, Then Stopped After Reinstall

Try:

1. Quit Mynah.
2. Remove old Mynah/SpeakPaste entries from Accessibility.
3. Add Mynah again from Applications.
4. Restart Mynah.
5. Restart the Mac if macOS does not apply the permission immediately.

---

## Diagnostics Guidance

### User-Facing Copy

Mynah can keep local diagnostics to help troubleshoot setup, permissions, latency, and paste behavior.

Diagnostics are stored on your Mac.

They are intended to describe app health, not the private words you dictate.

### What Diagnostics May Include

- app version
- build number
- permission state
- trigger state
- recording/transcription timing
- paste success or failure
- local engine/model status

### What Diagnostics Should Not Include

- raw audio
- transcript text
- clipboard content
- selected text
- private content from other apps

---

## Website FAQ Content

### Is Mynah from the Apple App Store?

No. Mynah is currently distributed directly from `mynah.site`.

### Why does macOS ask me to approve Mynah?

macOS asks users to approve independently distributed apps and sensitive permissions such as Microphone and Accessibility.

### Why does Mynah need Microphone access?

Mynah needs Microphone access to capture your voice when you dictate.

### Why does Mynah need Accessibility access?

Mynah needs Accessibility access to place text into the active app at your cursor.

### Does Mynah keep running if I close the window?

Yes. Mynah is designed to keep running from the menu bar.

### I previously used SpeakPaste. Do I need to approve Mynah again?

Yes. Mynah uses a new app identity, so macOS may require fresh permissions.

### What should I do if Accessibility looks enabled but Fn still does not work?

Quit Mynah, remove stale Mynah or SpeakPaste entries from Accessibility, add Mynah again from `/Applications/Mynah.app`, and restart Mynah.

---

## AG Website Usage Notes

AG should convert this guide into:

1. a concise `/support/permissions/` page
2. a short install section on `/download/`
3. FAQ entries on the homepage
4. agent-readable facts on `/facts/` and `/llms.txt`

Use the shorter copy on the homepage and the full troubleshooting flow on the support page.

Do not overload the homepage with every edge case.

The support page should be the canonical place for installation and permission recovery.
