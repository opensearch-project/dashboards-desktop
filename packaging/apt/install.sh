#!/bin/bash
# Install OpenSearch Dashboards Desktop via apt
# Usage: curl -fsSL https://raw.githubusercontent.com/opensearch-project/dashboards-desktop/main/packaging/apt/install.sh | bash

set -euo pipefail

REPO="opensearch-project/dashboards-desktop"
GPG_KEY_URL="https://github.com/${REPO}/raw/main/packaging/apt/pubkey.gpg"
REPO_LIST="/etc/apt/sources.list.d/osd-desktop.list"
KEYRING="/usr/share/keyrings/osd-desktop-archive-keyring.gpg"

echo "📦 Installing OpenSearch Dashboards Desktop..."

# Import GPG key
curl -fsSL "$GPG_KEY_URL" | sudo gpg --dearmor -o "$KEYRING"

# Add repository
echo "deb [signed-by=${KEYRING}] https://github.com/${REPO}/releases/latest/download ./" | sudo tee "$REPO_LIST" > /dev/null

# Install
sudo apt-get update
sudo apt-get install -y opensearch-dashboards-desktop

echo "✅ Installed. Run: osd-desktop"
