use std::os::raw::c_void;
use std::ptr;
use std::thread;
use tauri::{AppHandle, Emitter};
use log::{info, error, warn};

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
const K_CG_EVENT_TAP_LOCATION_HID: u32 = 0;      // HID level intercept
const K_CG_EVENT_TAP_PLACEMENT_HEAD_INSERT: u32 = 0;

const K_CG_EVENT_FLAGS_CHANGED: u32 = 12;
const K_CG_KEYBOARD_EVENT_KEYCODE: u32 = 9;
const K_CG_EVENT_FLAG_MASK_SECONDARY_FN: CGEventFlags = 0x00800000; // Fn key mask

// Standalone Fn Key Virtual Keycode (kVK_Function)
const VK_FN: CGKeyCode = 63; // 0x3F

// ==========================================
// 3. Thread-Safe State Structure
// ==========================================
struct KeyListenerState {
    app_handle: AppHandle,
    fn_pressed: bool,
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
    if type_ == K_CG_EVENT_FLAGS_CHANGED {
        // Extract the keycode of the modifier key that changed
        let keycode = CGEventGetIntegerValueField(event, K_CG_KEYBOARD_EVENT_KEYCODE) as CGKeyCode;
        
        if keycode == VK_FN {
            let flags = CGEventGetFlags(event);
            let is_pressed = (flags & K_CG_EVENT_FLAG_MASK_SECONDARY_FN) != 0;
            
            // Cast the context pointer back to our Rust state struct
            let state = &mut *(refcon as *mut KeyListenerState);
            
            // Only fire on state transition (press down vs release up)
            if is_pressed != state.fn_pressed {
                state.fn_pressed = is_pressed;
                
                if is_pressed {
                    info!("[FnKeyListener] Standalone Fn key pressed down");
                    // Emit event to Svelte frontend (Tauri v2 requires the Emitter trait)
                    let _ = state.app_handle.emit("fn-key-down", ());
                } else {
                    info!("[FnKeyListener] Standalone Fn key released");
                    let _ = state.app_handle.emit("fn-key-up", ());
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
use std::sync::atomic::{AtomicBool, Ordering};

static LISTENER_RUNNING: AtomicBool = AtomicBool::new(false);

/// Initializes and starts the global Fn key listener in a background thread.
pub fn start_fn_key_listener(app_handle: AppHandle) -> Result<(), &'static str> {
    if LISTENER_RUNNING.load(Ordering::Relaxed) {
        info!("[FnKeyListener] Listener is already running.");
        return Ok(());
    }

    // Check for macOS Accessibility permissions using AXIsProcessTrusted
    unsafe {
        if !accessibility_sys::AXIsProcessTrusted() {
            warn!("[FnKeyListener] Accessibility permissions not granted. CGEventTapCreate will return NULL.");
            return Err("Missing Accessibility permissions");
        }
    }

    LISTENER_RUNNING.store(true, Ordering::Relaxed);

    // Spawn a background OS thread for the FFI run loop
    thread::spawn(move || {
        unsafe {
            // Allocate state on the heap and get raw pointer
            let state = Box::into_raw(Box::new(KeyListenerState {
                app_handle,
                fn_pressed: false,
            }));
            
            // Mask for FlagsChanged events: (1 << 12)
            let event_mask = 1 << K_CG_EVENT_FLAGS_CHANGED;
            
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
                LISTENER_RUNNING.store(false, Ordering::Relaxed);
                let _ = Box::from_raw(state); // Free state to prevent leak
                return;
            }
            
            // Create the CFRunLoopSource from the MachPort
            let source = CFMachPortCreateRunLoopSource(ptr::null_mut(), tap, 0);
            if source.is_null() {
                error!("[FnKeyListener] Failed to create CFRunLoopSource");
                CFRelease(tap);
                LISTENER_RUNNING.store(false, Ordering::Relaxed);
                let _ = Box::from_raw(state);
                return;
            }
            
            // Add the run loop source to the background thread's run loop
            let run_loop = CFRunLoopGetCurrent();
            CFRunLoopAddSource(run_loop, source, kCFRunLoopCommonModes);
            
            // Enable the event tap
            CGEventTapEnable(tap, true);
            
            info!("[FnKeyListener] Background global Fn key event tap initialized successfully.");
            
            // Blocks and processes events on this thread
            CFRunLoopRun();
            
            // Cleanup (only reached if the run loop is programmatically terminated)
            LISTENER_RUNNING.store(false, Ordering::Relaxed);
            CFRelease(source);
            CFRelease(tap);
            let _ = Box::from_raw(state);
        }
    });
    
    Ok(())
}

#[tauri::command]
pub async fn initialize_fn_key_listener(app: tauri::AppHandle) -> Result<bool, String> {
    match start_fn_key_listener(app) {
        Ok(_) => Ok(true),
        Err(e) => Err(e.to_string()),
    }
}

