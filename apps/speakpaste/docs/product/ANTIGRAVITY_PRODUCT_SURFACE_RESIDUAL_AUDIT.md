# SpeakPaste Product Surface Residual Audit

- **Branch**: `local-only-product-surface`
- **Latest Commit Reviewed**: `8366775e57217d2c93319e26c61b1271d0fe11cb`
- **Classification**: Audit only

---

## 1. Scope & Objective

As SpeakPaste transitions to a minimal, local-only macOS dictation utility, legacy features, pages, and API routing structures from previous iterations must be decommissioned or hidden. The goal of this audit is to identify all residual routes, menus, and wording that do not fit the current target product surface, and prescribe concrete actions (Keep, Hide, Redirect, Merge, Delete).

---

## 2. Route & Surface Classifications

| Route / File Path | Associated Surface | Identified Issue / Leftover | Severity | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| `src/routes/(app)/(config)/recordings` | Recordings Dashboard | Fully functional database table view, accessible by direct URL typing. Contains obsolete terminology ("All Recordings", "Delete all recordings"). Unused in primary sidebar navigation. | **Medium** | **Redirect** to `/` (home page) on mount. History is now inline on the landing screen. Delete route files in a future cleanup cycle. |
| `src/routes/(app)/(config)/transformations` | Text Rules Index | Fully functional table view for editing custom text-replacement rules. Highly complex and accessible via direct URL. | **Medium** | **Redirect** to `/settings` or **Delete** the route since custom text rules are not supported in the initial simplified release. |
| `src/routes/(app)/(config)/debug` | Developer Diagnostics Console | Contains database stress-testing utilities. Correctly guarded by `import.meta.env.DEV`, but references obsolete terms ("Delete All Recordings"). | **Info** | **Keep** but rename buttons (e.g. "Delete All Recordings" -> "Clear Database") to align with dictation-first terminology. Keep hidden in production. |
| `src/routes/(app)/(config)/desktop-app` | Download Landing Page | Legacy download setup view. | **Low** | **Redirect** to `/settings` on mount. |
| `src/routes/(app)/(config)/global-shortcut` | Redundant Global Shortcut Page | Duplicate route for hotkey settings. | **Low** | **Redirect** to `/settings/shortcuts/global` on mount. |
| `src/routes/(app)/(config)/install-ffmpeg` | Setup Walk-through | Legacy setup page for installing FFmpeg capture backend. | **Low** | **Redirect** to `/settings/recording` on mount. |
| `src/routes/transform-clipboard` | Clipboard Rule Processor | Separate window for running text rules on clipboards. Unused in simple menu-bar setup. | **Low** | **Redirect** to `/settings` or **Delete** in next phase. |

---

## 3. Leftover Legacy Language & Patterns

The following files contain legacy names or configurations referencing the original workspace framework:

### A. Settings Data Migrations (`src/routes/(app)/(config)/settings/_page.svelte.js` or similar client bundles)
* **Leftover**: References `whispering-settings` and `whispering-device-config` in local storage keys (lines 2 and 4 in client nodal bundles).
* **Action**: Keep for backwards-compatibility migrations, but document that settings namespace should move to `speakpaste:*` in the future.

### B. Core Database Table Definitions (`src-tauri/src/lib.rs` / `src-tauri/src/local_analytics.rs`)
* **Leftover**: Internally, database collections are named `recordings` instead of `captures`.
* **Action**: Keep database schema names intact to prevent schema breaking changes, but ensure all user-facing Svelte views output "Captures" or "Dictations" (as detailed in the Wording Audit).

### C. Developer Readmes & Markdown Guides
* **Leftover**: Multiple component readmes in `src/lib/components/settings/README.md` reference API keys (`OpenAiApiKeyInput.svelte`, etc.) that have been deleted.
* **Action**: Update or delete stale readme files in documentation cleanup passes.
