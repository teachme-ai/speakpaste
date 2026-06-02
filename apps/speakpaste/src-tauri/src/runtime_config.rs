use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const RUNTIME_CONFIG_FILE: &str = "runtime-config.json";

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeTextRule {
    pub order: u32,
    pub find_text: String,
    pub replace_text: String,
    pub use_regex: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeShortcuts {
    pub toggle_manual_recording: Option<String>,
    pub start_manual_recording: Option<String>,
    pub stop_manual_recording: Option<String>,
    pub cancel_manual_recording: Option<String>,
    pub push_to_talk: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeConfig {
    pub version: u32,
    pub recording_method: String,
    pub recording_device_id: Option<String>,
    pub recording_sample_rate: Option<u32>,
    pub recording_output_folder: Option<String>,
    pub transcription_engine: String,
    pub whisper_model_path: Option<String>,
    pub parakeet_model_path: Option<String>,
    pub moonshine_model_path: Option<String>,
    pub auto_paste_enabled: bool,
    pub selected_text_rule_id: Option<String>,
    pub text_rules: Vec<RuntimeTextRule>,
    pub shortcuts: RuntimeShortcuts,
    pub updated_at_ms: u128,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeConfigWriteResult {
    pub path: String,
    pub config: RuntimeConfig,
}

#[tauri::command]
pub async fn write_runtime_config(
    app: AppHandle,
    config: RuntimeConfig,
) -> Result<RuntimeConfigWriteResult, String> {
    let path = runtime_config_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create runtime config directory: {}", e))?;
    }

    let payload = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize runtime config: {}", e))?;
    fs::write(&path, payload).map_err(|e| format!("Failed to write runtime config: {}", e))?;

    Ok(RuntimeConfigWriteResult {
        path: path.to_string_lossy().to_string(),
        config,
    })
}

#[tauri::command]
pub async fn read_runtime_config(app: AppHandle) -> Result<Option<RuntimeConfig>, String> {
    let path = runtime_config_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }

    let payload =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read runtime config: {}", e))?;
    serde_json::from_str(&payload).map(Some).map_err(|e| {
        format!(
            "Failed to parse runtime config at {}: {}",
            path.to_string_lossy(),
            e
        )
    })
}

fn runtime_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join(RUNTIME_CONFIG_FILE))
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))
}
