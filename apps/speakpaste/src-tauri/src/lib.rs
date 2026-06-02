use log::{info, warn};
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

pub mod recorder;
use recorder::commands::{
    cancel_recording, close_recording_session, enumerate_recording_devices,
    get_current_recording_id, init_recording_session, start_recording, stop_recording, AppData,
};

pub mod transcription;
use transcription::{
    transcribe_audio_moonshine, transcribe_audio_parakeet, transcribe_audio_whisper, ModelManager,
};

pub mod windows_path;
use windows_path::fix_windows_path;

pub mod graceful_shutdown;
use graceful_shutdown::send_sigint;

pub mod command;
use command::{execute_command, spawn_command, download_model_file};

pub mod markdown;
use markdown::{count_markdown_files, delete_files_in_directory, read_markdown_files, write_markdown_files};

pub mod fn_key_listener;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tokio::main]
pub async fn run() {
    // Set up panic hook to capture crash information before the app exits.
    // The previous hook is preserved so default panic reporting still occurs.
    let previous_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        use std::backtrace::Backtrace;
        let payload = panic_info.payload();
        let location = panic_info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());
        let thread_name = std::thread::current()
            .name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "unnamed thread".to_string());

        let message = if let Some(s) = payload.downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = payload.downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic payload".to_string()
        };

        let backtrace = Backtrace::force_capture();

        eprintln!(
            "[panic] thread={} location={} message={}",
            thread_name, location, message
        );
        eprintln!("{}", backtrace);

        // Write crash log to temp directory (works on all platforms)
        {
            use std::fs::OpenOptions;
            use std::io::Write;
            let crash_log_path = std::env::temp_dir().join("speakpaste-crash.log");
            if let Ok(mut file) = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&crash_log_path)
            {
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                let _ = writeln!(
                    file,
                    "[{}] thread={} location={} message={}",
                    timestamp, thread_name, location, message
                );
                let _ = writeln!(file, "{}", backtrace);
                let _ = writeln!(file, "-----");
            }
        }

        previous_hook(panic_info);
    }));

    // Fix PATH environment for GUI applications on macOS and Linux
    // This ensures commands like ffmpeg installed via Homebrew are accessible
    let _ = fix_path_env::fix();

    // Fix Windows PATH inheritance bug
    // This ensures child processes can find ffmpeg on Windows
    fix_windows_path();

    let log_plugin = tauri_plugin_log::Builder::new()
        .level(log::LevelFilter::Info)
        .level_for("speakpaste::transcription", log::LevelFilter::Info)
        .target(Target::new(TargetKind::Stdout))
        .target(Target::new(TargetKind::LogDir {
            file_name: Some("speakpaste".to_string()),
        }))
        .build();

    let mut builder = tauri::Builder::default()
        .plugin(log_plugin)
        .plugin(tauri_plugin_macos_permissions::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(AppData::new())
        .manage(ModelManager::new())
        .setup(|app| {
            // Apply macOS vibrancy to main window
            #[cfg(target_os = "macos")]
            if let Some(main_window) = app.get_webview_window("main") {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                let _ = apply_vibrancy(&main_window, NSVisualEffectMaterial::HudWindow, None, None);
            }

            // Configure overlay window to float on top of full screen apps
            if let Some(overlay) = app.get_webview_window("overlay") {
                let _ = overlay.set_always_on_top(true);
                let _ = overlay.set_visible_on_all_workspaces(true);
            }
            Ok(())
        });

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ))
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                let _ = app
                    .get_webview_window("main")
                    .expect("no main window")
                    .set_focus();
            }));
    }

    // Register command handlers (same for all platforms now)
    let builder = builder.invoke_handler(tauri::generate_handler![
        write_text,
        simulate_enter_keystroke,
        // Audio recorder commands
        get_current_recording_id,
        enumerate_recording_devices,
        init_recording_session,
        close_recording_session,
        start_recording,
        stop_recording,
        cancel_recording,
        transcribe_audio_whisper,
        transcribe_audio_parakeet,
        transcribe_audio_moonshine,
        send_sigint,
        // Command execution (prevents console window flash on Windows)
        execute_command,
        spawn_command,
        download_model_file,
        fn_key_listener::initialize_fn_key_listener,
        // Filesystem utilities
        read_markdown_files,
        count_markdown_files,
        delete_files_in_directory,
        write_markdown_files,
        check_app_translocation,
        reset_tcc_permissions,
        open_mac_privacy_pane,
    ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_handler, _event| {});
}

use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use tauri_plugin_clipboard_manager::ClipboardExt;

/// Writes text at the cursor position using the clipboard sandwich technique.
///
/// Safe restore logic:
/// 1. Save original clipboard
/// 2. Write transcript to clipboard
/// 3. Simulate Cmd+V paste
/// 4. Wait for paste to complete
/// 5. Read clipboard again
/// 6. ONLY restore original if clipboard still contains the transcript we wrote
///    If the user copied something new in the meantime, skip restore to avoid hijacking.
///
/// Returns a status string:
///   "pasted_and_restored"  — paste succeeded, original clipboard restored
///   "pasted_clipboard_changed" — paste succeeded, user copied something new, restore skipped
///   "pasted_no_original"   — paste succeeded, no original to restore
///   "paste_failed"         — paste simulation failed, transcript left on clipboard
#[tauri::command]
async fn write_text(app: tauri::AppHandle, text: String) -> Result<String, String> {
    info!("[Paste] starting clipboard sandwich for {} chars", text.len());

    // 1. Save current clipboard content before we touch it
    let original_clipboard = app.clipboard().read_text().ok();
    info!("[Paste] original clipboard saved ({} chars)",
        original_clipboard.as_deref().map(|s| s.len()).unwrap_or(0));

    // 2. Write transcript to clipboard
    app.clipboard()
        .write_text(&text)
        .map_err(|e| format!("Failed to write to clipboard: {}", e))?;

    // Wait for clipboard write to propagate
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // 3. Simulate paste (Cmd+V on macOS)
    let paste_result = {
        let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

        #[cfg(target_os = "macos")]
        let (modifier, v_key) = (Key::Meta, Key::Other(9));
        #[cfg(target_os = "windows")]
        let (modifier, v_key) = (Key::Control, Key::Other(0x56));
        #[cfg(target_os = "linux")]
        let (modifier, v_key) = (Key::Control, Key::Unicode('v'));

        let r1 = enigo.key(modifier, Direction::Press);
        let r2 = enigo.key(v_key, Direction::Press);
        let r3 = enigo.key(v_key, Direction::Release);
        let r4 = enigo.key(modifier, Direction::Release);

        r1.and(r2).and(r3).and(r4)
    };

    if let Err(e) = paste_result {
        // Paste simulation failed — leave transcript on clipboard, do not restore
        warn!("[Paste] paste simulation failed: {} — transcript left on clipboard", e);
        return Ok("paste_failed".to_string());
    }

    // 4. Wait for paste to complete before checking clipboard
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    info!("[Paste] paste simulation complete");

    // 5. Safe restore: only restore if clipboard still contains what we wrote
    match original_clipboard {
        None => {
            // No original to restore — leave transcript on clipboard
            info!("[Paste] no original clipboard to restore");
            Ok("pasted_no_original".to_string())
        }
        Some(original) => {
            // Read current clipboard to check if user copied something new
            let current = app.clipboard().read_text().ok();
            let current_text = current.as_deref().unwrap_or("");

            if current_text == text {
                // Clipboard still has our transcript — safe to restore
                app.clipboard()
                    .write_text(&original)
                    .map_err(|e| format!("Failed to restore clipboard: {}", e))?;
                info!("[Paste] original clipboard restored");
                Ok("pasted_and_restored".to_string())
            } else {
                // Clipboard changed — user copied something new, do not overwrite
                info!("[Paste] clipboard changed after paste — skipping restore to preserve user's copy");
                Ok("pasted_clipboard_changed".to_string())
            }
        }
    }
}

/// Simulates pressing the Enter/Return key
///
/// This is useful for automatically submitting text in chat applications
/// after transcription has been pasted.
#[tauri::command]
async fn simulate_enter_keystroke() -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    // Use Direction::Click for a combined press+release action
    enigo
        .key(Key::Return, Direction::Click)
        .map_err(|e| format!("Failed to simulate Enter key: {}", e))?;

    Ok(())
}

#[tauri::command]
fn check_app_translocation() -> bool {
    #[cfg(target_os = "macos")]
    {
        if let Ok(exe_path) = std::env::current_exe() {
            let path_str = exe_path.to_string_lossy();
            // App Translocation places apps in randomized read-only paths under /private/var/folders/...
            if path_str.contains("AppTranslocation") {
                return true;
            }
        }
    }
    false
}

#[tauri::command]
async fn reset_tcc_permissions() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        info!("[Permissions] Purging old signatures from TCC database using tccutil");
        let _ = std::process::Command::new("tccutil")
            .args(["reset", "Accessibility", "com.speakpaste.app"])
            .status();
    }
    Ok(true)
}

#[tauri::command]
async fn open_mac_privacy_pane(pane: String) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let url = format!("x-apple.systemsettings:com.apple.preference.security?{}", pane);
        let _ = std::process::Command::new("open")
            .arg(&url)
            .spawn();
    }
    Ok(true)
}
