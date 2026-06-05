use crate::build_info::current_build_info;
use log::info;
#[cfg(target_os = "macos")]
use macos_accessibility_client::accessibility::{
    application_is_trusted, application_is_trusted_with_prompt,
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const ACCESSIBILITY_RECOVERY_FILE: &str = "accessibility-recovery.json";

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct AccessibilityRecoveryState {
    version: u32,
    has_seen_accessibility_trusted: bool,
    last_tcc_reset_build_signature: Option<String>,
    last_install_fingerprint: Option<InstallFingerprint>,
    updated_at_ms: u128,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallFingerprint {
    bundle_identifier: String,
    bundle_path: String,
    executable_path: String,
    build_signature: String,
    marketing_version: String,
    bundle_version: String,
    git_commit: String,
    built_at_iso: String,
    bundle_modified_at_ms: Option<u128>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilityRepairResult {
    pub trusted: bool,
    pub prompted: bool,
    pub did_reset: bool,
    pub install_changed: bool,
    pub needs_user_approval: bool,
    pub recovery_state: String,
    pub bundle_path: Option<String>,
    pub build_signature: String,
}

#[tauri::command]
pub async fn repair_accessibility_permissions_if_needed(
    app: AppHandle,
    force: Option<bool>,
) -> Result<AccessibilityRepairResult, String> {
    #[cfg(not(target_os = "macos"))]
    {
        let build_info = current_build_info();
        return Ok(AccessibilityRepairResult {
            trusted: true,
            prompted: false,
            did_reset: false,
            install_changed: false,
            needs_user_approval: false,
            recovery_state: "not_applicable".to_string(),
            bundle_path: None,
            build_signature: build_info.build_signature,
        });
    }

    #[cfg(target_os = "macos")]
    {
        let current = current_install_fingerprint(&app)?;
        let mut state = read_recovery_state(&app)?;
        let install_changed = state
            .last_install_fingerprint
            .as_ref()
            .map(|previous| fingerprint_changed(previous, &current))
            .unwrap_or(false);
        let trusted_before = application_is_trusted();

        if trusted_before {
            state.has_seen_accessibility_trusted = true;
            state.last_install_fingerprint = Some(current.clone());
            state.updated_at_ms = now_ms();
            write_recovery_state(&app, &state)?;

            return Ok(AccessibilityRepairResult {
                trusted: true,
                prompted: false,
                did_reset: false,
                install_changed,
                needs_user_approval: false,
                recovery_state: "trusted".to_string(),
                bundle_path: Some(current.bundle_path.clone()),
                build_signature: current.build_signature.clone(),
            });
        }

        let should_reset =
            force.unwrap_or(false) || should_reset_stale_accessibility(&state, &current);
        let did_reset = if should_reset {
            info!(
                "[Permissions] resetting stale Accessibility entry for {}",
                current.bundle_identifier
            );
            reset_tcc_permissions_for_bundle(&current.bundle_identifier)?;
            state.last_tcc_reset_build_signature = Some(current.build_signature.clone());
            true
        } else {
            false
        };

        let prompted = !application_is_trusted();
        if prompted {
            let _ = application_is_trusted_with_prompt();
        }

        let trusted_after = application_is_trusted();
        state.last_install_fingerprint = Some(current.clone());
        state.updated_at_ms = now_ms();
        if trusted_after {
            state.has_seen_accessibility_trusted = true;
        }
        write_recovery_state(&app, &state)?;

        Ok(AccessibilityRepairResult {
            trusted: trusted_after,
            prompted,
            did_reset,
            install_changed,
            needs_user_approval: !trusted_after,
            recovery_state: repair_state_label(trusted_after, did_reset, install_changed),
            bundle_path: Some(current.bundle_path),
            build_signature: current.build_signature,
        })
    }
}

#[cfg(target_os = "macos")]
pub fn reset_tcc_permissions_for_bundle(bundle_identifier: &str) -> Result<(), String> {
    let status = std::process::Command::new("tccutil")
        .args(["reset", "Accessibility", bundle_identifier])
        .status()
        .map_err(|error| format!("Failed to launch tccutil reset: {}", error))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "tccutil reset Accessibility {} failed with status {}",
            bundle_identifier, status
        ))
    }
}

#[cfg(target_os = "macos")]
fn current_install_fingerprint(app: &AppHandle) -> Result<InstallFingerprint, String> {
    let build_info = current_build_info();
    let executable_path = std::env::current_exe()
        .map_err(|error| format!("Failed to resolve current executable path: {}", error))?;
    let bundle_path = app_bundle_path(&executable_path)
        .unwrap_or_else(|| executable_path.clone())
        .to_string_lossy()
        .to_string();
    let bundle_modified_at_ms = modified_at_ms(Path::new(&bundle_path));

    Ok(InstallFingerprint {
        bundle_identifier: app.config().identifier.clone(),
        bundle_path,
        executable_path: executable_path.to_string_lossy().to_string(),
        build_signature: build_info.build_signature.clone(),
        marketing_version: build_info.marketing_version,
        bundle_version: build_info.bundle_version,
        git_commit: build_info.git_commit,
        built_at_iso: build_info.built_at_iso,
        bundle_modified_at_ms,
    })
}

#[cfg(target_os = "macos")]
fn app_bundle_path(executable_path: &Path) -> Option<PathBuf> {
    executable_path.ancestors().find_map(|ancestor| {
        let has_app_extension = ancestor
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.eq_ignore_ascii_case("app"))
            .unwrap_or(false);
        if has_app_extension {
            Some(ancestor.to_path_buf())
        } else {
            None
        }
    })
}

#[cfg(target_os = "macos")]
fn should_reset_stale_accessibility(
    state: &AccessibilityRecoveryState,
    current: &InstallFingerprint,
) -> bool {
    let reset_not_attempted_for_build =
        state.last_tcc_reset_build_signature.as_deref() != Some(current.build_signature.as_str());
    let install_changed = state
        .last_install_fingerprint
        .as_ref()
        .map(|previous| fingerprint_changed(previous, current))
        .unwrap_or(false);

    reset_not_attempted_for_build && (state.has_seen_accessibility_trusted || install_changed)
}

#[cfg(target_os = "macos")]
fn fingerprint_changed(previous: &InstallFingerprint, current: &InstallFingerprint) -> bool {
    previous.build_signature != current.build_signature
        || previous.bundle_path != current.bundle_path
        || previous.bundle_modified_at_ms != current.bundle_modified_at_ms
}

fn repair_state_label(trusted: bool, did_reset: bool, install_changed: bool) -> String {
    if trusted && did_reset {
        return "trusted_after_reset".to_string();
    }
    if trusted {
        return "trusted".to_string();
    }
    if did_reset {
        return "prompted_after_reset".to_string();
    }
    if install_changed {
        return "prompted_after_install_change".to_string();
    }
    "prompted".to_string()
}

fn read_recovery_state(app: &AppHandle) -> Result<AccessibilityRecoveryState, String> {
    let path = recovery_state_path(app)?;
    if !path.exists() {
        return Ok(AccessibilityRecoveryState {
            version: 1,
            ..AccessibilityRecoveryState::default()
        });
    }

    let payload = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read accessibility recovery state: {}", error))?;
    serde_json::from_str(&payload).map_err(|error| {
        format!(
            "Failed to parse accessibility recovery state at {}: {}",
            path.to_string_lossy(),
            error
        )
    })
}

fn write_recovery_state(app: &AppHandle, state: &AccessibilityRecoveryState) -> Result<(), String> {
    let path = recovery_state_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "Failed to create accessibility recovery directory {}: {}",
                parent.to_string_lossy(),
                error
            )
        })?;
    }

    let payload = serde_json::to_string_pretty(state).map_err(|error| {
        format!(
            "Failed to serialize accessibility recovery state: {}",
            error
        )
    })?;
    fs::write(&path, payload)
        .map_err(|error| format!("Failed to write accessibility recovery state: {}", error))
}

fn recovery_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join(ACCESSIBILITY_RECOVERY_FILE))
        .map_err(|error| format!("Failed to resolve app data directory: {}", error))
}

fn modified_at_ms(path: &Path) -> Option<u128> {
    path.metadata()
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|timestamp| timestamp.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::{
        fingerprint_changed, repair_state_label, should_reset_stale_accessibility,
        AccessibilityRecoveryState, InstallFingerprint,
    };

    fn sample_fingerprint(build_signature: &str) -> InstallFingerprint {
        InstallFingerprint {
            bundle_identifier: "com.speakpaste.app".to_string(),
            bundle_path: "/Applications/SpeakPaste.app".to_string(),
            executable_path: "/Applications/SpeakPaste.app/Contents/MacOS/speakpaste".to_string(),
            build_signature: build_signature.to_string(),
            marketing_version: "0.1.1".to_string(),
            bundle_version: "20260603.210000".to_string(),
            git_commit: "abc123".to_string(),
            built_at_iso: "2026-06-03T15:30:00.000Z".to_string(),
            bundle_modified_at_ms: Some(123),
        }
    }

    #[test]
    fn detects_install_fingerprint_changes() {
        let previous = sample_fingerprint("0.1.1+20260603.210000.abc123");
        let current = sample_fingerprint("0.1.1+20260603.220000.def456");
        assert!(fingerprint_changed(&previous, &current));
    }

    #[test]
    fn only_resets_after_previous_trust_once_per_build() {
        let state = AccessibilityRecoveryState {
            version: 1,
            has_seen_accessibility_trusted: true,
            last_tcc_reset_build_signature: None,
            last_install_fingerprint: None,
            updated_at_ms: 0,
        };
        let current = sample_fingerprint("0.1.1+20260603.220000.def456");
        assert!(should_reset_stale_accessibility(&state, &current));

        let state = AccessibilityRecoveryState {
            last_tcc_reset_build_signature: Some(current.build_signature.clone()),
            ..state
        };
        assert!(!should_reset_stale_accessibility(&state, &current));
    }

    #[test]
    fn labels_repair_states_for_ui() {
        assert_eq!(
            repair_state_label(false, true, true),
            "prompted_after_reset".to_string()
        );
        assert_eq!(
            repair_state_label(false, false, true),
            "prompted_after_install_change".to_string()
        );
        assert_eq!(
            repair_state_label(true, false, false),
            "trusted".to_string()
        );
    }
}
