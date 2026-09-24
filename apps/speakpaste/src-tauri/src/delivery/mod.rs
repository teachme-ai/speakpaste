//! Testable delivery decisions for the clipboard/paste boundary.
//!
//! OS interaction remains in the coordinator-owned command wiring. This module
//! deliberately models the commit boundary so cancellation and clipboard
//! restoration cannot be represented as an undifferentiated `Ok(String)`.

use crate::contracts::{DeliveryOutcome, DeliveryStatus, DICTATION_CONTRACT_VERSION};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommitState {
    BeforeCommit,
    CommitStarted,
}

pub fn cancellation_outcome(
    session_id: impl Into<String>,
    text_len: usize,
    commit: CommitState,
) -> DeliveryOutcome {
    match commit {
        CommitState::BeforeCommit => DeliveryOutcome {
            contract_version: DICTATION_CONTRACT_VERSION,
            session_id: session_id.into(),
            status: DeliveryStatus::CancelledBeforeCommit,
            text_length: text_len,
            reason: Some("cancelled before delivery commit".to_string()),
        },
        CommitState::CommitStarted => DeliveryOutcome {
            contract_version: DICTATION_CONTRACT_VERSION,
            session_id: session_id.into(),
            status: DeliveryStatus::PasteAttemptedUnverified,
            text_length: text_len,
            reason: Some("cancellation arrived after delivery commit began".to_string()),
        },
    }
}

/// Restore the previous clipboard only if the app still owns the value it wrote.
pub fn should_restore_clipboard(
    original_exists: bool,
    current_text: Option<&str>,
    written_text: &str,
) -> bool {
    original_exists && current_text == Some(written_text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cancellation_before_commit_is_not_a_paste() {
        let outcome = cancellation_outcome("s1", 4, CommitState::BeforeCommit);
        assert_eq!(outcome.status, DeliveryStatus::CancelledBeforeCommit);
    }

    #[test]
    fn cancellation_after_commit_reports_unverified_attempt() {
        let outcome = cancellation_outcome("s1", 4, CommitState::CommitStarted);
        assert_eq!(outcome.status, DeliveryStatus::PasteAttemptedUnverified);
    }

    #[test]
    fn clipboard_is_not_restored_after_external_change() {
        assert!(!should_restore_clipboard(
            true,
            Some("new copy"),
            "mynah text"
        ));
        assert!(should_restore_clipboard(
            true,
            Some("mynah text"),
            "mynah text"
        ));
        assert!(!should_restore_clipboard(
            false,
            Some("mynah text"),
            "mynah text"
        ));
    }
}
