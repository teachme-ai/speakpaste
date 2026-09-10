/// Indic language support utilities for Whisper speech-to-text.
///
/// Because Whisper's standard BPE vocabulary lacks dedicated subword tokens for
/// Dravidian scripts (Kannada, Telugu, Malayalam), Whisper's acoustic model frequently
/// transcribes these phonetically into Devanagari (Hindi) or Tamil characters.
///
/// This module provides:
/// 1. Script priming prompts that steer Whisper into the correct language token distribution.
/// 2. Deterministic Brahmic transliteration to normalize any Devanagari phonetic output
///    directly into the native target script (e.g. Devanagari -> Kannada).

pub fn get_initial_prompt(lang: Option<&str>) -> Option<String> {
    match lang {
        Some("kn") => Some("ನಮಸ್ಕಾರ, ಇದು ಕನ್ನಡ ಭಾಷೆ.".to_string()),
        Some("hi") => Some("नमस्ते, यह हिंदी भाषा है।".to_string()),
        Some("ta") => Some("வணக்கம், இது தமிழ் மொழி.".to_string()),
        Some("te") => Some("నమస్కారం, ఇది తెలుగు భాష.".to_string()),
        Some("ml") => Some("നമസ്കാരം, ഇത് മലയാളം ഭാഷയാണ്.".to_string()),
        Some("bn") => Some("নমস্কার, এটি বাংলা ভাষা।".to_string()),
        Some("gu") => Some("નમસ્તે, આ ગુજરાતી ભાષા છે.".to_string()),
        Some("mr") => Some("नमस्कार, ही मराठी भाषा आहे.".to_string()),
        Some("pa") => Some("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਇਹ ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਹੈ।".to_string()),
        Some("ur") => Some("ہیلو، یہ اردو زبان ہے۔".to_string()),
        _ => None,
    }
}

/// Normalizes transcribed text to the target Indic script if Whisper outputted Devanagari.
pub fn normalize_indic_script(text: &str, target_lang: Option<&str>) -> String {
    let lang = match target_lang {
        Some(l) => l,
        None => return text.to_string(),
    };

    match lang {
        "kn" => devanagari_to_kannada(text),
        "te" => devanagari_to_telugu(text),
        _ => text.to_string(),
    }
}

/// Transliterates Devanagari Unicode (U+0900..U+097F) to Kannada Unicode (U+0C80..U+0CFF)
fn devanagari_to_kannada(text: &str) -> String {
    // Check if the text contains any Devanagari characters
    let has_devanagari = text.chars().any(|c| (0x0900..=0x097F).contains(&(c as u32)));
    if !has_devanagari {
        return text.to_string();
    }

    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        let code = c as u32;
        if (0x0900..=0x097F).contains(&code) {
            let offset = code - 0x0900;
            let kn_code = match offset {
                // Devanagari virama / halant (0x094D) -> Kannada virama (0x0CCD)
                0x4D => 0x0CCD,
                // Devanagari independent vowels: E (0x090F) -> Kannada E (0x0C8E)
                0x0F => 0x0C8E,
                // Devanagari independent vowels: O (0x0913) -> Kannada O (0x0C92)
                0x13 => 0x0C92,
                // Devanagari matras: e (0x0947) -> Kannada e (0x0CC6)
                0x47 => 0x0CC6,
                // Devanagari matras: o (0x094B) -> Kannada o (0x0CCA)
                0x4B => 0x0CCA,
                // Standard Brahmic 1:1 offsets
                0x01..=0x39 | 0x3C..=0x4C | 0x55..=0x63 => {
                    let cand = 0x0C80 + offset;
                    cand
                }
                _ => code,
            };
            out.push(char::from_u32(kn_code).unwrap_or(c));
        } else {
            out.push(c);
        }
    }
    out
}

/// Transliterates Devanagari Unicode (U+0900..U+097F) to Telugu Unicode (U+0C00..U+0C7F)
fn devanagari_to_telugu(text: &str) -> String {
    let has_devanagari = text.chars().any(|c| (0x0900..=0x097F).contains(&(c as u32)));
    if !has_devanagari {
        return text.to_string();
    }

    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        let code = c as u32;
        if (0x0900..=0x097F).contains(&code) {
            let offset = code - 0x0900;
            let te_code = match offset {
                0x4D => 0x0C4D,
                0x0F => 0x0C0E,
                0x13 => 0x0C12,
                0x47 => 0x0C46,
                0x4B => 0x0C4A,
                0x01..=0x39 | 0x3C..=0x4C | 0x55..=0x63 => 0x0C00 + offset,
                _ => code,
            };
            out.push(char::from_u32(te_code).unwrap_or(c));
        } else {
            out.push(c);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kannada_transliteration() {
        let devanagari = "येनु निम्महेसरू याव वूरिन्द बंदिने।";
        let kn = normalize_indic_script(devanagari, Some("kn"));
        assert!(kn.contains("ನಿಮ್ಮ"));
        assert!(kn.contains("ಯಾವ"));
    }
}
