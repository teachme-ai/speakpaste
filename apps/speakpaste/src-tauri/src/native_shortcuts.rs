use crate::dictation_manager::{
    start_native_dictation_for_app, stop_native_dictation_for_app, toggle_native_dictation_for_app,
};
use crate::runtime_config::read_runtime_config_from_disk;
use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const TOGGLE_MANUAL_RECORDING_ID: &str = "toggleManualRecording";
const PUSH_TO_TALK_ID: &str = "pushToTalk";

pub struct NativeShortcutManager {
    registered_shortcuts: Mutex<Vec<String>>,
}

impl NativeShortcutManager {
    pub fn new() -> Self {
        Self {
            registered_shortcuts: Mutex::new(Vec::new()),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeShortcutRegistration {
    pub command_id: String,
    pub accelerator: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeShortcutFailure {
    pub command_id: String,
    pub accelerator: String,
    pub reason: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeShortcutReloadResult {
    pub registered: Vec<NativeShortcutRegistration>,
    pub failed: Vec<NativeShortcutFailure>,
}

#[tauri::command]
pub async fn reload_native_global_shortcuts(
    app: AppHandle,
) -> Result<NativeShortcutReloadResult, String> {
    unregister_native_global_shortcuts_for_app(&app)?;

    let config = match read_runtime_config_from_disk(&app)? {
        Some(config) => config,
        None => {
            return Ok(NativeShortcutReloadResult {
                registered: Vec::new(),
                failed: vec![NativeShortcutFailure {
                    command_id: "runtimeConfig".to_string(),
                    accelerator: "".to_string(),
                    reason: "Runtime config is not available yet".to_string(),
                }],
            });
        }
    };

    let mut registered = Vec::new();
    let mut failed = Vec::new();

    if let Some(accelerator) = non_empty(config.shortcuts.toggle_manual_recording) {
        match register_toggle_shortcut(&app, &accelerator) {
            Ok(()) => registered.push(NativeShortcutRegistration {
                command_id: TOGGLE_MANUAL_RECORDING_ID.to_string(),
                accelerator: accelerator.clone(),
            }),
            Err(reason) => failed.push(NativeShortcutFailure {
                command_id: TOGGLE_MANUAL_RECORDING_ID.to_string(),
                accelerator: accelerator.clone(),
                reason,
            }),
        }
    }

    if let Some(accelerator) = non_empty(config.shortcuts.push_to_talk) {
        match register_push_to_talk_shortcut(&app, &accelerator) {
            Ok(()) => registered.push(NativeShortcutRegistration {
                command_id: PUSH_TO_TALK_ID.to_string(),
                accelerator: accelerator.clone(),
            }),
            Err(reason) => failed.push(NativeShortcutFailure {
                command_id: PUSH_TO_TALK_ID.to_string(),
                accelerator: accelerator.clone(),
                reason,
            }),
        }
    }

    {
        let manager = app.state::<NativeShortcutManager>();
        let mut shortcuts = manager
            .registered_shortcuts
            .lock()
            .map_err(|e| format!("Failed to lock native shortcut manager: {}", e))?;
        *shortcuts = registered
            .iter()
            .map(|registration| registration.accelerator.clone())
            .collect();
    }

    Ok(NativeShortcutReloadResult { registered, failed })
}

#[tauri::command]
pub async fn unregister_native_global_shortcuts(app: AppHandle) -> Result<(), String> {
    unregister_native_global_shortcuts_for_app(&app)
}

fn register_toggle_shortcut(app: &AppHandle, accelerator: &str) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(accelerator, |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Err(error) = toggle_native_dictation_for_app(app) {
                    log::warn!("[NativeShortcuts] toggle failed: {}", error);
                }
            }
        })
        .map_err(|e| format!("Failed to register native toggle shortcut: {}", e))
}

fn register_push_to_talk_shortcut(app: &AppHandle, accelerator: &str) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(accelerator, |app, _shortcut, event| match event.state {
            ShortcutState::Pressed => {
                if let Err(error) = start_native_dictation_for_app(app) {
                    log::warn!("[NativeShortcuts] push-to-talk start failed: {}", error);
                }
            }
            ShortcutState::Released => {
                if let Err(error) = stop_native_dictation_for_app(app) {
                    log::warn!("[NativeShortcuts] push-to-talk stop failed: {}", error);
                }
            }
        })
        .map_err(|e| format!("Failed to register native push-to-talk shortcut: {}", e))
}

fn unregister_native_global_shortcuts_for_app(app: &AppHandle) -> Result<(), String> {
    let shortcuts_to_unregister = {
        let manager = app.state::<NativeShortcutManager>();
        let mut shortcuts = manager
            .registered_shortcuts
            .lock()
            .map_err(|e| format!("Failed to lock native shortcut manager: {}", e))?;
        std::mem::take(&mut *shortcuts)
    };

    for shortcut in shortcuts_to_unregister {
        if let Err(error) = app.global_shortcut().unregister(shortcut.as_str()) {
            log::warn!(
                "[NativeShortcuts] failed to unregister native shortcut {}: {}",
                shortcut,
                error
            );
        }
    }

    Ok(())
}

fn non_empty(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}
