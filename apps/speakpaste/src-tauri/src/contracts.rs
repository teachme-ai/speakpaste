//! Versioned contracts for the native dictation pipeline.
//! Keep aligned with `src/lib/contracts/dictation.ts`.

use serde::{Deserialize, Serialize};

pub const DICTATION_CONTRACT_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DictationAction {
    Dictate,
    CleanRamble,
    List,
    Prompt,
    EditSelection,
    CreatePrompt,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeliveryStatus {
    InsertedVerified,
    PasteAttemptedUnverified,
    CopiedOnly,
    TargetChanged,
    CancelledBeforeCommit,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryOutcome {
    pub contract_version: u32,
    pub session_id: String,
    pub status: DeliveryStatus,
    pub text_length: usize,
    pub reason: Option<String>,
}

impl DeliveryOutcome {
    pub fn cancelled_before_commit(
        session_id: impl Into<String>,
        reason: impl Into<String>,
    ) -> Self {
        Self {
            contract_version: DICTATION_CONTRACT_VERSION,
            session_id: session_id.into(),
            status: DeliveryStatus::CancelledBeforeCommit,
            text_length: 0,
            reason: Some(reason.into()),
        }
    }
}
