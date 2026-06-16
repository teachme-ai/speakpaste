#!/bin/bash

# Configuration
BASE_VM_NAME="clean-macos"
TEST_VM_NAME="test-env"
APP_NAME="Mynah"

echo "=== Starting Virtualized Isolation Runner for $APP_NAME ==="

# 1. Check if Tart is installed
if ! command -v tart &> /dev/null; then
    echo "Error: 'tart' is not installed."
    echo "Please install Tart by running:"
    echo "  brew install cirruslabs/cli/tart"
    exit 1
fi

# 2. Find the build output (.dmg or .app)
# Default search path is src-tauri/target
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAURI_TARGET_DIR="$SCRIPT_DIR/../src-tauri/target"

echo "Scanning for compiled DMG or App files in $TAURI_TARGET_DIR..."
if [ ! -d "$TAURI_TARGET_DIR" ]; then
    echo "Error: Target directory $TAURI_TARGET_DIR does not exist."
    echo "Please build the application first (e.g. bun run tauri build)."
    exit 1
fi

# Find all DMG files in release folders
DMG_PATHS=($(find "$TAURI_TARGET_DIR" -type f -name "*.dmg" -not -path "*/target/debug/*" 2>/dev/null))

TARGET_FILE=""
if [ ${#DMG_PATHS[@]} -eq 0 ]; then
    echo "No release DMG found. Scanning for .app bundles..."
    APP_PATHS=($(find "$TAURI_TARGET_DIR" -type d -name "$APP_NAME.app" -not -path "*/target/debug/*" 2>/dev/null))
    if [ ${#APP_PATHS[@]} -eq 0 ]; then
        echo "Error: No release DMG or .app bundle found in target directory."
        echo "Please build the application first (e.g. bun run tauri build)."
        exit 1
    else
        # Use the first found app bundle
        TARGET_FILE="${APP_PATHS[0]}"
        echo "Found App bundle: $TARGET_FILE"
    fi
else
    # Sort DMG files by modification time (newest first)
    # We will just pick the first one
    TARGET_FILE="${DMG_PATHS[0]}"
    echo "Found DMG installer: $TARGET_FILE"
fi

SHARED_DIR="$(dirname "$TARGET_FILE")"
SHARED_NAME="app_build"

# 3. Check for base VM image
echo "Checking Tart VM images..."
if ! tart list | grep -q "^$BASE_VM_NAME[[:space:]]"; then
    # Check if sequoia image is already pulled under a different name
    if tart list | grep -q "macos-sequoia"; then
        SEQUOIA_IMAGE=$(tart list | grep "macos-sequoia" | head -n 1 | awk '{print $1}')
        echo "Base VM '$BASE_VM_NAME' not found, but found existing image: $SEQUOIA_IMAGE"
        BASE_VM_NAME="$SEQUOIA_IMAGE"
    else
        echo "Base VM '$BASE_VM_NAME' not found."
        echo "Would you like to clone the latest macOS Sequoia image from ghcr.io? (y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo "Cloning macOS Sequoia (this may take a few minutes depending on connection)..."
            tart clone ghcr.io/cirruslabs/macos-sequoia-vanilla:latest "$BASE_VM_NAME"
        else
            echo "Error: Base VM is required to run the test."
            exit 1
        fi
    fi
fi

# 4. Clean up any existing test-env
if tart list | grep -q "^$TEST_VM_NAME[[:space:]]"; then
    echo "Deleting existing test-env VM..."
    tart delete "$TEST_VM_NAME"
fi

# 5. Clone base VM to test-env (instantaneous)
echo "Cloning $BASE_VM_NAME to $TEST_VM_NAME..."
tart clone "$BASE_VM_NAME" "$TEST_VM_NAME"

# 6. Run the VM and mount the shared directory
echo ""
echo "================================================================="
echo "  LAUNCHING PRISTINE macOS VM"
echo "================================================================="
echo "Inside the VM:"
echo "1. Open Finder and navigate to the sidebar under Locations."
echo "2. Select: /Volumes/$SHARED_NAME"
echo "3. You will find the installer file:"
echo "   $(basename "$TARGET_FILE")"
echo "4. Copy/Install the app and verify first-run behaviors (Gatekeeper, permissions)."
echo ""
echo "Note: Closing the VM window will stop the VM and delete it."
echo "================================================================="
echo ""

# Run VM with the shared directory
tart run --dir="$SHARED_NAME:$SHARED_DIR" "$TEST_VM_NAME"

# 7. Cleanup
echo "Cleaning up: deleting $TEST_VM_NAME VM..."
tart delete "$TEST_VM_NAME"
echo "=== Clean-slate VM verification finished ==="
