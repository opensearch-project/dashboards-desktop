# Testing on Cloud Instances (macOS & Windows)

If you don't have local access to macOS or Windows, you can use AWS EC2 instances to build and test OSD Desktop.

---

## macOS Testing (EC2 Mac Instances)

### Launch a Mac Instance

1. Allocate a Dedicated Host in the AWS Console:
   - Go to EC2 → Dedicated Hosts → Allocate
   - Instance family: `mac2` (Apple Silicon) or `mac1` (Intel)
   - Availability Zone: pick one with capacity (us-east-1a typically works)
   - Note: Dedicated Hosts have a **24-hour minimum allocation**

2. Launch an instance on the host:
   - AMI: search for "macOS Sonoma" (arm64 for mac2, x86_64 for mac1)
   - Instance type: `mac2.metal` or `mac1.metal`
   - Key pair: create or select one for SSH access
   - Security group: allow SSH (22) and VNC (5900) from your IP

3. Connect via SSH:
   ```bash
   ssh -i your-key.pem ec2-user@<instance-ip>
   ```

4. Enable VNC for GUI access:
   ```bash
   sudo /System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart \
     -activate -configure -access -on \
     -restart -agent -privs -all
   sudo passwd ec2-user  # Set a password for VNC login
   ```

5. Connect via VNC: `vnc://<instance-ip>:5900`

### Build and Test

```bash
# Install Node 20
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.zshrc
nvm install 20

# Clone and build
git clone https://github.com/opensearch-project/dashboards-desktop.git
cd dashboards-desktop
git checkout rfc-2026-agent-first-reboot
npm ci
npm run build:ts
npx electron-builder --mac

# The .dmg is in dist/
open dist/*.dmg
```

### Cleanup

Release the Dedicated Host when done to stop billing:
- EC2 → Dedicated Hosts → select host → Actions → Release

---

## Windows Testing (EC2 Windows Instances)

### Launch a Windows Instance

1. Launch an EC2 instance:
   - AMI: "Windows Server 2022 Base" (with Desktop Experience)
   - Instance type: `t3.large` (2 vCPU, 8 GB RAM) or larger
   - Key pair: create or select one (needed to decrypt RDP password)
   - Security group: allow RDP (3389) from your IP
   - Storage: 50 GB minimum (Node + Electron + build artifacts)

2. Get RDP credentials:
   - EC2 → Instances → select instance → Connect → RDP client
   - Decrypt password using your key pair

3. Connect via Remote Desktop (RDP) using the public IP and credentials

### Build and Test

Open PowerShell as Administrator:

```powershell
# Install Node 20
winget install OpenJS.NodeJS.LTS

# Or download from https://nodejs.org/en/download/

# Clone and build
git clone https://github.com/opensearch-project/dashboards-desktop.git
cd dashboards-desktop
git checkout rfc-2026-agent-first-reboot
npm ci
npm run build:ts
npx electron-builder --win

# The installer is in dist/
# Run the .exe to install and test
```

### Cleanup

Terminate the instance when done:
- EC2 → Instances → select instance → Instance state → Terminate

---

## Linux Testing (EC2 Linux with Desktop)

For testing the Linux build with a GUI:

1. Launch an Ubuntu 22.04 instance (`t3.large` or larger)
2. Install a desktop environment:
   ```bash
   sudo apt update
   sudo apt install -y ubuntu-desktop xrdp
   sudo systemctl enable xrdp
   sudo passwd ubuntu  # Set password for RDP
   ```
3. Connect via RDP on port 3389
4. Build and test:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
   source ~/.bashrc
   nvm install 20
   git clone https://github.com/opensearch-project/dashboards-desktop.git
   cd dashboards-desktop
   git checkout rfc-2026-agent-first-reboot
   npm ci
   npm run build:ts
   npx electron-builder --linux
   # Run the AppImage
   chmod +x dist/*.AppImage
   ./dist/*.AppImage
   ```

---

## Cost Estimates

| Instance | Type | Approx. Cost | Notes |
|----------|------|-------------|-------|
| macOS (Apple Silicon) | mac2.metal | ~$1.08/hr ($26/day) | 24-hour minimum Dedicated Host |
| macOS (Intel) | mac1.metal | ~$1.08/hr ($26/day) | 24-hour minimum Dedicated Host |
| Windows | t3.large | ~$0.10/hr ($2.40/day) | On-demand, terminate anytime |
| Linux | t3.large | ~$0.08/hr ($1.92/day) | On-demand, terminate anytime |

> **Tip:** Terminate instances and release Dedicated Hosts as soon as testing is complete to minimize cost.

---

## What to Test

Once the app is built and running, verify:

- [ ] App launches without crash
- [ ] Onboarding wizard appears on first launch
- [ ] Can skip all onboarding steps and reach homepage
- [ ] Add an OpenSearch or Elasticsearch connection (use a test cluster or skip)
- [ ] Cmd+K / Ctrl+K opens the chat panel
- [ ] Cmd+Shift+Enter toggles fullscreen chat
- [ ] Chat panel shows placeholder message (agent runtime is M2)
- [ ] Workspace create / switch / delete works
- [ ] Window resize and minimum size handling
- [ ] App quits cleanly (no orphan processes)

Report issues at: [GitHub Issues](https://github.com/opensearch-project/dashboards-desktop/issues)
