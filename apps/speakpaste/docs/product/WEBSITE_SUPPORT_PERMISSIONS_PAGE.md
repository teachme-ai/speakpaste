# SpeakPaste Support And Permissions Page

## Purpose

This document defines the support/permissions page for the website. It should help users install SpeakPaste, understand macOS permission prompts, and recover from common install states without needing developer vocabulary.

---

## Page Title

SpeakPaste Support

## Page Subtitle

Install the Mac app, approve the required permissions, and recover common macOS permission issues.

---

## Section: Install Correctly

### Title

Move SpeakPaste to Applications

### Copy

After downloading the DMG, open it and drag SpeakPaste into your Applications folder. Running a downloaded Mac app from another location can trigger macOS security behavior that makes permissions harder to manage.

### Steps

1. Open the downloaded DMG.
2. Drag SpeakPaste into Applications.
3. Launch SpeakPaste from Applications.
4. Keep the menu-bar icon running.

---

## Section: Required Permissions

### Title

Permissions SpeakPaste needs

### Permission table

| Permission | Why it is needed |
| --- | --- |
| Microphone | Captures your voice for local transcription |
| Accessibility | Lets SpeakPaste paste text into the active app and listen for the Fn trigger |

### Copy

SpeakPaste cannot silently grant itself these permissions. macOS requires you to approve them in System Settings.

---

## Section: Microphone Permission

### Title

Allow Microphone access

### Copy

Microphone permission allows SpeakPaste to capture your voice when you hold Fn. The app should not record continuously by default.

### Recovery steps

1. Open System Settings.
2. Go to Privacy & Security.
3. Open Microphone.
4. Enable SpeakPaste.
5. Restart SpeakPaste if macOS asks.

---

## Section: Accessibility Permission

### Title

Allow Accessibility access

### Copy

Accessibility permission lets SpeakPaste respond to the Fn trigger and paste text into the app you are already using.

### Recovery steps

1. Open System Settings.
2. Go to Privacy & Security.
3. Open Accessibility.
4. Enable SpeakPaste.
5. Return to SpeakPaste and try the Fn trigger again.

---

## Section: Reinstall Or Replacement Issue

### Title

If Accessibility looks enabled but Fn does not work

### Copy

Sometimes macOS keeps an old Accessibility entry after an app is replaced, deleted, or reinstalled. When that happens, SpeakPaste may appear in the Accessibility list but the new app cannot use the permission correctly.

SpeakPaste now tries to detect this stale state, refresh the local permission record, and ask macOS to guide approval again.

### What the user may see

- Fn trigger does not start dictation
- SpeakPaste is visible in the menu bar
- Accessibility appears enabled but still does not work
- the app asks for approval again after reinstall

### Recommended guidance

If SpeakPaste asks for Accessibility approval again after reinstalling, approve it in System Settings. This is expected when macOS needs to reconnect the new app bundle to the permission entry.

### Last-resort manual recovery

Only include this as a support fallback:

1. Open System Settings.
2. Go to Privacy & Security.
3. Open Accessibility.
4. Remove old SpeakPaste entries.
5. Add SpeakPaste again from Applications.
6. Restart SpeakPaste.

Do not make this the primary path. The product should attempt repair first.

---

## Section: App Translocation

### Title

If macOS warns about the app location

### Copy

macOS can run downloaded apps from a temporary randomized path if they are not moved into Applications. SpeakPaste may warn you when this happens because it can interfere with stable permissions.

### Fix

Move SpeakPaste to Applications and launch it from there.

---

## Section: Menu-Bar Behavior

### Title

SpeakPaste keeps running from the menu bar

### Copy

Closing the main window should not quit the app. SpeakPaste is designed to stay available from the menu bar so you can keep using Fn dictation in other apps.

### Expected behavior

- the main window can be hidden or closed
- the menu-bar icon remains available
- Fn dictation should still work
- the window can be shown again from the app/menu-bar controls

---

## Section: Diagnostics

### Title

Local diagnostics

### Copy

SpeakPaste can write local diagnostics so you can inspect timing, paste results, engine behavior, and reliability during testing. Diagnostics are stored on your Mac and should not include transcript text or raw audio.

### User actions

- open diagnostics folder
- copy diagnostics log path
- clear diagnostics log

---

## FAQ

### Does SpeakPaste upload my voice?

No cloud service is required for the core product. The active product surface is focused on local engines.

### Why does SpeakPaste need Accessibility?

It needs Accessibility to detect the Fn trigger and paste text into the active app.

### Why does SpeakPaste ask for Accessibility again after reinstall?

macOS may keep an old permission entry that no longer matches the replaced app bundle. SpeakPaste tries to refresh that state and then asks for approval again only if macOS requires it.

### Should I keep the main window open?

No. SpeakPaste should keep working from the menu bar after the window is closed or hidden.

