use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::mpsc;
use log::{info, error};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationStatePayload {
    pub status: String, // "Idle" | "Recording" | "Processing" | "Pasting" | "Completed" | "Error"
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
            
            while let Some(cmd) = cmd_rx.recv().await {
                match cmd {
                    DictationCommand::Start => {
                        if current_status == "Idle" || current_status == "Completed" || current_status == "Error" {
                            current_status = "Recording".to_string();
                            let _ = app.emit("mynah://dictation_state", DictationStatePayload {
                                status: current_status.clone(),
                                text: None,
                                error: None,
                            });
                            
                            // Let's use dictation_manager's function directly for recording since it handles AppData and Recorder
                            if let Err(e) = crate::dictation_manager::start_native_dictation_for_app(&app) {
                                current_status = "Error".to_string();
                                let _ = app.emit("mynah://dictation_state", DictationStatePayload {
                                    status: current_status.clone(),
                                    text: None,
                                    error: Some(e),
                                });
                            }
                        }
                    }
                    DictationCommand::Stop => {
                        if current_status == "Recording" {
                            current_status = "Processing".to_string();
                            let _ = app.emit("mynah://dictation_state", DictationStatePayload {
                                status: current_status.clone(),
                                text: None,
                                error: None,
                            });
                            
                            match crate::dictation_manager::stop_native_dictation_for_app(&app) {
                                Ok(Some(audio)) => {
                                    let app_clone = app.clone();
                                    
                                    // Run the transcription and pasting asynchronously without blocking the loop
                                    let result = async move {
                                        info!("[DictationStateMachine] Starting transcription for file: {}", audio.file_path);
                                        
                                        // 1. Read config
                                        let config = match crate::runtime_config::read_runtime_config_from_disk(&app_clone) {
                                            Ok(Some(c)) => c,
                                            Ok(None) => return Err("Config missing".to_string()),
                                            Err(e) => return Err(format!("Failed to read runtime config: {}", e)),
                                        };
                                        
                                        // 2. Read Audio file
                                        let audio_bytes = std::fs::read(&audio.file_path)
                                            .map_err(|e| format!("Failed to read audio file: {}", e))?;
                                        
                                        // 3. Transcribe
                                        let model_manager = app_clone.state::<crate::transcription::ModelManager>();
                                        let engine = config.transcription_engine.as_str();
                                        let transcribed_text = if engine == "parakeet" {
                                            if let Some(path) = config.parakeet_model_path {
                                                info!("[DictationStateMachine] Using Parakeet model path: {:?}", path);
                                                crate::transcription::transcribe_audio_parakeet_internal(audio_bytes, path, &model_manager).await
                                                    .map_err(|e| format!("Transcription error: {:?}", e))?
                                            } else {
                                                return Err("Parakeet model path not configured".to_string());
                                            }
                                        } else if engine == "whisper" || engine == "whispercpp" {
                                            if let Some(path) = config.whisper_model_path {
                                                let language = config.transcription_language.filter(|l| l != "auto" && !l.trim().is_empty());
                                                let translate = config.transcription_translate.unwrap_or(false);
                                                let initial_prompt = crate::transcription::indic::get_initial_prompt(language.as_deref());
                                                info!(
                                                    "[DictationStateMachine] Using Whisper model path: {:?}, language: {:?}, translate: {}, prompt: {:?}",
                                                    path, language, translate, initial_prompt
                                                );
                                                crate::transcription::transcribe_audio_whisper_internal(
                                                    audio_bytes,
                                                    path,
                                                    language,
                                                    initial_prompt,
                                                    translate,
                                                    &model_manager,
                                                ).await
                                                    .map_err(|e| format!("Transcription error: {:?}", e))?
                                            } else {
                                                return Err("Whisper model path not configured".to_string());
                                            }
                                        } else {
                                            return Err(format!("Unsupported transcription engine: {}", engine));
                                        };
                                        
                                        // Filter filler words if needed (for simplicity, we paste the raw text)
                                        let text = transcribed_text.trim().to_string();
                                        if text.is_empty() {
                                            return Err("Transcription returned empty text".to_string());
                                        }

                                        info!("[DictationStateMachine] Transcription successful, pasting {} chars...", text.len());

                                        // 4. Update status to Pasting
                                        let _ = app_clone.emit("mynah://dictation_state", DictationStatePayload {
                                            status: "Pasting".to_string(),
                                            text: Some(text.clone()),
                                            error: None,
                                        });

                                        // 5. Write via Keyboard / Clipboard sandwich
                                        let paste_result = crate::write_text_internal(&app_clone, text.clone()).await;
                                        if let Err(e) = paste_result {
                                            return Err(format!("Paste failed: {}", e));
                                        }

                                        Ok::<String, String>(text)
                                    }.await;

                                    match result {
                                        Ok(text) => {
                                            info!("[DictationStateMachine] Pipeline completed successfully.");
                                            current_status = "Completed".to_string();
                                            let _ = app.emit("mynah://dictation_state", DictationStatePayload {
                                                status: current_status.clone(),
                                                text: Some(text),
                                                error: None,
                                            });
                                        }
                                        Err(e) => {
                                            error!("[DictationStateMachine] Pipeline error: {}", e);
                                            current_status = "Error".to_string();
                                            let _ = app.emit("mynah://dictation_state", DictationStatePayload {
                                                status: current_status.clone(),
                                                text: None,
                                                error: Some(e),
                                            });
                                        }
                                    }
                                }
                                Ok(None) => {
                                    current_status = "Idle".to_string();
                                    let _ = app.emit("mynah://dictation_state", DictationStatePayload {
                                        status: current_status.clone(),
                                        text: None,
                                        error: None,
                                    });
                                }
                                Err(e) => {
                                    current_status = "Error".to_string();
                                    let _ = app.emit("mynah://dictation_state", DictationStatePayload {
                                        status: current_status.clone(),
                                        text: None,
                                        error: Some(e),
                                    });
                                }
                            }
                        }
                    }
                    DictationCommand::Cancel => {
                        if current_status == "Recording" || current_status == "Processing" {
                            let _ = crate::dictation_manager::cancel_native_dictation_for_app(&app);
                            current_status = "Idle".to_string();
                            let _ = app.emit("mynah://dictation_state", DictationStatePayload {
                                status: current_status.clone(),
                                text: None,
                                error: None,
                            });
                        }
                    }
                }
            }
        });
        
        Self { cmd_tx }
    }
}

#[tauri::command]
pub async fn start_dictation(state_machine: State<'_, DictationStateMachine>) -> Result<(), String> {
    state_machine.cmd_tx.send(DictationCommand::Start).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_dictation(state_machine: State<'_, DictationStateMachine>) -> Result<(), String> {
    state_machine.cmd_tx.send(DictationCommand::Stop).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cancel_dictation(state_machine: State<'_, DictationStateMachine>) -> Result<(), String> {
    state_machine.cmd_tx.send(DictationCommand::Cancel).map_err(|e| e.to_string())
}
