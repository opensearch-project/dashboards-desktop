cask "opensearch-dashboards-desktop" do
  version "0.5.0"
  sha256 :no_check # Updated per release

  url "https://github.com/opensearch-project/dashboards-desktop/releases/download/v#{version}/OpenSearch-Dashboards-Desktop-#{version}-arm64.dmg",
      verified: "github.com/opensearch-project/dashboards-desktop/"
  name "OpenSearch Dashboards Desktop"
  desc "Desktop app for OpenSearch Dashboards with AI agent chat"
  homepage "https://github.com/opensearch-project/dashboards-desktop"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true

  app "OpenSearch Dashboards Desktop.app"

  zap trash: [
    "~/.osd-desktop",
    "~/Library/Application Support/OpenSearch Dashboards Desktop",
    "~/Library/Preferences/com.opensearch.dashboards-desktop.plist",
    "~/Library/Caches/com.opensearch.dashboards-desktop",
  ]
end
