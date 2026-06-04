use serde::Serialize;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};

const DICTATION_STATE_CHANGED_EVENT: &str = "dictation:state-changed";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationRuntimeSnapshot {
    pub status: String,
    pub message: Option<String>,
    pub updated_at_ms: u128,
}

pub struct DictationRuntime {
    state: Mutex<DictationRuntimeSnapshot>,
}

impl DictationRuntime {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(DictationRuntimeSnapshot {
                status: "Idle".to_string(),
                message: None,
                updated_at_ms: now_ms(),
            }),
        }
    }

    pub(crate) fn snapshot(&self) -> Result<DictationRuntimeSnapshot, String> {
        self.state
            .lock()
            .map(|state| state.clone())
            .map_err(|e| format!("Failed to lock dictation runtime: {}", e))
    }

    pub(crate) fn transition(
        &self,
        app: &AppHandle,
        status: String,
        message: Option<String>,
    ) -> Result<DictationRuntimeSnapshot, String> {
        validate_status(&status)?;

        let snapshot = DictationRuntimeSnapshot {
            status,
            message,
            updated_at_ms: now_ms(),
        };

        {
            let mut state = self
                .state
                .lock()
                .map_err(|e| format!("Failed to lock dictation runtime: {}", e))?;
            *state = snapshot.clone();
        }

        let _ = app.emit(DICTATION_STATE_CHANGED_EVENT, snapshot.clone());
        Ok(snapshot)
    }
}

#[tauri::command]
pub async fn get_dictation_runtime_state(
    runtime: State<'_, DictationRuntime>,
) -> Result<DictationRuntimeSnapshot, String> {
    runtime.snapshot()
}

#[tauri::command]
pub async fn set_dictation_runtime_state(
    app: AppHandle,
    runtime: State<'_, DictationRuntime>,
    status: String,
    message: Option<String>,
) -> Result<DictationRuntimeSnapshot, String> {
    runtime.transition(&app, status, message)
}

fn validate_status(status: &str) -> Result<(), String> {
    match status {
        "Idle" | "Recording" | "Transcribing" | "Pasting" | "Cooldown" | "Error" => Ok(()),
        other => Err(format!("Unsupported dictation runtime status: {}", other)),
    }
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
