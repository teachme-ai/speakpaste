use log::{error, info, warn};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationStatePayload {
    pub status: String,
    pub text: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub enum DictationCommand {
    Start,
    Stop,
    Cancel,
}

pub struct DictationStateMachine {
    pub cmd_tx: mpsc::UnboundedSender<DictationCommand>,
}

impl DictationStateMachine {
    pub fn new(app_handle: AppHandle) -> Self {
        let (cmd_tx, mut cmd_rx) = mpsc::unbounded_channel::<DictationCommand>();
        let app = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            let mut current_status = "Idle".to_string();
            let mut active_task: Option<tauri::async_runtime::JoinHandle<Result<String, String>>> =
                None;
            let mut active_cancel: Option<CancellationToken> = None;
            loop {
                if let Some(mut task) = active_task.take() {
                    tokio::select! {
                        command = cmd_rx.recv() => match command {
                            Some(DictationCommand::Cancel) => {
                                if let Some(token) = active_cancel.take() { token.cancel(); }
                                task.abort();
                                current_status = "Idle".to_string();
                                emit_state(&app, "Idle", None, None);
                            }
                            Some(_) => { active_task = Some(task); }
                            None => { task.abort(); break; }
                        },
                        result = &mut task => {
                            active_cancel = None;
                            match result {
                                Ok(Ok(text)) if current_status == "Processing" => {
                                    current_status = "Completed".to_string();
                                    emit_state(&app, "Completed", Some(text), None);
                                }
                                Ok(Err(message)) if message != CANCELLED => {
                                    error!("[DictationStateMachine] Pipeline error: {}", message);
                                    current_status = "Error".to_string();
                                    emit_state(&app, "Error", None, Some(message));
                                }
                                Err(join_error) => {
                                    current_status = "Error".to_string();
                                    emit_state(&app, "Error", None, Some(join_error.to_string()));
                                }
                                _ => {}
                            }
                        }
                    }
                    continue;
                }

                let Some(command) = cmd_rx.recv().await else {
                    break;
                };
                match command {
                    DictationCommand::Start => {
                        if !matches!(current_status.as_str(), "Idle" | "Completed" | "Error") {
                            continue;
                        }
                        match crate::dictation_manager::start_native_dictation_for_app(&app) {
                            Ok(()) => {
                                let recording = app
                                    .state::<crate::dictation_runtime::DictationRuntime>()
                                    .snapshot()
                                    .map(|s| s.status == "Recording")
                                    .unwrap_or(false);
                                if recording {
                                    current_status = "Recording".to_string();
                                    emit_state(&app, "Recording", None, None);
                                }
                            }
                            Err(message) => {
                                current_status = "Error".to_string();
                                emit_state(&app, "Error", None, Some(message));
                            }
                        }
                    }
                    DictationCommand::Stop if current_status == "Recording" => {
                        match crate::dictation_manager::stop_native_dictation_for_app(&app) {
                            Ok(Some(audio)) => {
                                current_status = "Processing".to_string();
                                emit_state(&app, "Processing", None, None);
                                let token = CancellationToken::new();
                                active_cancel = Some(token.clone());
                                active_task = Some(tauri::async_runtime::spawn(run_pipeline(
                                    app.clone(),
                                    audio,
                                    token,
                                )));
                            }
                            Ok(None) => {
                                current_status = "Idle".to_string();
                                emit_state(&app, "Idle", None, None);
                            }
                            Err(message) => {
                                current_status = "Error".to_string();
                                emit_state(&app, "Error", None, Some(message));
                            }
                        }
                    }
                    DictationCommand::Cancel => {
                        if current_status == "Recording" || current_status == "Processing" {
                            if let Some(token) = active_cancel.take() {
                                token.cancel();
                            }
                            if let Some(task) = active_task.take() {
                                task.abort();
                            }
                            let _ = crate::dictation_manager::cancel_native_dictation_for_app(&app);
                            current_status = "Idle".to_string();
                            emit_state(&app, "Idle", None, None);
                        }
                    }
                    DictationCommand::Stop => {}
                }
            }
        });
        Self { cmd_tx }
    }
}

const CANCELLED: &str = "__dictation_cancelled__";

fn emit_state(app: &AppHandle, status: &str, text: Option<String>, error: Option<String>) {
    let _ = app.emit(
        "mynah://dictation_state",
        DictationStatePayload {
            status: status.to_string(),
            text,
            error,
        },
    );
}

async fn run_pipeline(
    app: AppHandle,
    audio: crate::dictation_manager::AudioReadyPayload,
    cancel: CancellationToken,
) -> Result<String, String> {
    if cancel.is_cancelled() {
        return Err(CANCELLED.to_string());
    }
    info!(
        "[DictationStateMachine] Starting transcription for file: {}",
        audio.file_path
    );
    let config = match crate::runtime_config::read_runtime_config_from_disk(&app) {
        Ok(Some(config)) => config,
        Ok(None) => return Err("Config missing".to_string()),
        Err(error) => return Err(format!("Failed to read runtime config: {}", error)),
    };
    if cancel.is_cancelled() {
        return Err(CANCELLED.to_string());
    }
    let audio_bytes =
        std::fs::read(&audio.file_path).map_err(|e| format!("Failed to read audio file: {}", e))?;
    let model_manager = app.state::<crate::transcription::ModelManager>();
    let app_data_models = app.path().app_data_dir().ok().map(|d| d.join("models"));
    let text = match config.transcription_engine.as_str() {
        "parakeet" => {
            let path = config
                .parakeet_model_path
                .filter(|p| !p.trim().is_empty() && std::path::Path::new(p).exists())
                .or_else(|| {
                    app_data_models.as_ref().and_then(|models| {
                        let candidate = models.join("parakeet").join("parakeet-tdt-0.6b-v3-int8");
                        if candidate.exists() {
                            Some(candidate.to_string_lossy().to_string())
                        } else {
                            None
                        }
                    })
                })
                .ok_or_else(|| "Parakeet model path not configured".to_string())?;
            crate::transcription::transcribe_audio_parakeet_internal(
                audio_bytes,
                path,
                &model_manager,
            )
            .await
            .map_err(|e| format!("Transcription error: {:?}", e))?
        }
        "whisper" | "whispercpp" => {
            let path = config
                .whisper_model_path
                .filter(|p| !p.trim().is_empty() && std::path::Path::new(p).exists())
                .or_else(|| {
                    app_data_models.as_ref().and_then(|models| {
                        let candidate_small = models.join("whisper").join("ggml-small.bin");
                        let candidate_base = models.join("whisper").join("ggml-base.en.bin");
                        if candidate_small.exists() {
                            Some(candidate_small.to_string_lossy().to_string())
                        } else if candidate_base.exists() {
                            Some(candidate_base.to_string_lossy().to_string())
                        } else {
                            None
                        }
                    })
                })
                .ok_or_else(|| "Whisper model path not configured".to_string())?;
            let language = config
                .transcription_language
                .filter(|l| l != "auto" && !l.trim().is_empty());
            let translate = config.transcription_translate.unwrap_or(false);
            let prompt = crate::transcription::indic::get_initial_prompt(language.as_deref());
            crate::transcription::transcribe_audio_whisper_internal(
                audio_bytes,
                path,
                language,
                prompt,
                translate,
                &model_manager,
            )
            .await
            .map_err(|e| format!("Transcription error: {:?}", e))?
        }
        engine => return Err(format!("Unsupported transcription engine: {}", engine)),
    };
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err("Transcription returned empty text".to_string());
    }

    // Write companion .md file so the UI recent captures list can find and display it
    let md_path = std::path::Path::new(&audio.file_path).with_extension("md");
    let now_iso = chrono::Utc::now().to_rfc3339();
    let md_content = format!(
        "---\nid: {}\ntitle: ''\nrecordedAt: '{}'\nupdatedAt: '{}'\ntranscriptionStatus: DONE\n---\n{}\n",
        audio.recording_id, now_iso, now_iso, text
    );
    if let Err(e) = std::fs::write(&md_path, md_content) {
        warn!("[DictationStateMachine] Failed to write companion md file: {}", e);
    } else {
        info!("[DictationStateMachine] Wrote companion md file: {:?}", md_path);
    }

    if cancel.is_cancelled() {
        return Err(CANCELLED.to_string());
    }
    if !config.auto_paste_enabled {
        info!("[DictationStateMachine] auto-paste disabled; leaving transcript undelivered");
        return Ok(text);
    }
    let _ = app.emit(
        "mynah://dictation_state",
        DictationStatePayload {
            status: "Pasting".to_string(),
            text: Some(text.clone()),
            error: None,
        },
    );
    if cancel.is_cancelled() {
        return Err(CANCELLED.to_string());
    }
    crate::write_text_internal(&app, text.clone())
        .await
        .map_err(|e| format!("Paste failed: {}", e))?;
    Ok(text)
}

#[tauri::command]
pub async fn start_dictation(
    state_machine: State<'_, DictationStateMachine>,
) -> Result<(), String> {
    state_machine
        .cmd_tx
        .send(DictationCommand::Start)
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn stop_dictation(state_machine: State<'_, DictationStateMachine>) -> Result<(), String> {
    state_machine
        .cmd_tx
        .send(DictationCommand::Stop)
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn cancel_dictation(
    state_machine: State<'_, DictationStateMachine>,
) -> Result<(), String> {
    state_machine
        .cmd_tx
        .send(DictationCommand::Cancel)
        .map_err(|e| e.to_string())
}
