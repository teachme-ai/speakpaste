# Mynah Support And Permissions Page

## Purpose

This document defines the support/permissions page for the website. It should help users install Mynah, understand macOS permission prompts, and recover from common install states without needing developer vocabulary.

---

## Page Title

Mynah Support

## Page Subtitle

Install the Mac app, approve the required permissions, and recover common macOS permission issues.

---

## Section: Install Correctly

### Title

Move Mynah to Applications

### Copy

After downloading the DMG, open it and drag Mynah into your Applications folder. Running a downloaded Mac app from another location can trigger macOS security behavior that makes permissions harder to manage.

### Steps

1. Open the downloaded DMG.
2. Drag Mynah into Applications.
3. Launch Mynah from Applications.
4. Keep the menu-bar icon running.

---

## Section: Required Permissions

### Title

Permissions Mynah needs

### Permission table

| Permission | Why it is needed |
| --- | --- |
| Microphone | Captures your voice for local transcription |
| Accessibility | Lets Mynah paste text into the active app and listen for the Fn trigger |

### Copy

Mynah cannot silently grant itself these permissions. macOS requires you to approve them in System Settings.

---

## Section: Microphone Permission

### Title

Allow Microphone access

### Copy

Microphone permission allows Mynah to capture your voice when you hold Fn. The app should not record continuously by default.

### Recovery steps

1. Open System Settings.
2. Go to Privacy & Security.
3. Open Microphone.
4. Enable Mynah.
5. Restart Mynah if macOS asks.

---

## Section: Accessibility Permission

### Title

Allow Accessibility access

### Copy

Accessibility permission lets Mynah respond to the Fn trigger and paste text into the app you are already using.

### Recovery steps

1. Open System Settings.
2. Go to Privacy & Security.
3. Open Accessibility.
4. Enable Mynah.
5. Return to Mynah and try the Fn trigger again.

---

## Section: Reinstall Or Replacement Issue

### Title

If Accessibility looks enabled but Fn does not work

### Copy

Sometimes macOS keeps an old Accessibility entry after an app is replaced, deleted, or reinstalled. When that happens, Mynah may appear in the Accessibility list but the new app cannot use the permission correctly.

Mynah now tries to detect this stale state, refresh the local permission record, and ask macOS to guide approval again.

### What the user may see

- Fn trigger does not start dictation
- Mynah is visible in the menu bar
- Accessibility appears enabled but still does not work
- the app asks for approval again after reinstall

### Recommended guidance

If Mynah asks for Accessibility approval again after reinstalling, approve it in System Settings. This is expected when macOS needs to reconnect the new app bundle to the permission entry.

### Last-resort manual recovery

Only include this as a support fallback:

1. Open System Settings.
2. Go to Privacy & Security.
3. Open Accessibility.
4. Remove old Mynah entries.
5. Add Mynah again from Applications.
6. Restart Mynah.

Do not make this the primary path. The product should attempt repair first.

---

## Section: App Translocation

### Title

If macOS warns about the app location

### Copy

macOS can run downloaded apps from a temporary randomized path if they are not moved into Applications. Mynah may warn you when this happens because it can interfere with stable permissions.

### Fix

Move Mynah to Applications and launch it from there.

---

## Section: Menu-Bar Behavior

### Title

Mynah keeps running from the menu bar

### Copy

Closing the main window should not quit the app. Mynah is designed to stay available from the menu bar so you can keep using Fn dictation in other apps.

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

Mynah can write local diagnostics so you can inspect timing, paste results, engine behavior, and reliability during testing. Diagnostics are stored on your Mac and should not include transcript text or raw audio.

### User actions

- open diagnostics folder
- copy diagnostics log path
- clear diagnostics log

---

## FAQ

### Does Mynah upload my voice?

No cloud service is required for the core product. The active product surface is focused on local engines.

### Why does Mynah need Accessibility?

It needs Accessibility to detect the Fn trigger and paste text into the active app.

### Why does Mynah ask for Accessibility again after reinstall?

macOS may keep an old permission entry that no longer matches the replaced app bundle. Mynah tries to refresh that state and then asks for approval again only if macOS requires it.

### Should I keep the main window open?

No. Mynah should keep working from the menu bar after the window is closed or hidden.

