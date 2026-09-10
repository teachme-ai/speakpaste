#[cfg(target_os = "macos")]
use cocoa::base::id;
#[cfg(target_os = "macos")]
use cocoa::foundation::NSString;
#[cfg(target_os = "macos")]
use objc::{class, msg_send, sel, sel_impl};
use std::sync::Mutex;
use lazy_static::lazy_static;

lazy_static! {
    static ref ACTIVITY_TOKEN: Mutex<Option<usize>> = Mutex::new(None);
}

#[tauri::command]
pub fn prevent_app_nap(reason: String) {
    #[cfg(target_os = "macos")]
    {
        let mut token_lock = ACTIVITY_TOKEN.lock().unwrap();
        if token_lock.is_some() {
            // Already preventing app nap
            return;
        }

        unsafe {
            let process_info: id = msg_send![class!(NSProcessInfo), processInfo];
            let reason_str = NSString::alloc(cocoa::base::nil).init_str(&reason);
            
            // NSActivityUserInitiated = 0x00FFFFFFULL 
            // According to Apple docs, NSActivityUserInitiated indicates the user is actively engaged
            let options: u64 = 0x00FFFFFF;
            
            let activity: id = msg_send![process_info, beginActivityWithOptions:options reason:reason_str];
            *token_lock = Some(activity as usize);
            log::info!("[AppNap] Disabled App Nap for: {}", reason);
        }
    }
}

#[tauri::command]
pub fn allow_app_nap() {
    #[cfg(target_os = "macos")]
    {
        let mut token_lock = ACTIVITY_TOKEN.lock().unwrap();
        if let Some(token) = token_lock.take() {
            unsafe {
                let process_info: id = msg_send![class!(NSProcessInfo), processInfo];
                let activity = token as id;
                let _: () = msg_send![process_info, endActivity:activity];
                log::info!("[AppNap] Re-enabled App Nap");
            }
        }
    }
}
