use serde_json::{json, Value};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::sync::{LazyLock, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

static LOCAL_ANALYTICS_LOG_LOCK: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

fn analytics_dir_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?
        .join("diagnostics");

    fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create diagnostics directory: {}", e))?;

    Ok(dir)
}

fn analytics_log_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(analytics_dir_path(app)?.join("local-analytics.jsonl"))
}

#[tauri::command]
pub async fn log_local_analytics_event(app: tauri::AppHandle, event: Value) -> Result<(), String> {
    let _guard = LOCAL_ANALYTICS_LOG_LOCK
        .lock()
        .map_err(|_| "Local analytics log lock is poisoned".to_string())?;
    let path = analytics_log_path(&app)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| format!("Failed to open local analytics log: {}", e))?;

    let record = json!({
        "timestamp_ms": SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or(0),
        "event": event
    });

    writeln!(file, "{}", record)
        .map_err(|e| format!("Failed to append local analytics event: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_local_analytics_log_path(app: tauri::AppHandle) -> Result<String, String> {
    Ok(analytics_log_path(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_local_analytics_directory_path(app: tauri::AppHandle) -> Result<String, String> {
    Ok(analytics_dir_path(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn clear_local_analytics_log(app: tauri::AppHandle) -> Result<(), String> {
    let path = analytics_log_path(&app)?;
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("Failed to clear local analytics log: {}", e))?;
    }
    Ok(())
}
