use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    println!("cargo:rerun-if-changed=build-meta.json");
    println!("cargo:rerun-if-changed=../package.json");
    println!("cargo:rerun-if-env-changed=MYNAH_TRIAL_MODE");
    println!("cargo:rerun-if-env-changed=MYNAH_TRIAL_HMAC_KEY");

    let manifest_dir =
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("missing CARGO_MANIFEST_DIR"));
    let build_meta_path = manifest_dir.join("build-meta.json");

    let build_meta = fs::read_to_string(&build_meta_path)
        .ok()
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok());

    set_rustc_env(
        "MYNAH_BUILD_MARKETING_VERSION",
        build_meta
            .as_ref()
            .and_then(|meta| meta.get("marketingVersion"))
            .and_then(|value| value.as_str())
            .unwrap_or(env!("CARGO_PKG_VERSION")),
    );
    set_rustc_env(
        "MYNAH_BUILD_BUNDLE_VERSION",
        build_meta
            .as_ref()
            .and_then(|meta| meta.get("bundleVersion"))
            .and_then(|value| value.as_str())
            .unwrap_or(env!("CARGO_PKG_VERSION")),
    );
    set_rustc_env(
        "MYNAH_BUILD_GIT_COMMIT_COUNT",
        build_meta
            .as_ref()
            .and_then(|meta| meta.get("gitCommitCount"))
            .map(|value| {
                value
                    .as_u64()
                    .map(|count| count.to_string())
                    .or_else(|| value.as_str().map(|count| count.to_string()))
                    .unwrap_or_else(|| "0".to_string())
            })
            .unwrap_or_else(|| "0".to_string())
            .as_str(),
    );
    set_rustc_env(
        "MYNAH_BUILD_GIT_COMMIT",
        build_meta
            .as_ref()
            .and_then(|meta| meta.get("gitCommit"))
            .and_then(|value| value.as_str())
            .unwrap_or("nogit"),
    );
    set_rustc_env(
        "MYNAH_BUILD_AT_ISO",
        build_meta
            .as_ref()
            .and_then(|meta| meta.get("builtAtIso"))
            .and_then(|value| value.as_str())
            .unwrap_or("unknown"),
    );
    set_rustc_env(
        "MYNAH_BUILD_SIGNATURE",
        build_meta
            .as_ref()
            .and_then(|meta| meta.get("buildSignature"))
            .and_then(|value| value.as_str())
            .unwrap_or(env!("CARGO_PKG_VERSION")),
    );
    set_rustc_env(
        "MYNAH_BUILD_GIT_DIRTY",
        build_meta
            .as_ref()
            .and_then(|meta| meta.get("gitDirty"))
            .and_then(|value| value.as_bool())
            .map(|value| if value { "true" } else { "false" })
            .unwrap_or("false"),
    );
    set_rustc_env(
        "MYNAH_BUILD_TARGET_ARCH",
        build_meta
            .as_ref()
            .and_then(|meta| meta.get("targetArch"))
            .and_then(|value| value.as_str())
            .unwrap_or(std::env::consts::ARCH),
    );
    set_rustc_env(
        "MYNAH_TRIAL_HMAC_KEY_RESOLVED",
        resolve_trial_hmac_key().as_str(),
    );

    // Compile Swift package and link it on macOS
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    if target_os == "macos" {
        println!("cargo:rerun-if-changed=swift/MynahFM/Sources/MynahFM/Availability.swift");
        println!("cargo:rerun-if-changed=swift/MynahFM/Package.swift");

        let swift_dir = manifest_dir.join("swift/MynahFM");
        let target = env::var("TARGET").unwrap_or_default();
        let profile = env::var("PROFILE").unwrap_or_default();
        let configuration = if profile == "release" { "release" } else { "debug" };
        let arch = if target.starts_with("aarch64") {
            "arm64"
        } else {
            "x86_64"
        };
        let triple = format!("{}-apple-macosx", arch);

        let status = std::process::Command::new("swift")
            .args(&[
                "build",
                "-c",
                configuration,
                "--triple",
                &triple,
            ])
            .current_dir(&swift_dir)
            .status()
            .expect("Failed to run swift build");

        if !status.success() {
            panic!("Swift build failed");
        }

        let build_dir = swift_dir
            .join(".build")
            .join(&triple)
            .join(configuration);

        println!("cargo:rustc-link-search=native={}", build_dir.display());
        println!("cargo:rustc-link-lib=static=MynahFM");

        // Link Swift runtime libraries dynamically
        let mut runtime_linked = false;
        if let Ok(output) = std::process::Command::new("swift")
            .arg("-print-target-info")
            .output()
        {
            if let Ok(info) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                if let Some(paths) = info["paths"]["runtimeLibraryPaths"].as_array() {
                    for path in paths {
                        if let Some(path_str) = path.as_str() {
                            println!("cargo:rustc-link-search=native={}", path_str);
                            runtime_linked = true;
                        }
                    }
                }
            }
        }

        if !runtime_linked {
            println!("cargo:rustc-link-search=native=/usr/lib/swift");
            println!("cargo:rustc-link-search=native=/Library/Developer/CommandLineTools/usr/lib/swift/macosx");
        }

        // Weak-link FoundationModels framework so the app doesn't crash on macOS < 26.0
        println!("cargo:rustc-link-arg=-weak_framework");
        println!("cargo:rustc-link-arg=FoundationModels");

        // Add rpath for Swift runtime libraries to prevent dyld loading crashes
        println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");
        println!("cargo:rustc-link-arg=-Wl,-rpath,/Library/Developer/CommandLineTools/usr/lib/swift/macosx");
    }

    tauri_build::build()
}

fn set_rustc_env(key: &str, value: &str) {
    println!("cargo:rustc-env={}={}", key, value.replace('\n', ""));
}

fn resolve_trial_hmac_key() -> String {
    const DEV_FALLBACK_KEY: &str = "mynah-dev-only-trial-hmac-key-do-not-ship";

    let trial_mode = env::var("MYNAH_TRIAL_MODE").unwrap_or_default();
    let is_trial_build = trial_mode == "true";
    let is_release_build = env::var("PROFILE")
        .map(|profile| profile == "release")
        .unwrap_or(false);
    let provided_key = env::var("MYNAH_TRIAL_HMAC_KEY")
        .ok()
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty());

    if let Some(key) = provided_key {
        return key;
    }

    if is_trial_build && is_release_build {
        panic!("MYNAH_TRIAL_HMAC_KEY is required for Trial release builds");
    }

    if !is_release_build {
        println!(
            "cargo:warning=Using development-only Mynah trial HMAC key; set MYNAH_TRIAL_HMAC_KEY for release Trial builds"
        );
    }

    DEV_FALLBACK_KEY.to_string()
}
