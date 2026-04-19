#!/bin/bash
# Run on macOS or Windows test instance after SSH/RDP
# Installs Node 20, clones repo, builds, and prepares for GUI testing
set -e

echo "=== OSD Desktop Test Instance Setup ==="

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  PLATFORM="mac"
  BUILD_FLAG="--mac"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OS" == "Windows_NT" ]]; then
  PLATFORM="win"
  BUILD_FLAG="--win"
else
  PLATFORM="linux"
  BUILD_FLAG="--linux"
fi
echo "Platform: $PLATFORM"

# Install Node 20 via nvm
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  echo "Installing Node 20..."
  if [[ "$PLATFORM" == "win" ]]; then
    # Windows: download installer
    curl -o node-setup.msi "https://nodejs.org/dist/v20.20.2/node-v20.20.2-x64.msi"
    msiexec /i node-setup.msi /qn
  else
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
  fi
fi
echo "Node: $(node -v)"

# Clone and build
if [ ! -d "dashboards-desktop" ]; then
  git clone https://github.com/opensearch-project/dashboards-desktop.git
fi
cd dashboards-desktop
git checkout rfc-2026-agent-first-reboot
git pull origin rfc-2026-agent-first-reboot

echo "Installing dependencies..."
npm ci

echo "Building TypeScript..."
npm run build:ts

echo "Building Electron app..."
npx electron-builder $BUILD_FLAG --dir

echo ""
echo "=== BUILD COMPLETE ==="
echo "App location: dist/"
ls -la dist/

if [[ "$PLATFORM" == "mac" ]]; then
  echo ""
  echo "To test: open dist/mac-arm64/*.app"
  echo "Or enable VNC: System Preferences → Sharing → Screen Sharing"
elif [[ "$PLATFORM" == "win" ]]; then
  echo ""
  echo "To test: run dist\\win-unpacked\\OpenSearch Dashboards Desktop.exe"
fi
