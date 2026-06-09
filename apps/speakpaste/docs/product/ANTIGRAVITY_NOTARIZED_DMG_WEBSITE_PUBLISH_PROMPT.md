# Antigravity Prompt: Publish Mynah 1.0.0 Notarized DMG On Website

## Purpose

Use this prompt in Antigravity to publish the final **Mynah 1.0.0** signed, notarized, stapled DMG to the Mynah website.

Important:

- Do **not** assume the website DMG is already notarized.
- Do **not** publish the old `Mynah_0.1.1_aarch64.dmg`.
- Do **not** publish any DMG until fresh local validation passes.
- The current website has been prepared for 1.0.0, but intentionally leaves the artifact empty until the new notarized DMG is ready.

---

## Current Repo State

App repo:

```text
/Users/irfan/projects/SpeakPaste/speakpaste
```

Expected app commit baseline:

```text
f4a5665 Polish macOS UI and bump Mynah to 1.0.0
```

Website repo:

```text
/Users/irfan/projects/Mynah/website
```

Expected website commit baseline:

```text
ff98a72 Prepare website for Mynah 1.0 launch
```

Website GitHub repo:

```text
https://github.com/teachme-ai/mynah-site
```

Production website:

```text
https://mynah.site
```

---

## Product Facts

- Product name: `Mynah`
- Bundle identifier: `com.mynah.app`
- Marketing version: `1.0.0`
- Architecture: Apple Silicon / `aarch64`
- Minimum macOS: `10.15`
- Pricing: one-time lifetime license, `$29` / `₹1499`
- Support: `irfan@teachmeai.in`
- Distribution: direct download from `mynah.site`, not App Store

Expected DMG filename:

```text
Mynah_1.0.0_aarch64.dmg
```

Expected local DMG path after build:

```text
/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src-tauri/target/release/bundle/dmg/Mynah_1.0.0_aarch64.dmg
```

Signing/notarization playbook:

```text
/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/docs/product/MYNAH_SIGNING_NOTARIZATION_PLAYBOOK.md
```

Publish report target:

```text
/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/docs/product/ANTIGRAVITY_NOTARIZED_DMG_WEBSITE_PUBLISH_REPORT.md
```

---

## AG Mission

Publish the **new 1.0.0 notarized DMG** to the website release flow and update all public metadata so users, GitHub, Vercel, and AI agents find the correct artifact.

Preferred release hosting:

```text
GitHub Releases asset on teachme-ai/mynah-site, tag v1.0.0
```

Website deployment:

```text
Automatic Vercel deployment from GitHub push to teachme-ai/mynah-site main
```

Do not modify Mynah app source code except for the publish report unless explicitly required.

---

## Step 0: Check Clean Baselines

Run:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste
git status --short
git log --oneline -1

cd /Users/irfan/projects/Mynah/website
git status --short
git log --oneline -1
```

Expected:

- app repo is clean or only has the publish report after this workflow
- app repo version sources already say `1.0.0`
- website repo may have an untracked `.gitignore`; do not stage it unless asked
- website repo is at or after `ff98a72`

If the website repo is behind GitHub, run:

```bash
git pull --ff-only origin main
```

---

## Step 1: Confirm Artifact Exists

Run:

```bash
ls -lh /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src-tauri/target/release/bundle/dmg/Mynah_1.0.0_aarch64.dmg
```

Expected:

- file exists
- filename is exactly `Mynah_1.0.0_aarch64.dmg`
- size is around the expected built DMG size

If the file does not exist, stop and report:

```text
Mynah 1.0.0 DMG is not ready yet.
```

---

## Step 2: Confirm App Version And Build Metadata

Run:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste
cat package.json | grep '"version"'
cat src-tauri/tauri.conf.json | grep '"version"'
cat src-tauri/Cargo.toml | grep '^version'
cat src-tauri/build-meta.json
cat src-tauri/tauri.macos.conf.json
```

Expected:

- marketing version is `1.0.0`
- `build-meta.json` exists
- `buildSignature` starts with `1.0.0+r`
- `bundleVersion` is present

Record:

- marketing version
- bundle version
- release number / git commit count
- build signature
- git commit
- builtAtIso

Do **not** hardcode Release 150. Use the current values from the newly built artifact metadata.

---

## Step 3: Fresh Notarization And Gatekeeper Validation

Run from the app directory:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste
xcrun stapler validate src-tauri/target/release/bundle/dmg/Mynah_1.0.0_aarch64.dmg
spctl --assess --type open --context context:primary-signature --verbose src-tauri/target/release/bundle/dmg/Mynah_1.0.0_aarch64.dmg
spctl --assess --type execute --verbose src-tauri/target/release/bundle/macos/Mynah.app
```

Expected:

```text
The validate action worked!
accepted
source=Notarized Developer ID
accepted
source=Notarized Developer ID
```

If any validation fails:

- stop immediately
- do not upload the DMG
- do not update website metadata to `released`
- report the failing command and output

Do not re-notarize unless explicitly asked.

---

## Step 4: Generate SHA256 And Size

Run:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste
shasum -a 256 src-tauri/target/release/bundle/dmg/Mynah_1.0.0_aarch64.dmg
du -h src-tauri/target/release/bundle/dmg/Mynah_1.0.0_aarch64.dmg
```

Record:

- filename
- SHA256 hash
- size label

---

## Step 5: Create Or Update GitHub Release

Use GitHub release tag:

```text
v1.0.0
```

Release title:

```text
Mynah 1.0.0
```

Attach:

```text
Mynah_1.0.0_aarch64.dmg
```

Recommended `gh` commands:

```bash
cd /Users/irfan/projects/Mynah/website
gh release view v1.0.0 --repo teachme-ai/mynah-site
```

If release does not exist:

```bash
gh release create v1.0.0 \
  /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src-tauri/target/release/bundle/dmg/Mynah_1.0.0_aarch64.dmg \
  --repo teachme-ai/mynah-site \
  --title "Mynah 1.0.0" \
  --notes "Mynah 1.0.0 for Apple Silicon. Signed with Developer ID, notarized by Apple, stapled, and ready for direct Mac installation."
```

If release exists, replace the asset:

```bash
gh release upload v1.0.0 \
  /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src-tauri/target/release/bundle/dmg/Mynah_1.0.0_aarch64.dmg \
  --repo teachme-ai/mynah-site \
  --clobber
```

Final artifact URL should be the GitHub release asset URL, typically:

```text
https://github.com/teachme-ai/mynah-site/releases/download/v1.0.0/Mynah_1.0.0_aarch64.dmg
```

Use that URL in website metadata.

Do not copy the DMG to `website/public/` unless explicitly instructed.

---

## Step 6: Update Website Files

Website repo:

```bash
cd /Users/irfan/projects/Mynah/website
```

Update these files:

```text
download/index.html
downloads.json
facts/index.html
llms.txt
index.html
```

Optional only if needed:

```text
sitemap.xml
```

Do not stage the untracked `.gitignore` unless specifically asked.

### `downloads.json`

Replace the current placeholder:

```json
"artifacts": [],
"status": "preparing-1.0.0-notarized-dmg"
```

with final release metadata:

```json
{
  "product": "Mynah",
  "version": "1.0.0",
  "release": {
    "number": <RELEASE_NUMBER>,
    "bundleVersion": "<BUNDLE_VERSION>",
    "buildSignature": "<BUILD_SIGNATURE>",
    "builtAtIso": "<BUILT_AT_ISO>",
    "gitCommit": "<GIT_COMMIT>"
  },
  "pricing": {
    "usd": 29,
    "inr": 1499,
    "model": "one-time lifetime license"
  },
  "artifacts": [
    {
      "platform": "macos",
      "arch": "aarch64",
      "label": "Apple Silicon",
      "filename": "Mynah_1.0.0_aarch64.dmg",
      "url": "<FINAL_DMG_URL>",
      "size_mb": <SIZE_MB_NUMBER>,
      "sha256": "<SHA256>",
      "min_os": "10.15",
      "notarized": true,
      "stapled": true,
      "signedBy": "Developer ID Application: Khalid Irfan (99YAK7YU3M)",
      "notes": "Apple Silicon. Signed with Developer ID, notarized by Apple, and stapled for Gatekeeper validation."
    }
  ],
  "status": "released"
}
```

Use valid JSON. If exact `size_mb` is awkward, use a rounded integer.

### `download/index.html`

Replace the current preparing state:

```text
1.0.0 DMG being prepared
The 1.0.0 notarized DMG and SHA-256 checksum will appear here after final validation.
```

with:

```text
Download Mynah 1.0.0 for Apple Silicon
Version 1.0.0 · Release <RELEASE_NUMBER> · Apple Silicon · macOS 10.15+
Signed with Developer ID, notarized by Apple, and stapled for Gatekeeper validation.
SHA-256: <SHA256>
```

Button:

```html
<a class="button button-primary" href="<FINAL_DMG_URL>">Download Mynah for Apple Silicon</a>
```

Keep the install steps and permission guidance.

### `index.html`

Update launch trust/pricing copy so it no longer says:

```text
Version 1.0.0 is being prepared as the first notarized public release package.
```

Replace with:

```text
Version 1.0.0 is signed with Developer ID, notarized by Apple, and ready for direct Mac installation.
```

### `facts/index.html`

Update:

- Current version: `1.0.0`
- Release status: signed, notarized, stapled, ready for direct download
- Supported architecture: Apple Silicon / `aarch64`
- Download URL: `<FINAL_DMG_URL>`
- SHA256: `<SHA256>`

### `llms.txt`

Update product facts:

- Current version: `1.0.0`
- Release number: `<RELEASE_NUMBER>`
- Build signature: `<BUILD_SIGNATURE>`
- Apple Silicon DMG URL: `<FINAL_DMG_URL>`
- SHA256: `<SHA256>`
- Notarized: yes
- Stapled: yes
- Signed by: `Developer ID Application: Khalid Irfan (99YAK7YU3M)`

Do not include Apple app-specific passwords or private credentials.

---

## Step 7: Validate Website Locally

Run:

```bash
cd /Users/irfan/projects/Mynah/website
python3 -m json.tool downloads.json >/dev/null
grep -R "preparing-1.0.0-notarized-dmg\\|DMG being prepared\\|will appear here after final validation\\|trial/beta\\|Mynah_0.1.1\\|0.1.1" -n index.html download/index.html facts/index.html llms.txt downloads.json || true
grep -R "APPLE_APP_SPECIFIC_PASSWORD\\|ypmh\\|qtmr\\|password" -n . --exclude-dir=.git || true
```

Expected:

- JSON validation passes
- no stale 1.0.0 preparing text remains on public pages
- no `0.1.1` release artifact references remain in public release files
- no private credentials

It is OK if `compare/index.html` mentions competitor free tiers. Do not remove that just because it says `Free`.

Optional static server check:

```bash
cd /Users/irfan/projects/Mynah/website
python3 -m http.server 4181
```

Check:

```text
http://127.0.0.1:4181/
http://127.0.0.1:4181/download/
http://127.0.0.1:4181/downloads.json
```

---

## Step 8: Commit And Push Website Update

In website repo:

```bash
cd /Users/irfan/projects/Mynah/website
git status --short
git add download/index.html downloads.json facts/index.html llms.txt index.html
git commit -m "Publish Mynah 1.0 notarized DMG"
git push origin main
```

Only stage files that changed. Do not stage `.gitignore` unless intentionally edited.

---

## Step 9: Push And Let Vercel Auto-Deploy

Do **not** manually deploy with Vercel CLI.

The Mynah website is connected to Vercel through GitHub. Pushing `main` to:

```text
https://github.com/teachme-ai/mynah-site
```

triggers the production deployment for:

```text
https://mynah.site
```

After `git push origin main`, wait for the Vercel/GitHub deployment to finish, then confirm:

- production deployment succeeded
- `https://mynah.site/download/` shows the final DMG button
- `https://mynah.site/downloads.json` has the final artifact URL and SHA256
- `https://mynah.site/llms.txt` exposes the notarized release facts

If needed, inspect deployment status through GitHub checks, Vercel dashboard, or Vercel CLI read-only inspection. Do not run `vercel --prod --yes` unless the GitHub integration fails and the user explicitly approves a manual fallback.

---

## Step 10: Fresh Download Test

After deployment:

1. Open `https://mynah.site/download/`.
2. Download the DMG from the live site.
3. Confirm the downloaded file SHA256 matches `<SHA256>`.
4. Open the downloaded DMG.
5. Drag Mynah to Applications.
6. Launch `/Applications/Mynah.app`.
7. Confirm there is no "damaged and can't be opened" warning.
8. Confirm macOS permission prompts are normal:
   - Microphone
   - Accessibility
9. Confirm Fn dictation works in TextEdit or Notes.

This is the true user-path validation.

---

## Step 11: Write Publish Report

Create:

```text
/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/docs/product/ANTIGRAVITY_NOTARIZED_DMG_WEBSITE_PUBLISH_REPORT.md
```

Include:

```markdown
# Antigravity Notarized DMG Website Publish Report

## Summary

## Artifact

- Path:
- Filename:
- Size:
- SHA256:
- Marketing version:
- Release number:
- Bundle version:
- Build signature:
- Notarized:
- Stapled:
- Gatekeeper DMG result:
- Gatekeeper app result:

## Hosting

- GitHub release:
- Artifact URL:

## Website Updates

- Files changed:
- Commit:
- Deployment URL:
- Deployment trigger: GitHub push to `main`

## Live Validation

| URL | Status | Notes |
| --- | --- | --- |

## Fresh Download Test

## Issues

## Follow-Up Actions
```

Commit the report in the app repo:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste
git status --short
git add apps/speakpaste/docs/product/ANTIGRAVITY_NOTARIZED_DMG_WEBSITE_PUBLISH_REPORT.md
git commit -m "Document Mynah 1.0 notarized DMG website publish"
```

Do not stage unrelated app repo files.

---

## Guardrails

- Do not upload an unnotarized DMG.
- Do not upload an unstapled DMG.
- Do not publish `Mynah_0.1.1_aarch64.dmg`.
- Do not publish old SpeakPaste artifacts.
- Do not invent a DMG URL.
- Do not include Apple app-specific passwords anywhere.
- Do not claim Intel support unless an Intel/universal DMG is separately built and validated.
- Do not claim App Store availability.
- Do not remove non-App-Store install guidance entirely; keep it as context, but the primary message should now say the DMG is signed and notarized.
- Do not leave `downloads.json` with empty `artifacts` after publishing.
- Do not manually deploy with Vercel CLI unless GitHub auto-deploy fails and the user explicitly approves a fallback.
- Do not push the website until local metadata points to the final validated artifact.

---

## Expected AG Response To User

Report:

1. final DMG URL
2. SHA256
3. release number / bundle version / build signature
4. website commit hash
5. Vercel deployment URL
6. whether `https://mynah.site/download/` is live
7. whether fresh download test passed
8. path to the publish report
