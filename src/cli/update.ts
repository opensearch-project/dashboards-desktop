import { checkForUpdate, type Channel } from '../core/updates/update-checker';
import { downloadUpdate } from '../core/updates/update-downloader';
import { installBundleUpdate, triggerShellUpdate } from '../core/updates/update-installer';
import { rollback, hasBackup } from '../core/updates/rollback';
import { execFileSync } from 'child_process';

const CURRENT_VERSION = process.env.npm_package_version ?? '0.1.0';

export async function handleUpdateCommand(args: string[]): Promise<void> {
  const flags = parseFlags(args);

  if (flags.rollback) return doRollback();
  if (flags.fromSource) return doSourceBuild(flags.branch, flags.tag);
  if (flags.check) return doCheck(flags.channel);
  // Default: check + download + install
  return doUpdate(flags.channel);
}

async function doCheck(channel: Channel): Promise<void> {
  console.log(`Checking for updates (channel: ${channel})...`);
  const release = await checkForUpdate(CURRENT_VERSION, channel);
  if (!release) {
    console.log(`✅ You're on the latest version (${CURRENT_VERSION})`);
    return;
  }
  console.log(`🆕 Update available: ${release.version} (${release.channel})`);
  console.log(`   Published: ${release.publishedAt}`);
  console.log(`   Run: osd update --channel ${channel}`);
}

async function doUpdate(channel: Channel): Promise<void> {
  console.log(`Checking for updates (channel: ${channel})...`);
  const release = await checkForUpdate(CURRENT_VERSION, channel);
  if (!release) {
    console.log(`✅ Already up to date (${CURRENT_VERSION})`);
    return;
  }

  console.log(`Downloading ${release.version}...`);
  const platform =
    process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const assetName = `osd-bundle-${platform}-${arch}.tar.gz`;

  const download = await downloadUpdate(release, assetName, (pct) => {
    process.stdout.write(`\r  Progress: ${pct}%`);
  });
  console.log('');

  if (!download.signatureValid) {
    console.warn('⚠️  GPG signature could not be verified (gpg not available or key not imported)');
  }
  console.log(`  SHA-256: ${download.sha256}`);

  console.log('Installing...');
  const result = await installBundleUpdate(download, release.version);
  if (!result.success) {
    console.error(`❌ Installation failed: ${result.error}`);
    process.exit(1);
  }

  console.log(`✅ Updated to ${release.version}`);
  console.log('   Restart the app to apply changes.');

  // Also check for shell updates via electron-updater
  triggerShellUpdate();
}

function doRollback(): void {
  if (!hasBackup()) {
    console.error('No previous version available for rollback.');
    process.exit(1);
  }
  const result = rollback();
  if (result.success) {
    console.log('✅ Rolled back to previous version. Restart to apply.');
  } else {
    console.error(`❌ Rollback failed: ${result.error}`);
    process.exit(1);
  }
}

function doSourceBuild(branch?: string, tag?: string): void {
  console.log('⚠️  Source builds are for contributors only.');
  const ref = tag ?? branch ?? 'main';
  console.log(`Building from ${tag ? `tag ${tag}` : `branch ${ref}`}...`);
  try {
    execFileSync('git', ['fetch', 'origin'], { stdio: 'inherit' });
    execFileSync('git', ['checkout', ref], { stdio: 'inherit' });
    execFileSync('npm', ['install'], { stdio: 'inherit' });
    execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
    console.log('✅ Source build complete.');
  } catch {
    console.error('❌ Source build failed.');
    process.exit(1);
  }
}

interface Flags {
  check: boolean;
  channel: Channel;
  fromSource: boolean;
  rollback: boolean;
  branch?: string;
  tag?: string;
}

function parseFlags(args: string[]): Flags {
  const flags: Flags = { check: false, channel: 'stable', fromSource: false, rollback: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--check':
        flags.check = true;
        break;
      case '--channel':
        flags.channel = (args[++i] as Channel) ?? 'stable';
        break;
      case '--from-source':
        flags.fromSource = true;
        break;
      case '--rollback':
        flags.rollback = true;
        break;
      case '--branch':
        flags.branch = args[++i];
        break;
      case '--tag':
        flags.tag = args[++i];
        break;
    }
  }
  return flags;
}
