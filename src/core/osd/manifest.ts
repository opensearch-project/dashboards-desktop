import { platform, arch } from 'os';
import { readFileSync } from 'fs';
import { join } from 'path';

export const RELEASES_API = 'https://api.github.com/repos/opensearch-project/OpenSearch-Dashboards/releases';
export const ARTIFACTS_BASE = 'https://artifacts.opensearch.org/releases/core/opensearch-dashboards';

export interface OsdArtifact {
  url: string;
  version: string;
  size: number;
  format: 'tar.gz' | 'zip';
}

export function getPlatformKey(): string {
  const p = platform();
  const a = arch() === 'arm64' ? 'arm64' : 'x64';
  return `${p}-${a}`;
}

/**
 * Fetches the latest 3.x release version from GitHub API.
 */
export async function getLatestVersion(): Promise<string> {
  const res = await fetch(RELEASES_API + '?per_page=20', {
    headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'osd-desktop' },
  });
  if (!res.ok) throw new Error(`Failed to fetch releases: ${res.status}`);
  const releases = await res.json() as Array<{ tag_name: string; prerelease: boolean; draft: boolean }>;
  const stable = releases.find(r => !r.prerelease && !r.draft && r.tag_name.match(/^\d+\.\d+\.\d+$/));
  if (!stable) throw new Error('No stable release found');
  return stable.tag_name;
}

/**
 * Builds the artifact URL for the given version and platform.
 * Returns null if no artifact available for this platform.
 */
export function buildArtifactUrl(version: string, platformKey?: string): OsdArtifact | null {
  const key = platformKey ?? getPlatformKey();
  const [os, arch] = key.split('-');

  // Only linux min builds are available on artifacts.opensearch.org
  if (os === 'linux') {
    return {
      url: `${ARTIFACTS_BASE}/${version}/opensearch-dashboards-min-${version}-linux-${arch}.tar.gz`,
      version,
      size: arch === 'x64' ? 217_000_000 : 200_000_000,
      format: 'tar.gz',
    };
  }

  // macOS and Windows — no min builds available yet
  return null;
}

/**
 * Gets the best available artifact for this platform.
 * Fetches latest version dynamically.
 */
export async function getLatestArtifact(): Promise<OsdArtifact | null> {
  const version = await getLatestVersion();
  return buildArtifactUrl(version);
}

export function loadLocalManifest(resourcesPath: string): Record<string, OsdArtifact> {
  const p = join(resourcesPath, 'osd-setup', 'manifest.json');
  return JSON.parse(readFileSync(p, 'utf-8')).artifacts;
}
