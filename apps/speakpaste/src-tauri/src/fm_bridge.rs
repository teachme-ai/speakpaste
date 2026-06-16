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
    Ok(check_fm_availability())
}

#[tauri::command]
pub fn fm_clean_ramble(input: String) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::ffi::{CString, CStr};
        let c_input = CString::new(input).map_err(|e| e.to_string())?;
        unsafe {
            let ptr = mynah_fm_clean_ramble(c_input.as_ptr());
            if ptr.is_null() {
                return Err("Clean ramble FFI returned null".to_string());
            }
            let c_str = CStr::from_ptr(ptr);
            let result = c_str.to_string_lossy().into_owned();
            mynah_fm_free(ptr);
            Ok(result)
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Clean ramble not supported on this operating system".to_string())
    }
}

#[tauri::command]
pub fn fm_list(input: String) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::ffi::{CString, CStr};
        let c_input = CString::new(input).map_err(|e| e.to_string())?;
        unsafe {
            let ptr = mynah_fm_list(c_input.as_ptr());
            if ptr.is_null() {
                return Err("List shaping FFI returned null".to_string());
            }
            let c_str = CStr::from_ptr(ptr);
            let result = c_str.to_string_lossy().into_owned();
            mynah_fm_free(ptr);
            Ok(result)
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("List shaping not supported on this operating system".to_string())
    }
}

#[tauri::command]
pub fn fm_prompt(input: String) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::ffi::{CString, CStr};
        let c_input = CString::new(input).map_err(|e| e.to_string())?;
        unsafe {
            let ptr = mynah_fm_prompt(c_input.as_ptr());
            if ptr.is_null() {
                return Err("Prompt generation FFI returned null".to_string());
            }
            let c_str = CStr::from_ptr(ptr);
            let result = c_str.to_string_lossy().into_owned();
            mynah_fm_free(ptr);
            Ok(result)
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Prompt generation not supported on this operating system".to_string())
    }
}

