use log::{error, info, warn};
use serde::Serialize;
use std::fs::OpenOptions;
use std::os::raw::c_void;
use std::os::unix::io::AsRawFd;
use std::ptr;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc;
use std::sync::OnceLock;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::AppHandle;

// ==========================================
// 1. CoreGraphics / CoreFoundation FFI Types
// ==========================================
type CGEventRef = *mut c_void;
type CGEventTapProxy = *mut c_void;
type CFMachPortRef = *mut c_void;
type CFRunLoopSourceRef = *mut c_void;
type CFRunLoopRef = *mut c_void;
type CFStringRef = *const c_void;

type CGKeyCode = u16;
type CGEventFlags = u64;
type CGEventMask = u64;

// ==========================================
// 2. Constants
// ==========================================
const K_CG_EVENT_TAP_OPTION_LISTEN_ONLY: i32 = 1; // Listen-only mode avoids blocking other apps
const K_CG_EVENT_TAP_LOCATION_HID: u32 = 0; // HID level intercept
const K_CG_EVENT_TAP_PLACEMENT_HEAD_INSERT: u32 = 0;

const K_CG_EVENT_FLAGS_CHANGED: u32 = 12;
const K_CG_EVENT_KEY_DOWN: u32 = 10;
const K_CG_KEYBOARD_EVENT_KEYCODE: u32 = 9;
const K_CG_EVENT_FLAG_MASK_SECONDARY_FN: CGEventFlags = 0x00800000; // Fn key mask
const FN_STANDALONE_TRIGGER_DELAY_MS: u64 = 120;

// Standalone Fn Key Virtual Keycode (kVK_Function)
const VK_FN: CGKeyCode = 63; // 0x3F

// ==========================================
// 3. Thread-Safe State Structure
// ==========================================
struct KeyListenerState {
    app_handle: AppHandle,
    fn_pressed: Arc<AtomicBool>,
    fn_chorded: Arc<AtomicBool>,
    fn_started_recording: Arc<AtomicBool>,
    fn_generation: Arc<AtomicU64>,
}

// ==========================================
// 4. Event Tap Callback (C-Compatible FFI)
// ==========================================
unsafe extern "C" fn event_tap_callback(
    _proxy: CGEventTapProxy,
    type_: u32,
    event: CGEventRef,
    refcon: *mut c_void,
) -> CGEventRef {
    if type_ == K_CG_EVENT_KEY_DOWN {
        let state = &mut *(refcon as *mut KeyListenerState);
        if state.fn_pressed.load(Ordering::SeqCst) {
            let keycode =
                CGEventGetIntegerValueField(event, K_CG_KEYBOARD_EVENT_KEYCODE) as CGKeyCode;
            if keycode != VK_FN {
                state.fn_chorded.store(true, Ordering::SeqCst);
                state.fn_generation.fetch_add(1, Ordering::SeqCst);
                info!(
                    "[FnKeyListener] Ignoring Fn hold because it was combined with keycode {}",
                    keycode
                );

                if state
                    .fn_started_recording
                    .compare_exchange(true, false, Ordering::SeqCst, Ordering::SeqCst)
                    .is_ok()
                {
                    if let Err(error) =
                        crate::dictation_manager::cancel_native_dictation_for_app(&state.app_handle)
                    {
                        error!(
                            "[FnKeyListener] failed to cancel chorded native dictation: {}",
                            error
                        );
                    }
                }
            }
        }
    } else if type_ == K_CG_EVENT_FLAGS_CHANGED {
        // Extract the keycode of the modifier key that changed
        let keycode = CGEventGetIntegerValueField(event, K_CG_KEYBOARD_EVENT_KEYCODE) as CGKeyCode;

        if keycode == VK_FN {
            let flags = CGEventGetFlags(event);
            let is_pressed = (flags & K_CG_EVENT_FLAG_MASK_SECONDARY_FN) != 0;

            // Cast the context pointer back to our Rust state struct
            let state = &mut *(refcon as *mut KeyListenerState);

            // Only fire on state transition (press down vs release up)
            if is_pressed != state.fn_pressed.load(Ordering::SeqCst) {
                state.fn_pressed.store(is_pressed, Ordering::SeqCst);

                if is_pressed {
                    info!("[FnKeyListener] Fn key pressed down, waiting for standalone hold");
                    state.fn_chorded.store(false, Ordering::SeqCst);
                    state.fn_started_recording.store(false, Ordering::SeqCst);
                    let generation = state.fn_generation.fetch_add(1, Ordering::SeqCst) + 1;
                    let app_handle = state.app_handle.clone();
                    let fn_pressed = state.fn_pressed.clone();
                    let fn_chorded = state.fn_chorded.clone();
                    let fn_started_recording = state.fn_started_recording.clone();
                    let fn_generation = state.fn_generation.clone();

                    thread::spawn(move || {
                        thread::sleep(Duration::from_millis(FN_STANDALONE_TRIGGER_DELAY_MS));
                        let still_current = fn_generation.load(Ordering::SeqCst) == generation;
                        if !still_current
                            || !fn_pressed.load(Ordering::SeqCst)
                            || fn_chorded.load(Ordering::SeqCst)
                        {
                            return;
                        }

                        info!("[FnKeyListener] Standalone Fn hold confirmed");
                        match crate::dictation_manager::start_native_dictation_for_app(&app_handle)
                        {
                            Ok(()) => {
                                fn_started_recording.store(true, Ordering::SeqCst);
                            }
                            Err(error) => {
                                error!(
                                    "[FnKeyListener] failed to start native dictation: {}",
                                    error
                                );
                            }
                        }
                    });
                } else {
                    info!("[FnKeyListener] Standalone Fn key released");
                    state.fn_generation.fetch_add(1, Ordering::SeqCst);
                    let was_chorded = state.fn_chorded.swap(false, Ordering::SeqCst);
                    let was_recording = state
                        .fn_started_recording
                        .compare_exchange(true, false, Ordering::SeqCst, Ordering::SeqCst)
                        .is_ok();

                    if was_chorded {
                        if was_recording {
                            if let Err(error) =
                                crate::dictation_manager::cancel_native_dictation_for_app(
                                    &state.app_handle,
                                )
                            {
                                error!(
                                    "[FnKeyListener] failed to cancel chorded native dictation: {}",
                                    error
                                );
                            }
                        }
                        info!("[FnKeyListener] Fn chord released without dictation trigger");
                    } else if was_recording {
                        if let Err(error) = crate::dictation_manager::stop_native_dictation_for_app(
                            &state.app_handle,
                        ) {
                            error!("[FnKeyListener] failed to stop native dictation: {}", error);
                        }
                    }
                }
            }
        }
    }

    // Return the unmodified event so other system apps process it normally
    event
}

// ==========================================
// 5. FFI Linkages
// ==========================================
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventTapCreate(
        tap: u32,
        place: u32,
        options: i32,
        eventsOfInterest: CGEventMask,
        callback: CGEventTapCallBack,
        refcon: *mut c_void,
    ) -> CFMachPortRef;

    fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);
    fn CGEventGetFlags(event: CGEventRef) -> CGEventFlags;
    fn CGEventGetIntegerValueField(event: CGEventRef, field: u32) -> i64;
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    static kCFRunLoopCommonModes: CFStringRef;

    fn CFMachPortCreateRunLoopSource(
        allocator: *mut c_void,
        port: CFMachPortRef,
        order: isize,
    ) -> CFRunLoopSourceRef;

    fn CFRunLoopGetCurrent() -> CFRunLoopRef;
    fn CFRunLoopAddSource(rl: CFRunLoopRef, source: CFRunLoopSourceRef, mode: CFStringRef);
    fn CFRunLoopRun();
    fn CFRelease(obj: *mut c_void);
}

type CGEventTapCallBack = unsafe extern "C" fn(
    proxy: CGEventTapProxy,
    type_: u32,
    event: CGEventRef,
    refcon: *mut c_void,
) -> CGEventRef;

// ==========================================
// 6. Public Runner
// ==========================================
static LISTENER_RUNNING: AtomicBool = AtomicBool::new(false);
static LISTENER_INITIALIZING: AtomicBool = AtomicBool::new(false);
static EVENT_TAP_LOCK_FILE: OnceLock<std::fs::File> = OnceLock::new();

// Advisory flock constants (POSIX / macOS)
const LOCK_EX: i32 = 2; // Exclusive lock
const LOCK_NB: i32 = 4; // Non-blocking (EWOULDBLOCK if held)

#[link(name = "c")]
extern "C" {
    fn flock(fd: i32, operation: i32) -> i32;
}

/// Returns Some(true) if this process acquired the advisory lock (primary instance),
/// Some(false) if another process holds it (secondary instance), or
/// None if the lock file could not be opened (fail-open as primary).
fn try_acquire_event_tap_primary_lock() -> Option<bool> {
    let lock_path = std::env::temp_dir().join("mynah-event-tap.lock");
    match OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open(&lock_path)
    {
        Ok(file) => {
            let fd = file.as_raw_fd();
            let result = unsafe { flock(fd, LOCK_EX | LOCK_NB) };
            if result == 0 {
                let _ = EVENT_TAP_LOCK_FILE.set(file);
                Some(true)
            } else {
                Some(false)
            }
        }
        Err(e) => {
            warn!("[FnKeyListener] could not open event-tap lock file: {} — assuming primary instance", e);
            None
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FnKeyListenerReadiness {
    pub accessibility_trusted: bool,
    pub listener_initializing: bool,
    pub listener_running: bool,
    pub listener_ready: bool,
    pub initialized: bool,
    pub message: Option<String>,
}

fn accessibility_trusted() -> bool {
    unsafe { accessibility_sys::AXIsProcessTrusted() }
}

/// Initializes and starts the global Fn key listener in a background thread.
pub fn start_fn_key_listener(app_handle: AppHandle) -> Result<(), String> {
    if LISTENER_RUNNING.load(Ordering::Relaxed) {
        info!("[FnKeyListener] Listener is already running.");
        return Ok(());
    }

    if LISTENER_INITIALIZING
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err("Fn key listener is still initializing".to_string());
    }

    // Check for macOS Accessibility permissions using AXIsProcessTrusted
    if !accessibility_trusted() {
        warn!("[FnKeyListener] Accessibility permissions not granted. CGEventTapCreate will return NULL.");
        LISTENER_INITIALIZING.store(false, Ordering::SeqCst);
        return Err("Missing Accessibility permissions".to_string());
    }

    // ── Event-tap primary-instance lock ────────────────────────────────────
    // Only one Mynah process at a time should register a CGEventTap.
    // Both dev and prod builds use different bundle IDs so single-instance
    // plugins don't help. A flock advisory lock guarantees the secondary
    // instance yields gracefully instead of registering a competing tap
    // that would cause double-paste on every dictation.
    match try_acquire_event_tap_primary_lock() {
        Some(false) => {
            warn!(
                "[FnKeyListener] secondary_instance pid={} — event-tap lock held by another \
                 Mynah process. Skipping CGEventTap registration to prevent double-paste.",
                std::process::id()
            );
            LISTENER_INITIALIZING.store(false, Ordering::SeqCst);
            return Ok(());
        }
        Some(true) => {
            info!(
                "[FnKeyListener] primary_instance pid={} acquired event-tap lock — \
                 CGEventTap will be registered.",
                std::process::id()
            );
        }
        None => {
            info!(
                "[FnKeyListener] event-tap lock file unavailable — assuming primary instance pid={}",
                std::process::id()
            );
        }
    }
    // ──────────────────────────────────────────────────────────────────────

    let (init_sender, init_receiver) = mpsc::channel::<Result<(), String>>();

    // Spawn a background OS thread for the FFI run loop
    thread::spawn(move || {
        unsafe {
            let finish_initialization = |result: Result<(), String>| {
                LISTENER_INITIALIZING.store(false, Ordering::SeqCst);
                let _ = init_sender.send(result);
            };

            // Allocate state on the heap and get raw pointer
            let state = Box::into_raw(Box::new(KeyListenerState {
                app_handle,
                fn_pressed: Arc::new(AtomicBool::new(false)),
                fn_chorded: Arc::new(AtomicBool::new(false)),
                fn_started_recording: Arc::new(AtomicBool::new(false)),
                fn_generation: Arc::new(AtomicU64::new(0)),
            }));

            // Mask for Fn flag changes plus normal key presses used to detect Fn chords.
            let event_mask = (1 << K_CG_EVENT_FLAGS_CHANGED) | (1 << K_CG_EVENT_KEY_DOWN);

            // Create the tap
            let tap = CGEventTapCreate(
                K_CG_EVENT_TAP_LOCATION_HID,
                K_CG_EVENT_TAP_PLACEMENT_HEAD_INSERT,
                K_CG_EVENT_TAP_OPTION_LISTEN_ONLY,
                event_mask,
                event_tap_callback,
                state as *mut c_void,
            );

            if tap.is_null() {
                error!("[FnKeyListener] Failed to create CGEventTap. Ensure Accessibility permissions are active.");
                LISTENER_RUNNING.store(false, Ordering::SeqCst);
                finish_initialization(Err(
                    "Failed to create CGEventTap after Accessibility trust".to_string()
                ));
                let _ = Box::from_raw(state); // Free state to prevent leak
                return;
            }

            // Create the CFRunLoopSource from the MachPort
            let source = CFMachPortCreateRunLoopSource(ptr::null_mut(), tap, 0);
            if source.is_null() {
                error!("[FnKeyListener] Failed to create CFRunLoopSource");
                CFRelease(tap);
                LISTENER_RUNNING.store(false, Ordering::SeqCst);
                finish_initialization(Err("Failed to create CFRunLoopSource".to_string()));
                let _ = Box::from_raw(state);
                return;
            }

            // Add the run loop source to the background thread's run loop
            let run_loop = CFRunLoopGetCurrent();
            CFRunLoopAddSource(run_loop, source, kCFRunLoopCommonModes);

            // Enable the event tap
            CGEventTapEnable(tap, true);
            LISTENER_RUNNING.store(true, Ordering::SeqCst);

            info!("[FnKeyListener] Background global Fn key event tap initialized successfully.");
            finish_initialization(Ok(()));

            // Blocks and processes events on this thread
            CFRunLoopRun();

            // Cleanup (only reached if the run loop is programmatically terminated)
            LISTENER_RUNNING.store(false, Ordering::SeqCst);
            CFRelease(source);
            CFRelease(tap);
            let _ = Box::from_raw(state);
        }
    });

    match init_receiver.recv_timeout(Duration::from_secs(2)) {
        Ok(result) => result,
        Err(_) => Err("Timed out while initializing Fn key listener".to_string()),
    }
}

#[tauri::command]
pub async fn initialize_fn_key_listener(app: tauri::AppHandle) -> Result<bool, String> {
    match start_fn_key_listener(app) {
        Ok(_) => Ok(true),
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub async fn get_fn_key_listener_readiness(
    app: tauri::AppHandle,
) -> Result<FnKeyListenerReadiness, String> {
    let trusted = accessibility_trusted();
    let was_running = LISTENER_RUNNING.load(Ordering::SeqCst);

    if !trusted {
        return Ok(FnKeyListenerReadiness {
            accessibility_trusted: false,
            listener_initializing: LISTENER_INITIALIZING.load(Ordering::SeqCst),
            listener_running: was_running,
            listener_ready: false,
            initialized: false,
            message: Some("Accessibility is not trusted by macOS yet".to_string()),
        });
    }

    if let Err(error) = start_fn_key_listener(app) {
        return Ok(FnKeyListenerReadiness {
            accessibility_trusted: true,
            listener_initializing: LISTENER_INITIALIZING.load(Ordering::SeqCst),
            listener_running: LISTENER_RUNNING.load(Ordering::SeqCst),
            listener_ready: false,
            initialized: false,
            message: Some(error),
        });
    }

    Ok(FnKeyListenerReadiness {
        accessibility_trusted: true,
        listener_initializing: LISTENER_INITIALIZING.load(Ordering::SeqCst),
        listener_running: LISTENER_RUNNING.load(Ordering::SeqCst),
        listener_ready: LISTENER_RUNNING.load(Ordering::SeqCst),
        initialized: !was_running,
        message: None,
    })
}
