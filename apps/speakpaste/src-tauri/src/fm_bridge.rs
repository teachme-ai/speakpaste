#[cfg(target_os = "macos")]
extern "C" {
    fn mynah_fm_availability() -> *mut std::ffi::c_char;
    fn mynah_fm_free(ptr: *mut std::ffi::c_char);
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
