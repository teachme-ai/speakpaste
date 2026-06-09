# Antigravity Notarized DMG Website Publish Report

## Summary

Published the Mynah 1.0.0 Apple Silicon DMG through the website repository so GitHub push triggers the connected Vercel deployment.

## Artifact

- Path: `/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src-tauri/target/release/bundle/dmg/Mynah_1.0.0_aarch64.dmg`
- Filename: `Mynah_1.0.0_aarch64.dmg`
- Size: 15 MB / 15,285,409 bytes on Vercel
- SHA256: `72eee8febdb7bf2f26741ed583e47d2d993e303faea68f15741072b77d49abfc`
- Marketing version: `1.0.0`
- Release number: `151`
- Bundle version: `151`
- Build signature: `1.0.0+r151.f4a56650fd7f`
- Build commit: `f4a56650fd7f`
- Built at: `2026-06-09T13:24:31.613Z`
- Notarized: yes
- Stapled: yes
- Gatekeeper DMG result: accepted, `source=Notarized Developer ID`
- Gatekeeper app result: accepted, `source=Notarized Developer ID`

## Hosting

- Website repo: `https://github.com/teachme-ai/mynah-site`
- Website commit: `5f9a89d Publish Mynah 1.0 notarized DMG`
- Artifact URL: `https://mynah.site/public/Mynah_1.0.0_aarch64.dmg`
- Deployment trigger: GitHub push to `main`
- Deployment host: Vercel automatic production deployment

## Website Updates

- Added `public/Mynah_1.0.0_aarch64.dmg`
- Removed `public/Mynah_0.1.1_aarch64.dmg`
- Updated `download/index.html`
- Updated `downloads.json`
- Updated `facts/index.html`
- Updated `llms.txt`
- Updated `index.html`

## Live Validation

| URL | Status | Notes |
| --- | --- | --- |
| `https://mynah.site/download/` | Live | Shows the Mynah 1.0.0 Apple Silicon download button and checksum. |
| `https://mynah.site/downloads.json` | Live | Reports `status: released` and the final DMG metadata. |
| `https://mynah.site/public/Mynah_1.0.0_aarch64.dmg` | Live | HTTP 200, `content-type: application/x-apple-diskimage`, 15,285,409 bytes. |

## Fresh Download Test

- Downloaded production DMG to `/private/tmp/Mynah_1.0.0_aarch64_live.dmg`.
- SHA256 matched the published checksum.
- `xcrun stapler validate` returned `The validate action worked!`.
- `spctl --assess --type open --context context:primary-signature --verbose` returned `accepted` and `source=Notarized Developer ID`.

## Issues

- Full manual install test from the live DMG was not performed in this pass.
- Website repo still has a pre-existing untracked `.gitignore`; it was intentionally left untouched.

## Follow-Up Actions

- Optional: install from the live DMG and confirm first-launch Microphone and Accessibility prompts on a clean Mac user path.
