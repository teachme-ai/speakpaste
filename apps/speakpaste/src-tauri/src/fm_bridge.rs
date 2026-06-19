use log::{error, info};

use std::time::Instant;

#[cfg(target_os = "macos")]
extern "C" {
    fn mynah_fm_availability() -> *mut std::ffi::c_char;
    fn mynah_fm_free(ptr: *mut std::ffi::c_char);
    fn mynah_fm_clean_ramble(input: *const std::ffi::c_char) -> *mut std::ffi::c_char;
    fn mynah_fm_list(input: *const std::ffi::c_char) -> *mut std::ffi::c_char;
    fn mynah_fm_prompt(input: *const std::ffi::c_char) -> *mut std::ffi::c_char;
}

#[cfg(target_os = "macos")]
pub fn check_fm_availability() -> String {
    use std::ffi::CStr;
    unsafe {
        let ptr = mynah_fm_availability();
        if ptr.is_null() {
            return "unsupported".to_string();
        }
        let c_str = CStr::from_ptr(ptr);
        let status = c_str.to_string_lossy().into_owned();
        mynah_fm_free(ptr);
        status
    }
}

#[cfg(not(target_os = "macos"))]
pub fn check_fm_availability() -> String {
    "unsupported".to_string()
}

#[tauri::command]
pub fn get_fm_capability() -> Result<String, String> {
    info!("[FM] capability_check starting");
    let status = check_fm_availability();
    info!("[FM] capability_check complete status={}", status);
    Ok(status)
}

#[tauri::command]
pub fn fm_clean_ramble(input: String) -> Result<String, String> {
    let start = Instant::now();
    info!("[FM] clean_ramble_start input_chars={}", input.len());
    #[cfg(target_os = "macos")]
    {
        use std::ffi::{CString, CStr};
        let c_input = CString::new(input.clone()).map_err(|e| e.to_string())?;
        unsafe {
            let ptr = mynah_fm_clean_ramble(c_input.as_ptr());
            if ptr.is_null() {
                let err = "Clean ramble FFI returned null".to_string();
                error!("[FM] clean_ramble_error error=\"{}\" elapsed_ms={}", err, start.elapsed().as_millis());
                return Err(err);
            }
            let c_str = CStr::from_ptr(ptr);
            let result = c_str.to_string_lossy().into_owned();
            mynah_fm_free(ptr);
            info!("[FM] clean_ramble_complete input_chars={} output_chars={} elapsed_ms={}",
                  input.len(), result.len(), start.elapsed().as_millis());
            Ok(result)
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let err = "Clean ramble not supported on this operating system".to_string();
        warn!("[FM] clean_ramble_unsupported elapsed_ms={}", start.elapsed().as_millis());
        Err(err)
    }
}

#[tauri::command]
pub fn fm_list(input: String) -> Result<String, String> {
    let start = Instant::now();
    info!("[FM] list_start input_chars={}", input.len());
    #[cfg(target_os = "macos")]
    {
        use std::ffi::{CString, CStr};
        let c_input = CString::new(input.clone()).map_err(|e| e.to_string())?;
        unsafe {
            let ptr = mynah_fm_list(c_input.as_ptr());
            if ptr.is_null() {
                let err = "List shaping FFI returned null".to_string();
                error!("[FM] list_error error=\"{}\" elapsed_ms={}", err, start.elapsed().as_millis());
                return Err(err);
            }
            let c_str = CStr::from_ptr(ptr);
            let result = c_str.to_string_lossy().into_owned();
            mynah_fm_free(ptr);
            info!("[FM] list_complete input_chars={} output_chars={} elapsed_ms={}",
                  input.len(), result.len(), start.elapsed().as_millis());
            Ok(result)
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let err = "List shaping not supported on this operating system".to_string();
        warn!("[FM] list_unsupported elapsed_ms={}", start.elapsed().as_millis());
        Err(err)
    }
}

#[tauri::command]
pub fn fm_prompt(input: String) -> Result<String, String> {
    let start = Instant::now();
    info!("[FM] prompt_start input_chars={}", input.len());
    #[cfg(target_os = "macos")]
    {
        use std::ffi::{CString, CStr};
        let c_input = CString::new(input.clone()).map_err(|e| e.to_string())?;
        unsafe {
            let ptr = mynah_fm_prompt(c_input.as_ptr());
            if ptr.is_null() {
                let err = "Prompt generation FFI returned null".to_string();
                error!("[FM] prompt_error error=\"{}\" elapsed_ms={}", err, start.elapsed().as_millis());
                return Err(err);
            }
            let c_str = CStr::from_ptr(ptr);
            let result = c_str.to_string_lossy().into_owned();
            mynah_fm_free(ptr);
            info!("[FM] prompt_complete input_chars={} output_chars={} elapsed_ms={}",
                  input.len(), result.len(), start.elapsed().as_millis());
            Ok(result)
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let err = "Prompt generation not supported on this operating system".to_string();
        warn!("[FM] prompt_unsupported elapsed_ms={}", start.elapsed().as_millis());
        Err(err)
    }
}
