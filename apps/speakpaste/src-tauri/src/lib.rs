use log::{info, warn};
use tauri::menu::{Menu, MenuItem, WINDOW_SUBMENU_ID};
use tauri::{Manager, WindowEvent};
use tauri_plugin_log::{Target, TargetKind};

const SHOW_APPLICATION_WINDOW_MENU_ID: &str = "show_application_window";

fn show_application_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn install_application_menu(app: &tauri::App) -> tauri::Result<()> {
    let menu = Menu::default(app.handle())?;

    if let Some(window_menu_item) = menu.get(WINDOW_SUBMENU_ID) {
        if let Some(window_menu) = window_menu_item.as_submenu() {
            let show_window_item = MenuItem::with_id(
                app,
                SHOW_APPLICATION_WINDOW_MENU_ID,
                "Show Application Window",
                true,
                Some("CmdOrCtrl+Shift+0"),
            )?;
            window_menu.prepend(&show_window_item)?;
            window_menu.insert(&tauri::menu::PredefinedMenuItem::separator(app)?, 1)?;
        }
    }

    app.set_menu(menu)?;
    Ok(())
}

pub mod recorder;
use recorder::commands::{
    cancel_recording, close_recording_session, enumerate_recording_devices,
    get_current_recording_id, init_recording_session, start_recording, stop_recording, AppData,
};

pub mod transcription;
use transcription::{
    transcribe_audio_parakeet, transcribe_audio_whisper, ModelManager,
};

pub mod windows_path;
use windows_path::fix_windows_path;

pub mod graceful_shutdown;
use graceful_shutdown::send_sigint;

pub mod command;
use command::{download_model_file, execute_command, spawn_command};

pub mod local_analytics;
use local_analytics::{
    clear_local_analytics_log, get_local_analytics_directory_path, get_local_analytics_log_path,
    log_local_analytics_event,
};

pub mod build_info;
use build_info::{current_build_info, get_build_info};

pub mod accessibility_repair;
use accessibility_repair::{
    repair_accessibility_permissions_if_needed, reset_tcc_permissions_for_bundle,
};

pub mod markdown;
use markdown::{
    count_markdown_files, delete_files_in_directory, read_markdown_files, write_markdown_files,
};

pub mod fn_key_listener;

pub mod dictation_runtime;
use dictation_runtime::{
    get_dictation_runtime_state, set_dictation_runtime_state, DictationRuntime,
};

pub mod runtime_config;
use runtime_config::{read_runtime_config, write_runtime_config};

pub mod trial_license;
use trial_license::{get_trial_status, initialize_trial_if_needed};

pub mod dictation_manager;
use dictation_manager::{
    cancel_native_dictation, start_native_dictation, stop_native_dictation,
    sync_native_dictation_idle, toggle_native_dictation, DictationManager,
};

pub mod native_shortcuts;
use native_shortcuts::{
    reload_native_global_shortcuts, unregister_native_global_shortcuts, NativeShortcutManager,
};

pub mod fm_bridge;
use fm_bridge::{get_fm_capability, fm_clean_ramble, fm_list, fm_prompt};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let build_info = current_build_info();
    info!(
        "[Build] version={} bundle={} commit={} dirty={} signature={} target_arch={}",
        build_info.marketing_version,
        build_info.bundle_version,
        build_info.git_commit,
        build_info.git_dirty,
        build_info.build_signature,
        build_info.target_arch
    );
    let _ = *accessibility_repair::PROCESS_STARTED_AT_MS;

    // ── Multi-instance guard (macOS only) ──────────────────────────────────
    // Both the production app and a dev build register a CGEventTap for the
    // Fn key.  Running them simultaneously causes dictation output to be pasted
    // twice (once per process).  The dev runner script (`run-tauri-with-build-meta.mjs`)
    // already kills stray processes via `pkill -x mynah` before every launch,
    // but this runtime check acts as a belt-and-suspenders warning for edge
    // cases (e.g. the production app was opened after the dev build started).
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        match Command::new("pgrep").args(["-x", "mynah"]).output() {
            Ok(output) => {
                let matches: Vec<&str> = std::str::from_utf8(&output.stdout)
                    .unwrap_or("")
                    .lines()
                    .collect();
                // pgrep always includes the current process, so >1 match means
                // a sibling is running.
                if matches.len() > 1 {
                    warn!(
                        "[Instance] ⚠️  {} other Mynah process(es) detected (PIDs: {}).  \
                         Double-paste is likely.  Quit all other Mynah instances.",
                        matches.len() - 1,
                        matches
                            .iter()
                            .filter(|&&pid| pid.trim() != std::process::id().to_string())
                            .cloned()
                            .collect::<Vec<_>>()
                            .join(", ")
                    );
                }
            }
            Err(e) => {
                warn!("[Instance] Could not run pgrep: {}", e);
            }
        }
    }
    // ──────────────────────────────────────────────────────────────────────

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
            let crash_log_path = std::env::temp_dir().join("mynah-crash.log");
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
        .level_for("mynah::transcription", log::LevelFilter::Info)
        .target(Target::new(TargetKind::Stdout))
        .target(Target::new(TargetKind::LogDir {
            file_name: Some("mynah".to_string()),
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
        .plugin(tauri_plugin_opener::init())
        .on_menu_event(|app, event| {
            if event.id().as_ref() == SHOW_APPLICATION_WINDOW_MENU_ID {
                show_application_window(app);
            }
        })
        .manage(AppData::new())
        .manage(DictationRuntime::new())
        .manage(DictationManager::new())
        .manage(NativeShortcutManager::new())
        .manage(ModelManager::new())
        .setup(|app| {
            let build_info = current_build_info();
            let exe_path = std::env::current_exe()
                .map(|path| path.to_string_lossy().to_string())
                .unwrap_or_else(|error| format!("unavailable: {}", error));
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map(|path| path.to_string_lossy().to_string())
                .unwrap_or_else(|error| format!("unavailable: {}", error));
            info!(
                "[App] setup_started version={} bundle={} commit={} dirty={} signature={} target_arch={} identifier={} exe={} app_data_dir={}",
                build_info.marketing_version,
                build_info.bundle_version,
                build_info.git_commit,
                build_info.git_dirty,
                build_info.build_signature,
                build_info.target_arch,
                app.config().identifier,
                exe_path,
                app_data_dir,
            );
            install_application_menu(app)?;
            info!("[App] application_menu_installed");

            // Initialize trial keychain record if needed asynchronously
            tauri::async_runtime::spawn(async {
                if let Err(err) = initialize_trial_if_needed().await {
                    log::warn!("[App] failed_to_initialize_trial: {}", err);
                } else {
                    log::info!("[App] trial_license_initialized");
                }
            });

            // Apply macOS vibrancy to main window
            #[cfg(target_os = "macos")]
            if let Some(main_window) = app.get_webview_window("main") {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                match apply_vibrancy(&main_window, NSVisualEffectMaterial::Popover, None, None) {
                    Ok(_) => info!("[Window] main_vibrancy_applied"),
                    Err(error) => warn!("[Window] failed_to_apply_main_vibrancy: {}", error),
                }
            }

            // Configure overlay window to float on top of full screen apps
            if let Some(overlay) = app.get_webview_window("overlay") {
                match overlay.set_always_on_top(true) {
                    Ok(_) => info!("[Window] overlay_always_on_top_enabled"),
                    Err(error) => warn!("[Window] failed_to_enable_overlay_always_on_top: {}", error),
                }
                match overlay.set_visible_on_all_workspaces(true) {
                    Ok(_) => info!("[Window] overlay_all_workspaces_enabled"),
                    Err(error) => warn!(
                        "[Window] failed_to_enable_overlay_all_workspaces: {}",
                        error
                    ),
                }
                match overlay.set_focusable(false) {
                    Ok(_) => info!("[Window] overlay_focus_disabled"),
                    Err(error) => warn!("[Window] failed_to_disable_overlay_focus: {}", error),
                }
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
                show_application_window(app);
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
        send_sigint,
        // Command execution (prevents console window flash on Windows)
        execute_command,
        spawn_command,
        download_model_file,
        fn_key_listener::initialize_fn_key_listener,
        fn_key_listener::get_fn_key_listener_readiness,
        get_dictation_runtime_state,
        set_dictation_runtime_state,
        write_runtime_config,
        read_runtime_config,
        start_native_dictation,
        stop_native_dictation,
        cancel_native_dictation,
        sync_native_dictation_idle,
        toggle_native_dictation,
        reload_native_global_shortcuts,
        unregister_native_global_shortcuts,
        get_local_analytics_log_path,
        get_local_analytics_directory_path,
        clear_local_analytics_log,
        log_local_analytics_event,
        get_build_info,
        // Filesystem utilities
        read_markdown_files,
        count_markdown_files,
        delete_files_in_directory,
        write_markdown_files,
        check_app_translocation,
        repair_accessibility_permissions_if_needed,
        reset_tcc_permissions,
        open_mac_privacy_pane,
        get_trial_status,
        get_fm_capability,
        fm_clean_ramble,
        fm_list,
        fm_prompt,
    ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::WindowEvent { label, event, .. } = event {
            if label == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
            }
        }
    });
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
    info!(
        "[Paste] starting clipboard sandwich for {} chars",
        text.len()
    );

    // 1. Save current clipboard content before we touch it
    let original_clipboard = app.clipboard().read_text().ok();
    info!(
        "[Paste] original clipboard saved ({} chars)",
        original_clipboard.as_deref().map(|s| s.len()).unwrap_or(0)
    );

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
        tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;
        let r2 = enigo.key(v_key, Direction::Press);
        tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;
        let r3 = enigo.key(v_key, Direction::Release);
        tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;
        let r4 = enigo.key(modifier, Direction::Release);

        r1.and(r2).and(r3).and(r4)
    };

    if let Err(e) = paste_result {
        // Paste simulation failed — leave transcript on clipboard, do not restore
        warn!(
            "[Paste] paste simulation failed: {} — transcript left on clipboard",
            e
        );
        return Ok("paste_failed".to_string());
    }

    // 4. Wait for paste to complete before checking clipboard
    tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;

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
async fn reset_tcc_permissions(app: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let bundle_identifier = app.config().identifier.clone();
        info!(
            "[Permissions] Purging old signatures from TCC database using tccutil for {}",
            bundle_identifier
        );
        reset_tcc_permissions_for_bundle(&bundle_identifier)?;
    }
    Ok(true)
}

#[tauri::command]
async fn open_mac_privacy_pane(pane: String) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        info!("[Permissions] open_privacy_pane_requested pane={}", pane);
        match pane.as_str() {
            "Privacy_Accessibility" | "Privacy_Microphone" => {}
            _ => return Err(format!("Unsupported macOS privacy pane: {}", pane)),
        }

        let urls = [
            format!(
                "x-apple.systemsettings:com.apple.preference.security?{}",
                pane
            ),
            format!(
                "x-apple.systempreferences:com.apple.preference.security?{}",
                pane
            ),
            "x-apple.systemsettings:com.apple.SystemSettings.extension".to_string(),
        ];

        let mut opened = false;
        for url in urls {
            match std::process::Command::new("open").arg(&url).status() {
                Ok(status) if status.success() => {
                    info!(
                        "[Permissions] Opened macOS settings URL {} successfully",
                        url
                    );
                    opened = true;
                }
                Ok(status) => {
                    warn!(
                        "[Permissions] Failed to open macOS settings URL {}: status {:?}",
                        url,
                        status.code()
                    );
                }
                Err(error) => {
                    warn!(
                        "[Permissions] Failed to open macOS settings URL {}: {}",
                        url, error
                    );
                }
            }
        }

        for bundle_id in ["com.apple.systempreferences", "com.apple.SystemSettings"] {
            match std::process::Command::new("open")
                .args(["-b", bundle_id])
                .status()
            {
                Ok(status) if status.success() => {
                    info!(
                        "[Permissions] Opened System Settings by bundle id {} successfully",
                        bundle_id
                    );
                    opened = true;
                    break;
                }
                Ok(status) => {
                    warn!(
                        "[Permissions] Failed to open System Settings by bundle id {}: status {:?}",
                        bundle_id,
                        status.code()
                    );
                }
                Err(error) => {
                    warn!(
                        "[Permissions] Failed to open System Settings by bundle id {}: {}",
                        bundle_id, error
                    );
                }
            }
        }

        if !opened {
            warn!(
                "[Permissions] open_privacy_pane_failed pane={} all open commands failed",
                pane
            );
            return Err("Failed to open macOS System Settings".to_string());
        }
        info!("[Permissions] open_privacy_pane_completed pane={}", pane);
    }
    Ok(true)
}
