# SpeakPaste Settings Wording Audit

- **Branch**: `local-only-product-surface`
- **Latest Commit Reviewed**: `8366775e57217d2c93319e26c61b1271d0fe11cb`
- **Classification**: Audit + recommendations

---

## 1. Overview & Wording Goals

SpeakPaste has transitioned from an API-based transcription workspace into a lightweight, local-first macOS dictation utility. The product language must reflect this:
* **Minimize Jargon**: Avoid exposing developers' implementation details (e.g. FFI, CPAL, VAD, Temp, Retention strategies).
* **Eliminate Surveillance Wording**: Avoid using "recording" or "analytics" heavily. Standardize on **"Dictation"**, **"Captures"**, and **"Privacy"** to reassure users that no audio is permanently archived or transmitted.
* **Symmetry Across Navigation**: Ensure the sidebar menu title matches the page title and the landing Control Center grid card.

---

## 2. Settings Wording Audit Findings

| Category / Area | File or Route | Current Wording | Why it is Confusing | Recommended Replacement Wording |
| :--- | :--- | :--- | :--- | :--- |
| **Transcription Engine** | `SidebarNav.svelte`<br>`+page.svelte`<br>`transcription/+page.svelte` | Sidebar: **"Models"**<br>Card: **"Local engine"**<br>Header: **"Transcription"** | Three different names for the same configuration section. | Sidebar: **"Engine & Models"**<br>Card: **"Local Engine"**<br>Header: **"Local Engine & Models"** |
| **Hotkey Activation** | `SidebarNav.svelte`<br>`+page.svelte`<br>`shortcuts/global/+page.svelte` | Sidebar: **"Trigger"**<br>Card: **"Main shortcut"**<br>Header: **"Press to Speak"** | Conceptual mismatch between "Trigger", "Shortcut", and "Press to Speak". | Sidebar: **"Trigger & Hotkeys"**<br>Card: **"Global Trigger"**<br>Header: **"Dictation Trigger"** |
| **History Retention** | `settings/+page.svelte` | Legend: **"Local History"**<br>Label: **"Saved recordings"**<br>Item: **"Keep all recordings"** | "Recordings" implies the app retains permanent MP3/WAV files on disk. | Legend: **"Dictation History"**<br>Label: **"Saved text captures"**<br>Item: **"Keep all captures"** |
| **History Limits** | `settings/+page.svelte` | Option: **"Do not save recordings"**<br>Item: **"5 recordings"** | "Recordings" again implies permanent audio storage instead of text logs. | Option: **"Keep no history"**<br>Item: **"Last 5 captures"** |
| **Voice Capture Setup** | `settings/recording/+page.svelte` | Label: **"Recording Mode"** | Too technical and surveillance-oriented. | Label: **"Activation Mode"** |
| **Audio File Storage** | `settings/recording/+page.svelte` | Label: **"Recording Output Folder"**<br>Desc: *"Choose where to save your recordings."* | Users do not use raw audio recordings. It suggests permanent file archiving. | Label: **"Temporary Audio Cache"**<br>Desc: *"Choose where audio files are cached for local transcription. Files are immediately deleted after pasting."* |
| **Diagnostics / Privacy** | `SidebarNav.svelte`<br>`analytics/+page.svelte` | Sidebar: **"Privacy"**<br>Header: **"Privacy"**<br>Details: **"Local analytics"** | "Analytics" raises immediate concerns for local-only software users. | Sidebar: **"Privacy"**<br>Header: **"Privacy & Support"**<br>Details: **"Diagnostics logs"** |
| **Simulate Return** | `settings/+page.svelte` | Label: **"Press Enter after paste"** | Functional but slightly colloquial. | Label: **"Auto-Send (Return Key)"** |
| **App Shell Status** | `+page.svelte` | State Pill: **"Transcribing locally"** | A bit verbose. | State Pill: **"Transcribing"** |
| **User Onboarding** | `shortcuts/global/+page.svelte` | Desc: *"Fn is the primary Mac trigger."* | User needs instruction on what `Fn` is and how it triggers. | Desc: *"Press and hold the Fn key to dictate, then release to paste instantly."* |

---

## 3. Implementation Recommendations for Codex

1. **Sidebar Navigation Update (`SidebarNav.svelte`)**:
   Modify the array of settings items:
   ```typescript
   const items = [
       { title: 'Home', href: '/settings' },
       { title: 'Voice', href: '/settings/recording' },
       { title: 'Engine & Models', href: '/settings/transcription' },
       { title: 'Trigger & Hotkeys', href: '/settings/shortcuts/global', activePathPrefix: '/settings/shortcuts' },
       { title: 'Privacy', href: '/settings/analytics' },
       { title: 'About', href: '/settings/about' },
   ];
   ```

2. **Control Center Grid Alignment (`settings/+page.svelte`)**:
   Update grid headers to match sidebar navigation titles:
   * **Voice capture** -> **Voice**
   * **Local engine** -> **Engine & Models**
   * **Main shortcut** -> **Trigger**

3. **History Cleanup labels (`settings/+page.svelte`)**:
   Update `retentionItems` and `maxRecordingItems` arrays to replace "recordings" with "captures". Update legend `<Field.Legend>Local History</Field.Legend>` to `<Field.Legend>Dictation History</Field.Legend>`.

4. **Notification / Toast wording polish**:
   In `apps/speakpaste/src/routes/(app)/+page.svelte`:
   * Update `toast.success('Recording deleted')` -> `toast.success('Capture deleted')`.
   * Update `toast.error('Failed to delete recording')` -> `toast.error('Failed to delete capture')`.
