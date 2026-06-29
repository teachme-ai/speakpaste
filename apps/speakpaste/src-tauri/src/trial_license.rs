use hmac::{Hmac, Mac};
use serde::Serialize;
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

const HMAC_KEY: &[u8] = env!("MYNAH_TRIAL_HMAC_KEY_RESOLVED").as_bytes();
const TRIAL_LENGTH_DAYS: i32 = 60;
const TRIAL_INVALID_ERROR: &str =
    "Mynah couldn't verify the trial period on this Mac, so the trial is shown as ended.";

pub const IS_TRIAL_BUILD: bool = match option_env!("MYNAH_TRIAL_MODE") {
    Some(val) => {
        // Rust const matching allows simple string checks
        let bytes = val.as_bytes();
        if bytes.len() == 4
            && bytes[0] == b't'
            && bytes[1] == b'r'
            && bytes[2] == b'u'
            && bytes[3] == b'e'
        {
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

#[derive(Clone, Debug, PartialEq, Eq)]
struct TrialAnchor {
    first_launch: u64,
    last_seen: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct TrialAnchorRead {
    anchor: TrialAnchor,
    migrated_from_v1: bool,
}

fn current_unix_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn compute_hmac(input: &[u8]) -> String {
    let mut mac = HmacSha256::new_from_slice(HMAC_KEY).expect("HMAC key should be valid");
    mac.update(input);
    let result = mac.finalize();
    let bytes = result.into_bytes();
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn compute_v1_hmac(timestamp: u64) -> String {
    compute_hmac(&timestamp.to_be_bytes())
}

fn v2_hmac_input(anchor: &TrialAnchor) -> String {
    format!("v2:{}:{}", anchor.first_launch, anchor.last_seen)
}

fn compute_v2_hmac(anchor: &TrialAnchor) -> String {
    compute_hmac(v2_hmac_input(anchor).as_bytes())
}

fn serialize_trial_anchor(anchor: &TrialAnchor) -> String {
    format!(
        "v2:{}:{}:{}",
        anchor.first_launch,
        anchor.last_seen,
        compute_v2_hmac(anchor)
    )
}

fn compute_legacy_hmac(input: &[u8]) -> String {
    const LEGACY_HMAC_KEY: &[u8] = b"mynah-app-trial-key-2026-06-10-secret";
    let mut mac = HmacSha256::new_from_slice(LEGACY_HMAC_KEY).expect("HMAC key should be valid");
    mac.update(input);
    let result = mac.finalize();
    let bytes = result.into_bytes();
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn compute_legacy_v1_hmac(timestamp: u64) -> String {
    compute_legacy_hmac(&timestamp.to_be_bytes())
}

fn compute_legacy_v2_hmac(anchor: &TrialAnchor) -> String {
    compute_legacy_hmac(v2_hmac_input(anchor).as_bytes())
}

fn parse_trial_anchor(payload: &str) -> Result<TrialAnchorRead, String> {
    let parts: Vec<&str> = payload.split(':').collect();

    if parts.first() == Some(&"v2") {
        if parts.len() != 4 {
            return Err("Invalid v2 trial anchor format".to_string());
        }

        let anchor = TrialAnchor {
            first_launch: parts[1]
                .parse()
                .map_err(|error| format!("Failed to parse first launch timestamp: {}", error))?,
            last_seen: parts[2]
                .parse()
                .map_err(|error| format!("Failed to parse last seen timestamp: {}", error))?,
        };
        let expected_sig = compute_v2_hmac(&anchor);
        let mut needs_migration = false;
        if parts[3] != expected_sig {
            let legacy_sig = compute_legacy_v2_hmac(&anchor);
            if parts[3] == legacy_sig {
                needs_migration = true;
            } else {
                return Err("Trial anchor signature verification failed".to_string());
            }
        }
        return Ok(TrialAnchorRead {
            anchor,
            migrated_from_v1: needs_migration,
        });
    }

    if parts.len() == 2 {
        let timestamp: u64 = parts[0]
            .parse()
            .map_err(|error| format!("Failed to parse timestamp: {}", error))?;
        let expected_sig = compute_v1_hmac(timestamp);
        let mut needs_migration = true;
        if parts[1] != expected_sig {
            let legacy_sig = compute_legacy_v1_hmac(timestamp);
            if parts[1] == legacy_sig {
                needs_migration = true;
            } else {
                return Err("Trial anchor signature verification failed".to_string());
            }
        }
        return Ok(TrialAnchorRead {
            anchor: TrialAnchor {
                first_launch: timestamp,
                last_seen: timestamp,
            },
            migrated_from_v1: needs_migration,
        });
    }

    Err("Invalid trial anchor format".to_string())
}

#[cfg(target_os = "macos")]
fn get_keychain_anchor() -> Result<Option<TrialAnchorRead>, String> {
    use security_framework::passwords::get_generic_password;

    match get_generic_password("com.mynah.app.trial", "first_launch") {
        Ok(data) => {
            let s =
                String::from_utf8(data).map_err(|e| format!("Invalid UTF-8 in keychain: {}", e))?;
            parse_trial_anchor(&s).map(Some)
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
fn save_keychain_anchor(anchor: &TrialAnchor) -> Result<(), String> {
    use security_framework::passwords::set_generic_password;

    let payload = serialize_trial_anchor(anchor);

    // Attempt to delete any stale item first
    let _ = delete_keychain_anchor();

    set_generic_password("com.mynah.app.trial", "first_launch", payload.as_bytes())
        .map_err(|e| format!("Failed to write generic password to keychain: {}", e))?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn delete_keychain_anchor() -> Result<(), String> {
    use security_framework::passwords::delete_generic_password;
    delete_generic_password("com.mynah.app.trial", "first_launch")
        .map_err(|e| format!("Failed to delete keychain generic password: {}", e))
}

// Fallback stubs for non-macOS platforms
#[cfg(not(target_os = "macos"))]
fn get_keychain_anchor() -> Result<Option<TrialAnchorRead>, String> {
    Ok(None)
}

#[cfg(not(target_os = "macos"))]
fn save_keychain_anchor(_anchor: &TrialAnchor) -> Result<(), String> {
    Ok(())
}

pub async fn initialize_trial_if_needed() -> Result<(), String> {
    if !IS_TRIAL_BUILD {
        return Ok(());
    }

    let now = current_unix_secs();
    match get_keychain_anchor()? {
        Some(read) if read.migrated_from_v1 => {
            let anchor = TrialAnchor {
                first_launch: read.anchor.first_launch,
                last_seen: read.anchor.last_seen.max(now),
            };
            save_keychain_anchor(&anchor)?;
        }
        Some(_) => {}
        None => {
            save_keychain_anchor(&TrialAnchor {
                first_launch: now,
                last_seen: now,
            })?;
        }
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

    match get_keychain_anchor() {
        Ok(Some(read)) => {
            let now = current_unix_secs();
            let mut anchor = read.anchor;

            if now < anchor.last_seen {
                return TrialStatus {
                    is_trial_build: true,
                    days_elapsed: 0,
                    days_remaining: 0,
                    is_expired: true,
                    first_launch_iso: format_iso_timestamp(anchor.first_launch),
                    error: Some(TRIAL_INVALID_ERROR.to_string()),
                };
            }

            anchor.last_seen = anchor.last_seen.max(now);
            if let Err(err) = save_keychain_anchor(&anchor) {
                return TrialStatus {
                    is_trial_build: true,
                    days_elapsed: 0,
                    days_remaining: 0,
                    is_expired: true,
                    first_launch_iso: format_iso_timestamp(anchor.first_launch),
                    error: Some(format!("{} ({})", TRIAL_INVALID_ERROR, err)),
                };
            }

            let elapsed_secs = anchor.last_seen.saturating_sub(anchor.first_launch);
            let days_elapsed = (elapsed_secs / 86400) as u32;
            let days_remaining = TRIAL_LENGTH_DAYS - (days_elapsed as i32);
            let is_expired = days_remaining <= 0;

            TrialStatus {
                is_trial_build: true,
                days_elapsed,
                days_remaining,
                is_expired,
                first_launch_iso: format_iso_timestamp(anchor.first_launch),
                error: None,
            }
        }
        Ok(None) => {
            // First run, not initialized yet (will be initialized on setup)
            TrialStatus {
                is_trial_build: true,
                days_elapsed: 0,
                days_remaining: TRIAL_LENGTH_DAYS,
                is_expired: false,
                first_launch_iso: "".to_string(),
                error: None,
            }
        }
        Err(err) => TrialStatus {
            is_trial_build: true,
            days_elapsed: 0,
            days_remaining: 0,
            is_expired: true,
            first_launch_iso: "".to_string(),
            error: Some(format!("{} ({})", TRIAL_INVALID_ERROR, err)),
        },
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

#[cfg(test)]
mod tests {
    use super::{compute_v1_hmac, parse_trial_anchor, serialize_trial_anchor, TrialAnchor};

    #[test]
    fn parses_valid_v1_payload_for_migration() {
        let timestamp = 1_700_000_000;
        let payload = format!("{}:{}", timestamp, compute_v1_hmac(timestamp));
        let parsed = parse_trial_anchor(&payload).expect("valid v1 payload should parse");

        assert!(parsed.migrated_from_v1);
        assert_eq!(parsed.anchor.first_launch, timestamp);
        assert_eq!(parsed.anchor.last_seen, timestamp);
    }

    #[test]
    fn parses_legacy_v1_payload_for_migration() {
        let timestamp = 1_700_000_000;
        let payload = format!("{}:{}", timestamp, super::compute_legacy_v1_hmac(timestamp));
        let parsed = parse_trial_anchor(&payload).expect("legacy v1 payload should parse and migrate");

        assert!(parsed.migrated_from_v1);
        assert_eq!(parsed.anchor.first_launch, timestamp);
        assert_eq!(parsed.anchor.last_seen, timestamp);
    }

    #[test]
    fn parses_legacy_v2_payload_for_migration() {
        let anchor = TrialAnchor {
            first_launch: 1_700_000_000,
            last_seen: 1_700_086_400,
        };
        let payload = format!(
            "v2:{}:{}:{}",
            anchor.first_launch,
            anchor.last_seen,
            super::compute_legacy_v2_hmac(&anchor)
        );
        let parsed = parse_trial_anchor(&payload).expect("legacy v2 payload should parse and migrate");

        assert!(parsed.migrated_from_v1);
        assert_eq!(parsed.anchor, anchor);
    }

    #[test]
    fn parses_valid_v2_payload() {
        let anchor = TrialAnchor {
            first_launch: 1_700_000_000,
            last_seen: 1_700_086_400,
        };
        let payload = serialize_trial_anchor(&anchor);
        let parsed = parse_trial_anchor(&payload).expect("valid v2 payload should parse");

        assert!(!parsed.migrated_from_v1);
        assert_eq!(parsed.anchor, anchor);
    }

    #[test]
    fn rejects_malformed_three_field_payload_without_v2_prefix() {
        let result = parse_trial_anchor("1700000000:1700000001:signature");
        assert!(result.is_err());
    }

    #[test]
    fn rejects_unknown_version_prefix() {
        let result = parse_trial_anchor("v3:1700000000:1700000001:signature");
        assert!(result.is_err());
    }
}
