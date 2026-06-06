# Antigravity Task: Full Product Surface Audit

## Purpose

Run a complete product-surface audit for Mynah after the local-only cleanup work.

This audit must catch every old inherited surface, hidden navigation path, confusing entry point, stale copy, or feature affordance that makes the app feel like the previous broad Whispering-style product instead of the focused Mac voice-to-cursor app.

## Current Product Baseline

Mynah is currently a local-only macOS voice-to-cursor app.

The launch promise is:

- Hold `Fn` to speak.
- Release to transcribe locally.
- Paste into the active app.
- Keep data on this Mac.

The app should not feel like a multi-mode recorder, browser extension, FFmpeg setup tool, generic transcription dashboard, or clone of Wispr/Whispering settings.

## Audit Scope

Audit all user-visible routes and entry points, not only Settings.

Include:

- Home window
- Gear popover
- Menu-bar/tray behavior
- Settings routes
- Recordings/captures routes
- Transformations/Text Rules routes
- Debug/developer routes
- Redirected legacy routes
- Any direct links, buttons, icons, popovers, empty states, toasts, or error actions

## Explicit Things To Find

Flag any remaining user-facing reference to:

- Chrome Extension
- Desktop app download
- Install FFmpeg
- CPAL
- FFmpeg command builder
- Navigator / MediaRecorder
- browser extension flows
- local in-window shortcuts
- VAD / hands-free / voice activation as an active user feature
- upload-file transcription as a primary workflow
- “all recordings” as a primary navigation mode
- old broad app-shell navigation
- account/cloud/API-key/provider surfaces
- updater/release/update settings
- Wispr-like deep setup panels or multi-tab technical configuration

Also flag:

- duplicate ways to reach the same thing
- icons without obvious purpose
- routes that are technically reachable but should redirect
- pages that still exist but are no longer part of launch
- misleading copy that implies a feature is active when it is paused/dormant
- any route where the first screen is a table/dashboard rather than the voice-to-cursor loop

## Required Code Search

Run searches over `apps/mynah/src` for at least:

```sh
rg -n "Chrome|Extension|Desktop App|Download|FFmpeg|CPAL|Navigator|MediaRecorder|VAD|voice activated|hands-free|Upload|recordings|All Recordings|shortcut|updater|update|provider|API key|cloud|account|login"
```

Then inspect all matches that are user-visible UI/copy/action paths.

## Required Route Map

Produce a route map from:

```sh
rg --files apps/mynah/src/routes
```

Group routes into:

- Keep as primary
- Keep but secondary
- Redirect/hide
- Delete candidate
- Developer-only

## Runtime / Visual Validation

Use the latest committed branch state.

Build and run the app that would actually be tested locally. If replacing `/Applications/Mynah.app`, state that clearly.

Validate visually:

1. Home header has no left-side recordings/menu button.
2. Gear popover is simple and does not expose recording mode, model selector, device selector, or all-recordings link.
3. `Show captures` is the only main-screen history affordance.
4. Settings nav remains `Home`, `Voice`, `Models`, `Trigger`, `Privacy`, `About`.
5. Trigger page shows Fn as primary and one fallback shortcut row.
6. No hands-free/VAD shortcut appears.
7. No technical capture backend selector appears.

## Output File

Write results to:

`apps/mynah/docs/product/ANTIGRAVITY_REVIEW_FULL_PRODUCT_SURFACE_AUDIT.md`

## Output Format

Use this structure:

```md
# Full Product Surface Audit

## Verdict
- Pass / Needs Fixes

## Build Tested
- Branch:
- Commit:
- App path:
- Build command:
- Result:

## Route Map
| Route | Classification | Reason | Recommended action |

## Findings
| Severity | Surface | File/Route | Finding | Recommended fix |

## Visual Runtime Checklist
| Check | Pass/Fail | Evidence |

## Release Blockers
- ...

## Non-Blocking Follow-Ups
- ...
```

Be strict. If something is still confusing but technically works, flag it.
