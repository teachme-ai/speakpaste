use hmac::{Hmac, Mac};
use sha2::Sha256;
use serde::Serialize;

type HmacSha256 = Hmac<Sha256>;

const HMAC_KEY: &[u8] = b"mynah-app-trial-key-2026-06-10-secret";

pub const IS_TRIAL_BUILD: bool = match option_env!("MYNAH_TRIAL_MODE") {
    Some(val) => {
        // Rust const matching allows simple string checks
        let bytes = val.as_bytes();
        if bytes.len() == 4 && bytes[0] == b't' && bytes[1] == b'r' && bytes[2] == b'u' && bytes[3] == b'e' {
            true
        } else {
            false
        }
    }
    None => false,
};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrialStatus {
    pub is_trial_build: bool,
    pub days_elapsed: u32,
    pub days_remaining: i32,
    pub is_expired: bool,
    pub first_launch_iso: String,
    pub error: Option<String>,
}

fn compute_hmac(timestamp: u64) -> String {
    let mut mac = HmacSha256::new_from_slice(HMAC_KEY).expect("HMAC key should be valid");
    mac.update(&timestamp.to_be_bytes());
    let result = mac.finalize();
    let bytes = result.into_bytes();
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

#[cfg(target_os = "macos")]
fn get_keychain_timestamp() -> Result<Option<u64>, String> {
    use security_framework::passwords::get_generic_password;
    
    match get_generic_password("com.mynah.app.trial", "first_launch") {
        Ok(data) => {
            let s = String::from_utf8(data)
                .map_err(|e| format!("Invalid UTF-8 in keychain: {}", e))?;
            let parts: Vec<&str> = s.split(':').collect();
            if parts.len() != 2 {
                return Err("Invalid keychain format".to_string());
            }
            let timestamp: u64 = parts[0].parse()
                .map_err(|e| format!("Failed to parse timestamp: {}", e))?;
            let signature = parts[1];
            
            // Verify HMAC signature
            let expected_sig = compute_hmac(timestamp);
            if signature != expected_sig {
                return Err("Keychain item signature verification failed (tampered)".to_string());
            }
            Ok(Some(timestamp))
        }
        Err(e) => {
            // OSStatus -25300 is errSecItemNotFound
            if e.code() == -25300 {
                Ok(None)
            } else {
                Err(format!("Keychain lookup error (code {}): {}", e.code(), e))
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn save_keychain_timestamp(timestamp: u64) -> Result<(), String> {
    use security_framework::passwords::set_generic_password;
    
    let signature = compute_hmac(timestamp);
    let payload = format!("{}:{}", timestamp, signature);
    
    // Attempt to delete any stale item first
    let _ = delete_keychain_timestamp();
    
    set_generic_password("com.mynah.app.trial", "first_launch", payload.as_bytes())
        .map_err(|e| format!("Failed to write generic password to keychain: {}", e))?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn delete_keychain_timestamp() -> Result<(), String> {
    use security_framework::passwords::delete_generic_password;
    delete_generic_password("com.mynah.app.trial", "first_launch")
        .map_err(|e| format!("Failed to delete keychain generic password: {}", e))
}

// Fallback stubs for non-macOS platforms
#[cfg(not(target_os = "macos"))]
fn get_keychain_timestamp() -> Result<Option<u64>, String> {
    Ok(None)
}

#[cfg(not(target_os = "macos"))]
fn save_keychain_timestamp(_timestamp: u64) -> Result<(), String> {
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn delete_keychain_timestamp() -> Result<(), String> {
    Ok(())
}

#[derive(serde::Deserialize)]
struct WorldTimeResponse {
    unixtime: u64,
}

async fn fetch_internet_time() -> Option<u64> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .ok()?;
    let res = client.get("https://worldtimeapi.org/api/timezone/Etc/UTC")
        .send()
        .await
        .ok()?;
    let json: WorldTimeResponse = res.json().await.ok()?;
    Some(json.unixtime)
}

pub async fn initialize_trial_if_needed() -> Result<(), String> {
    if !IS_TRIAL_BUILD {
        return Ok(());
    }
    
    let current_keychain = get_keychain_timestamp()?;
    if current_keychain.is_none() {
        let system_now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        save_keychain_timestamp(system_now)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_trial_status() -> TrialStatus {
    if !IS_TRIAL_BUILD {
        return TrialStatus {
            is_trial_build: false,
            days_elapsed: 0,
            days_remaining: 9999,
            is_expired: false,
            first_launch_iso: "".to_string(),
            error: None,
        };
    }

    match get_keychain_timestamp() {
        Ok(Some(first_launch_secs)) => {
            let system_now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();

            let mut current_ref_time = system_now;

            // Fetch internet time to cross-verify against system clock rollback
            if let Some(internet_time) = fetch_internet_time().await {
                if internet_time > current_ref_time {
                    current_ref_time = internet_time;
                }
            }

            // Check if clock was wound back below first launch
            if current_ref_time < first_launch_secs {
                return TrialStatus {
                    is_trial_build: true,
                    days_elapsed: 0,
                    days_remaining: 0,
                    is_expired: true,
                    first_launch_iso: format_iso_timestamp(first_launch_secs),
                    error: Some("Clock rollback detected. Trial has been blocked.".to_string()),
                };
            }

            let elapsed_secs = current_ref_time.saturating_sub(first_launch_secs);
            let days_elapsed = (elapsed_secs / 86400) as u32;
            let days_remaining = 60 - (days_elapsed as i32);
            let is_expired = days_remaining <= 0;

            TrialStatus {
                is_trial_build: true,
                days_elapsed,
                days_remaining,
                is_expired,
                first_launch_iso: format_iso_timestamp(first_launch_secs),
                error: None,
            }
        }
        Ok(None) => {
            // First run, not initialized yet (will be initialized on setup)
            TrialStatus {
                is_trial_build: true,
                days_elapsed: 0,
                days_remaining: 60,
                is_expired: false,
                first_launch_iso: "".to_string(),
                error: None,
            }
        }
        Err(err) => {
            TrialStatus {
                is_trial_build: true,
                days_elapsed: 0,
                days_remaining: 0,
                is_expired: true,
                first_launch_iso: "".to_string(),
                error: Some(format!("Tamper detected or keychain error: {}", err)),
            }
        }
    }
}

fn format_iso_timestamp(secs: u64) -> String {
    let d = std::time::UNIX_EPOCH + std::time::Duration::from_secs(secs);
    // Rough ISO-8601 formatting for display / debugging
    // This is simple enough to avoid adding a heavy library dependency
    match d.duration_since(std::time::UNIX_EPOCH) {
        Ok(duration) => {
            let total_secs = duration.as_secs();
            let days = total_secs / 86400;
            // Epoch is 1970-01-01
            format!("Approx epoch days: {}", days)
        }
        Err(_) => "invalid".to_string(),
    }
}
