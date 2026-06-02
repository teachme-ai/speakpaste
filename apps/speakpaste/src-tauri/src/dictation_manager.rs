use crate::dictation_runtime::DictationRuntime;
use crate::recorder::commands::AppData;
use crate::runtime_config::read_runtime_config_from_disk;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

const AUDIO_READY_EVENT: &str = "dictation:audio-ready";

#[derive(Debug)]
enum NativeDictationState {
    Idle,
    Recording { recording_id: String },
}

pub struct DictationManager {
    state: Mutex<NativeDictationState>,
}

impl DictationManager {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(NativeDictationState::Idle),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioReadyPayload {
    pub recording_id: String,
    pub file_path: String,
    pub sample_rate: u32,
    pub channels: u16,
    pub duration_seconds: f32,
}

#[tauri::command]
pub async fn start_native_dictation(app: AppHandle) -> Result<(), String> {
    start_native_dictation_for_app(&app)
}

#[tauri::command]
pub async fn stop_native_dictation(app: AppHandle) -> Result<Option<AudioReadyPayload>, String> {
    stop_native_dictation_for_app(&app)
}

#[tauri::command]
pub async fn toggle_native_dictation(app: AppHandle) -> Result<(), String> {
    let manager = app.state::<DictationManager>();
    let is_recording = matches!(
        *manager
            .state
            .lock()
            .map_err(|e| format!("Failed to lock dictation manager: {}", e))?,
        NativeDictationState::Recording { .. }
    );
    drop(manager);

    if is_recording {
        let _ = stop_native_dictation_for_app(&app)?;
    } else {
        start_native_dictation_for_app(&app)?;
    }

    Ok(())
}

pub fn start_native_dictation_for_app(app: &AppHandle) -> Result<(), String> {
    let manager = app.state::<DictationManager>();
    let mut state = manager
        .state
        .lock()
        .map_err(|e| format!("Failed to lock dictation manager: {}", e))?;

    if matches!(*state, NativeDictationState::Recording { .. }) {
        return Ok(());
    }

    let config = read_runtime_config_from_disk(app)?.ok_or_else(|| {
        "Runtime config is missing. Open SpeakPaste once before using background dictation."
            .to_string()
    })?;

    let recording_id = format!("native-{}", now_ms());
    let output_folder = match config.recording_output_folder {
        Some(path) if !path.trim().is_empty() => PathBuf::from(path),
        _ => app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to resolve app data directory: {}", e))?
            .join("recordings"),
    };
    let device_id = config
        .recording_device_id
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "default".to_string());

    {
        let app_data = app.state::<AppData>();
        let mut recorder = app_data
            .recorder
            .lock()
            .map_err(|e| format!("Failed to lock recorder: {}", e))?;
        recorder.init_session(
            device_id,
            output_folder,
            recording_id.clone(),
            config.recording_sample_rate,
        )?;
        recorder.start_recording()?;
    }

    *state = NativeDictationState::Recording {
        recording_id: recording_id.clone(),
    };
    emit_runtime_state(app, "Recording", Some("Listening from background runtime"))?;
    Ok(())
}

pub fn stop_native_dictation_for_app(app: &AppHandle) -> Result<Option<AudioReadyPayload>, String> {
    let manager = app.state::<DictationManager>();
    let recording_id = {
        let mut state = manager
            .state
            .lock()
            .map_err(|e| format!("Failed to lock dictation manager: {}", e))?;

        match std::mem::replace(&mut *state, NativeDictationState::Idle) {
            NativeDictationState::Idle => return Ok(None),
            NativeDictationState::Recording { recording_id } => recording_id,
        }
    };

    emit_runtime_state(app, "Transcribing", Some("Finalizing background recording"))?;

    let audio = {
        let app_data = app.state::<AppData>();
        let mut recorder = app_data
            .recorder
            .lock()
            .map_err(|e| format!("Failed to lock recorder: {}", e))?;
        let audio = recorder.stop_recording()?;
        recorder.close_session()?;
        audio
    };

    let file_path = audio
        .file_path
        .ok_or_else(|| "Native recording did not produce a WAV file path".to_string())?;

    let payload = AudioReadyPayload {
        recording_id,
        file_path,
        sample_rate: audio.sample_rate,
        channels: audio.channels,
        duration_seconds: audio.duration_seconds,
    };

    let _ = app.emit(AUDIO_READY_EVENT, payload.clone());
    Ok(Some(payload))
}

fn emit_runtime_state(app: &AppHandle, status: &str, message: Option<&str>) -> Result<(), String> {
    let runtime = app.state::<DictationRuntime>();
    runtime.transition(
        app,
        status.to_string(),
        message.map(|value| value.to_string()),
    )?;
    Ok(())
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
