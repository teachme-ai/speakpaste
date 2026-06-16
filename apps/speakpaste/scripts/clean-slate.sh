#!/bin/bash

# Configuration
BUNDLE_ID="com.mynah.app"
APP_NAME="Mynah"

echo "=== Starting Clean-Slate Purge for $APP_NAME ==="

# 1. Kill any active processes
echo "Stopping active instances..."
osascript -e "tell application \"$APP_NAME\" to quit" 2>/dev/null
killall "$APP_NAME" 2>/dev/null || true

# 2. Delete macOS Preferences (via Defaults system to flush cfprefsd cache)
echo "Resetting defaults preferences..."
defaults delete "$BUNDLE_ID" 2>/dev/null || true
# Force flush preference daemon
killall cfprefsd 2>/dev/null || true

# 3. Clean Filesystem Directories
echo "Clearing application files..."
rm -rf "$HOME/Library/Application Support/$APP_NAME"
rm -rf "$HOME/Library/Application Support/$BUNDLE_ID"
rm -rf "$HOME/Library/Caches/$BUNDLE_ID"
rm -rf "$HOME/Library/Caches/com.apple.WebKit.WebContent"
rm -rf "$HOME/Library/Saved Application State/$BUNDLE_ID.savedState"
rm -rf "$HOME/Library/WebKit/$BUNDLE_ID"

# 4. Remove Keychain Items
echo "Deleting credentials/tokens from Keychain..."
security delete-generic-password -s "$APP_NAME" 2>/dev/null || true
security delete-generic-password -l "$APP_NAME" 2>/dev/null || true

# 5. Reset Privacy / Permissions (TCC)
# Resets Accessibility, Microphone, and other prompts so they appear like a first-run
echo "Resetting macOS TCC permissions..."
tccutil reset Accessibility "$BUNDLE_ID" 2>/dev/null || true
tccutil reset Microphone "$BUNDLE_ID" 2>/dev/null || true
tccutil reset All "$BUNDLE_ID" 2>/dev/null || true

echo "=== System is 100% clean for $APP_NAME ==="
