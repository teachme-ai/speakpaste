# SpeakPaste Diagnostics Usability Spec

- **Branch**: `local-only-product-surface`
- **Latest Commit Reviewed**: `8366775e57217d2c93319e26c61b1271d0fe11cb`
- **Classification**: Audit + proposed implementation plan

---

## 1. Overview & Principles

In accordance with SpeakPaste’s local-only architecture, the diagnostics system must serve purely as a self-debugging and support utility for the user. It must remain 100% user-respectful and run entirely on-device, adhering to the following core tenets:

1. **Zero-Cloud Integration**: No diagnostic logs, error reports, or metrics are ever sent to an external server. Any data sharing (e.g. for developer troubleshooting) must be manually initiated by the user.
2. **Strict Privacy Gating**: Under no circumstances will transcript text, raw audio, selected clipboard text, or application-focus text be logged to the diagnostic file.
3. **Transparency**: The user must have complete visibility into where metrics are stored, what is in them, and can clear them with a single click.

---

## 2. Setting Integration Layout

The diagnostics actions belong in the **Privacy & Tech** tab (currently located at route `/settings/analytics`), directly underneath the cards explaining *What we may keep locally* and *What stays private*.

### Proposed Settings Layout Design

```text
Privacy
─────────────────────────────────────────────────────────────────────────────
[Device Only Badge]
SpeakPaste keeps operational insight on this Mac. Diagnostics are about app
health and performance, not the private words you dictate.

┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐
│ What we may keep locally               │ │ What stays private                     │
│ • Session count & recording duration   │ │ • Transcript text & raw audio          │
│ • Transcription latency & model load   │ │ • Selected text & clipboard data       │
│ • Paste result & local engine used     │ │ • Off-device usage reporting           │
└────────────────────────────────────────┘ └────────────────────────────────────────┘

Local Diagnostics & Support
─────────────────────────────────────────────────────────────────────────────
Logs are saved in JSON Lines format (.jsonl) in your system application support directory.
You can open the directory, copy the path, or bundle them to share with developers.

[ Open Diagnostics Folder ] [ Copy Path ] [ Export Diagnostics Bundle ]

[ Clear All Logs ] (destructive)
```

---

## 3. Required Frontend Actions

We will introduce four key frontend actions mapped to Svelte UI button triggers:

### A. Open Diagnostics Folder
* **Label**: "Open Log Folder"
* **Action**: Invokes Tauri FFI command to reveal the `diagnostics/` folder in Finder.
* **UX behavior**: Opens Finder immediately in the foreground.

### B. Copy Diagnostics Path
* **Label**: "Copy Absolute Path"
* **Action**: Requests path string from Rust FFI and writes it to the macOS clipboard using the browser `navigator.clipboard.writeText` API.
* **UX behavior**: Displays a brief "Copied!" checkmark transition for 1.5 seconds.

### C. Export Diagnostics Bundle
* **Label**: "Export Diagnostics"
* **Action**: Invokes Tauri FFI to create a compressed `.zip` folder on the user's Desktop.
* **UX behavior**: Triggers a system dialog confirmation or notification stating: *"Diagnostics bundle saved to Desktop as: SpeakPaste_Diagnostics_178492040.zip"*.

### D. Clear Diagnostics
* **Label**: "Clear Logs & History"
* **Action**: Invokes Tauri FFI command to wipe files in the `diagnostics/` subfolder.
* **UX behavior**: Standard warning modal: *"Are you sure you want to clear all local diagnostics? This will reset all session performance history."* with confirmation.

---

## 4. Proposed Tauri FFI Rust Implementation

We will add the following endpoints to the Tauri command registry:

### File: `apps/speakpaste/src-tauri/src/local_analytics.rs`

```rust
use std::path::PathBuf;

// Helper to resolve diagnostics path
fn diagnostics_dir_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?
        .join("diagnostics");

    if !dir.exists() {
        std::fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create diagnostics directory: {}", e))?;
    }
    Ok(dir)
}

#[tauri::command]
pub async fn open_diagnostics_folder(app: tauri::AppHandle) -> Result<(), String> {
    let dir = diagnostics_dir_path(&app)?;
    
    // Launch macOS Finder revealing the path
    std::process::Command::new("open")
        .arg(&dir)
        .spawn()
        .map_err(|e| format!("Failed to open directory in Finder: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_diagnostics_path(app: tauri::AppHandle) -> Result<String, String> {
    let dir = diagnostics_dir_path(&app)?;
    Ok(dir.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn clear_diagnostics_logs(app: tauri::AppHandle) -> Result<(), String> {
    let dir = diagnostics_dir_path(&app)?;
    
    if dir.exists() {
        for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.is_file() {
                std::fs::remove_file(path)
                    .map_err(|e| format!("Failed to delete file {}: {}", path.display(), e))?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn export_diagnostics_bundle(app: tauri::AppHandle) -> Result<String, String> {
    let diagnostics_dir = diagnostics_dir_path(&app)?;
    let desktop_dir = app
        .path()
        .desktop_dir()
        .map_err(|e| format!("Failed to resolve Desktop folder: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    let zip_filename = format!("SpeakPaste_Diagnostics_{}.zip", timestamp);
    let zip_output_path = desktop_dir.join(&zip_filename);

    if !diagnostics_dir.exists() {
        return Err("No diagnostic logs exist yet to export.".to_string());
    }

    // Shell out to native macOS 'zip' to avoid external cargo dependency crates
    let status = std::process::Command::new("zip")
        .arg("-r")
        .arg(&zip_output_path)
        .arg(".")
        .current_dir(&diagnostics_dir)
        .status()
        .map_err(|e| format!("Failed to compress logs: {}", e))?;

    if !status.success() {
        return Err("Zip operation returned a non-zero exit code.".to_string());
    }

    Ok(zip_output_path.to_string_lossy().into_owned())
}
```

---

## 5. UI Integration Reference

Below is the layout template to replace/insert into the end of `apps/speakpaste/src/routes/(app)/(config)/settings/analytics/+page.svelte`:

```svelte
<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { Button } from '@epicenter/ui/button';
	import { toast } from '@epicenter/ui/toast'; // Or standard alert UI if toast is unavailable

	let isExporting = false;
	let isClearing = false;
	let copyStatus = "Copy path";

	async function handleOpenFolder() {
		try {
			await invoke('open_diagnostics_folder');
		} catch (err) {
			console.error(err);
		}
	}

	async function handleCopyPath() {
		try {
			const path = await invoke<string>('get_diagnostics_path');
			await navigator.clipboard.writeText(path);
			copyStatus = "Copied!";
			setTimeout(() => {
				copyStatus = "Copy path";
			}, 1500);
		} catch (err) {
			console.error(err);
		}
	}

	async function handleExport() {
		isExporting = true;
		try {
			const zipPath = await invoke<string>('export_diagnostics_bundle');
			alert(`Diagnostics zip successfully exported to Desktop: \n${zipPath}`);
		} catch (err) {
			alert(`Failed to export diagnostics: ${err}`);
		} finally {
			isExporting = false;
		}
	}

	async function handleClear() {
		if (!confirm("Are you sure you want to delete all local diagnostics logs? This action is permanent.")) {
			return;
		}
		isClearing = true;
		try {
			await invoke('clear_diagnostics_logs');
			alert("Local diagnostics logs successfully cleared.");
		} catch (err) {
			alert(`Failed to clear logs: ${err}`);
		} finally {
			isClearing = false;
		}
	}
</script>

<div class="mt-8 pt-8 border-t border-border space-y-4">
	<div>
		<h4 class="text-sm font-semibold tracking-tight text-foreground">
			Local Diagnostics & Support
		</h4>
		<p class="text-sm text-muted-foreground leading-relaxed mt-1">
			Operational metrics are stored in a simple JSON Lines format (`local-analytics.jsonl`)
			inside your local Application Support path. No transcript contents are retained.
		</p>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<Button variant="outline" on:click={handleOpenFolder}>
			Open Folder
		</Button>
		<Button variant="outline" on:click={handleCopyPath}>
			{copyStatus}
		</Button>
		<Button variant="default" on:click={handleExport} disabled={isExporting}>
			{isExporting ? "Exporting..." : "Export Diagnostics Bundle"}
		</Button>
	</div>

	<div class="pt-4">
		<Button variant="destructive" size="sm" on:click={handleClear} disabled={isClearing}>
			{isClearing ? "Clearing..." : "Clear Local Logs"}
		</Button>
	</div>
</div>
```

---

## 6. Verification Criteria for Codex

When implementing the slice defined by this spec, Codex must verify:
1. **Import safety**: Confirm `@tauri-apps/api/core` is resolved correctly inside Svelte.
2. **Command Registration**: Verify `open_diagnostics_folder`, `get_diagnostics_path`, `clear_diagnostics_logs`, and `export_diagnostics_bundle` are registered in the Tauri app handler inside `lib.rs`.
3. **ZIP Compatibility**: Ensure `zip` is invoked on the correct directory level and outputs cleanly to `~/Desktop`.
4. **AppNap Safety**: Confirm Svelte diagnostics functions operate normally after the app window is hidden and reopened.
