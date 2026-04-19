import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';
import type { ReleaseInfo } from './update-checker';

const DOWNLOAD_DIR = path.join(process.env.HOME ?? '~', '.osd', 'updates');

export interface DownloadResult {
  filePath: string;
  signatureValid: boolean;
  sha256: string;
}

/** Download an OSD bundle asset and verify its GPG signature */
export async function downloadUpdate(
  release: ReleaseInfo,
  assetName: string,
  onProgress?: (pct: number) => void,
): Promise<DownloadResult> {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) throw new Error(`Asset '${assetName}' not found in release ${release.version}`);

  const filePath = path.join(DOWNLOAD_DIR, asset.name);
  await downloadFile(asset.url, filePath, asset.size, onProgress);

  const sha256 = hashFile(filePath);

  // Try to verify GPG signature if .sig asset exists
  const sigAsset = release.assets.find((a) => a.name === `${assetName}.sig`);
  let signatureValid = false;
  if (sigAsset) {
    const sigPath = path.join(DOWNLOAD_DIR, sigAsset.name);
    await downloadFile(sigAsset.url, sigPath, sigAsset.size);
    signatureValid = verifyGpgSignature(filePath, sigPath);
  }

  return { filePath, signatureValid, sha256 };
}

function downloadFile(
  url: string,
  dest: string,
  totalSize: number,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u: string) => {
      https
        .get(u, { headers: { 'User-Agent': 'osd-updater' } }, (res) => {
          if (res.statusCode === 302 || res.statusCode === 301) {
            return get(res.headers.location!);
          }
          let downloaded = 0;
          res.on('data', (chunk: Buffer) => {
            downloaded += chunk.length;
            if (onProgress && totalSize > 0) onProgress(Math.round((downloaded / totalSize) * 100));
          });
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        })
        .on('error', (e) => {
          fs.unlinkSync(dest);
          reject(e);
        });
    };
    get(url);
  });
}

function hashFile(filePath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

/** Verify GPG detached signature — returns false if gpg not available */
function verifyGpgSignature(filePath: string, sigPath: string): boolean {
  try {
    execFileSync('gpg', ['--verify', sigPath, filePath], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
