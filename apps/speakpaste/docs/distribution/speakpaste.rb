cask "speakpaste" do
  version "0.1.0"
  sha256 :no_check # Set to the exact SHA256 checksum of your compiled universal dmg file in production

  url "https://github.com/teachme-ai/speakpaste/releases/download/v#{version}/SpeakPaste_#{version}_universal.dmg"
  name "SpeakPaste"
  desc "Open-source, local-first voice dictation and text-transformation utility"
  homepage "https://github.com/teachme-ai/speakpaste"

  depends_on macos: ">= :catalina"

  app "SpeakPaste.app"

  caveats <<~EOS
    SpeakPaste is distributed outside the paid Apple Developer Program.
    To open the application without macOS Gatekeeper warnings, please run:

      xattr -d com.apple.quarantine /Applications/SpeakPaste.app

    Alternatively, Right-Click (Control-Click) the application in Finder and select "Open" to permanently authorize execution.
  EOS

  zap trash: [
    "~/Library/Application Support/com.speakpaste.app",
    "~/Library/Application Support/com.speakpaste.app.dev",
    "~/Library/Preferences/com.speakpaste.app.plist",
    "~/Library/Saved Application State/com.speakpaste.app.savedState",
    "~/Library/Logs/com.speakpaste.app",
  ]
end
