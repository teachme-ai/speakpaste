cask "mynah" do
  version "0.1.0"
  sha256 :no_check # Set to the exact SHA256 checksum of your compiled universal dmg file in production

  url "https://github.com/teachme-ai/speakpaste/releases/download/v#{version}/Mynah_#{version}_universal.dmg"
  name "Mynah"
  desc "Local-first voice dictation and text-transformation utility"
  homepage "https://github.com/teachme-ai/speakpaste"

  depends_on macos: ">= :catalina"

  app "Mynah.app"

  caveats <<~EOS
    Mynah is distributed outside the paid Apple Developer Program.
    To open the application without macOS Gatekeeper warnings, please run:

      xattr -d com.apple.quarantine /Applications/Mynah.app

    Alternatively, Right-Click (Control-Click) the application in Finder and select "Open" to permanently authorize execution.
  EOS

  zap trash: [
    "~/Library/Application Support/com.mynah.app",
    "~/Library/Application Support/com.mynah.app.dev",
    "~/Library/Preferences/com.mynah.app.plist",
    "~/Library/Saved Application State/com.mynah.app.savedState",
    "~/Library/Logs/com.mynah.app",
  ]
end
