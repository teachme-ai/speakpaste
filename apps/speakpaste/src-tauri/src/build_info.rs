use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildInfo {
    pub marketing_version: String,
    pub bundle_version: String,
    pub git_commit_count: u64,
    pub git_commit: String,
    pub git_dirty: bool,
    pub built_at_iso: String,
    pub build_signature: String,
}

pub fn current_build_info() -> BuildInfo {
    BuildInfo {
        marketing_version: env!("MYNAH_BUILD_MARKETING_VERSION").to_string(),
        bundle_version: env!("MYNAH_BUILD_BUNDLE_VERSION").to_string(),
        git_commit_count: env!("MYNAH_BUILD_GIT_COMMIT_COUNT")
            .parse::<u64>()
            .unwrap_or(0),
        git_commit: env!("MYNAH_BUILD_GIT_COMMIT").to_string(),
        git_dirty: env!("MYNAH_BUILD_GIT_DIRTY") == "true",
        built_at_iso: env!("MYNAH_BUILD_AT_ISO").to_string(),
        build_signature: env!("MYNAH_BUILD_SIGNATURE").to_string(),
    }
}

#[tauri::command]
pub async fn get_build_info() -> BuildInfo {
    current_build_info()
}
