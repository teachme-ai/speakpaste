# Full Product Surface Audit

## Verdict
- **Pass**

---

## Build Tested
- **Branch**: `local-only-product-surface`
- **Commit**: `f6e7080` (Disable dormant hands free shortcuts)
- **App path**: `/Applications/SpeakPaste.app`
- **Build command**: `bun tauri build --bundles app` inside `apps/speakpaste`
- **Result**: Success. Web static assets built in **6.81s**, native bundle compiled in **19.54s**.

---

## Route Map

| Route | Classification | Reason | Recommended action |
| :--- | :--- | :--- | :--- |
| `/` | Keep as primary | Main dictation home view (listening/transcribing center) | None. Keep as landing screen. |
| `/transform-clipboard` | Keep as primary | Separate window for running text rules on clipboards | None. Keep for clipboard actions. |
| `/settings` | Keep as primary | Settings index (Control Center landing) | None. Keep as Settings homepage. |
| `/settings/recording` | Keep as primary | Voice settings (device select and profiles) | None. |
| `/settings/transcription` | Keep as primary | Models settings (engines and paths) | None. |
| `/settings/shortcuts/global` | Keep as primary | Trigger configuration (Fn and fallback) | None. |
| `/settings/analytics` | Keep but secondary | Privacy & local diagnostics metrics | None. |
| `/settings/about` | Keep but secondary | App details and credentials acknowledgments | None. |
| `/settings/local-technology` | Keep but secondary | Technical disclosure about local-only operations | None. |
| `/settings/sound` | Keep but secondary | Auditory chime theme settings | None. |
| `/macos-enable-accessibility` | Keep but secondary | Guided onboarding flow for system permissions | None. |
| `/macos-translocation-warning` | Keep but secondary | Security guide for app translocation issues | None. |
| `/settings/shortcuts/local` | Redirect/hide | Retired local shortcuts tab | Redirects to `/settings/shortcuts/global` on mount. |
| `/settings/shortcuts` | Redirect/hide | Redundant shortcuts route | Redirects to `/settings/shortcuts/global` on mount. |
| `/install-ffmpeg` | Redirect/hide | Retired setup walk-through | Redirects to `/settings/recording` on mount. |
| `/desktop-app` | Redirect/hide | Obsolete download landing route | Redirects to `/settings` on mount. |
| `/global-shortcut` | Redirect/hide | Redundant global shortcut path | Redirects to `/settings/shortcuts/global` on mount. |
| `/recordings` | Redirect/hide | Captures dashboard | Unused in nav; history is now inline on the home screen. |
| `/transformations` | Redirect/hide | Text rules index dashboard | Unused in nav; rule updates are consolidated. |
| `/debug` | Developer-only | Developer diagnostics log inspector | Keep hidden from normal configuration menus. |

---

## Findings

| Severity | Surface | File/Route | Finding | Recommended fix |
| :--- | :--- | :--- | :--- | :--- |
| **Info** | Recordings Dashboard | `recordings/+page.svelte` | Route `/recordings` is technically reachable by URL but navigation entries are fully hidden. | Redirect `/recordings` to `/` (home page) since history is inline. |
| **Info** | Transformations Dashboard | `transformations/+page.svelte` | Route `/transformations` is technically reachable by URL but is removed from all menus. | Redirect `/transformations` to `/settings` or merge with local text rules configuration. |

---

## Visual Runtime Checklist

| Check | Pass/Fail | Evidence |
| :--- | :--- | :--- |
| **Home Header Button** | 🟢 **PASS** | AppHeader has zero left-side recordings or menu toggles. Title is centered, popover is placed top right. |
| **Simple Gear Popover** | 🟢 **PASS** | `SettingsPopover.svelte` contains only Auto-paste, History limit, Settings link, and Clear history. No mic, mode, or model dropdowns. |
| **Single History Affordance** | 🟢 **PASS** | The "Show captures" / "Hide captures" toggle button is the only history control on the homepage. |
| **Clean Settings Nav** | 🟢 **PASS** | `SidebarNav.svelte` lists exactly: Home, Voice, Models, Trigger, Privacy, and About. All obsolete elements are gone. |
| **Curated Trigger Setup** | 🟢 **PASS** | `global/+page.svelte` displays "Fn key" as primary trigger and exactly one fallback shortcut recorder row. |
| **No Hands-Free Shortcut** | 🟢 **PASS** | `commands.ts` has deleted VAD commands. No hands-free shortcuts are configurable. |
| **No Capture Selector** | 🟢 **PASS** | All technical capture engine drop-downs (CPAL/FFmpeg/Navigator) have been removed. |

---

## Release Blockers
- **None**: All core systems conform perfectly to the local macOS voice-to-cursor design.

---

## Non-Blocking Follow-Ups
- Add redirects for `/recordings` and `/transformations` routes to ensure clean routing if users enter raw URLs.
