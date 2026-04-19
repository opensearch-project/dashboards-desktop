cask "opensearch-dashboards-desktop" do
  version :latest
  sha256 :no_check

  url "https://github.com/opensearch-project/dashboards-desktop/releases/latest/download/OpenSearch-Dashboards-Desktop-#{arch}.dmg"
  name "OpenSearch Dashboards Desktop"
  desc "Agent-first desktop app for OpenSearch and Elasticsearch"
  homepage "https://github.com/opensearch-project/dashboards-desktop"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "OpenSearch Dashboards Desktop.app"

  zap trash: [
    "~/.osd",
    "~/Library/Application Support/dashboards-desktop",
    "~/Library/Preferences/org.opensearch.dashboards-desktop.plist",
    "~/Library/Logs/dashboards-desktop",
  ]
end
