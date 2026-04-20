import { createWriteStream, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { execFileSync } from 'child_process';
import { homedir } from 'os';
import { getLatestArtifact, type OsdArtifact } from './manifest.js';

export const OSD_HOME = join(homedir(), '.osd-desktop');
export const OSD_DIR = join(OSD_HOME, 'osd');

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percent: number;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export function isOsdInstalled(): boolean {
  return existsSync(join(OSD_DIR, 'bin'));
}

export async function downloadAndInstall(
  onProgress?: ProgressCallback,
): Promise<void> {
  const artifact = await getLatestArtifact();
  if (!artifact) {
    throw new Error('No OSD download available for this platform. Please install OpenSearch Dashboards manually and use "Browse for existing..." to select it.');
  }
  if (!artifact.url) {
    throw new Error('No OSD download available for this platform. Please install OpenSearch Dashboards manually and use "Browse for existing..." to select it.');
  }
  mkdirSync(OSD_HOME, { recursive: true });

  const tmpFile = join(OSD_HOME, `osd-download.${artifact.format}`);

  try {
    await download(artifact.url, tmpFile, artifact.size, onProgress);
    
    await extract(tmpFile, artifact.format);
  } finally {
    if (existsSync(tmpFile)) rmSync(tmpFile);
  }
}

async function download(
  url: string,
  dest: string,
  totalBytes: number,
  onProgress?: ProgressCallback,
): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);

  const total = Number(res.headers.get('content-length')) || totalBytes;
  let downloaded = 0;
  const fileStream = createWriteStream(dest);

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fileStream.write(value);
    downloaded += value.length;
    onProgress?.({
      bytesDownloaded: downloaded,
      totalBytes: total,
      percent: total ? (downloaded / total) * 100 : 0,
    });
  }

  await new Promise<void>((resolve, reject) => {
    fileStream.end(() => resolve());
    fileStream.on('error', reject);
  });
}

async function verifySha256(
  filePath: string,
  expected: string,
): Promise<void> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(filePath), hash);
  const actual = hash.digest('hex');
  if (actual !== expected) {
    rmSync(filePath);
    throw new Error(`SHA-256 mismatch: expected ${expected}, got ${actual}`);
  }
}

async function extract(
  archivePath: string,
  format: 'tar.gz' | 'zip',
): Promise<void> {
  if (existsSync(OSD_DIR)) rmSync(OSD_DIR, { recursive: true });
  mkdirSync(OSD_DIR, { recursive: true });

  if (format === 'tar.gz') {
    execFileSync('tar', ['-xzf', archivePath, '-C', OSD_DIR, '--strip-components=1'], {
      stdio: 'pipe',
    });
  } else {
    execFileSync('unzip', ['-q', archivePath, '-d', OSD_DIR], { stdio: 'pipe' });
  }
}
