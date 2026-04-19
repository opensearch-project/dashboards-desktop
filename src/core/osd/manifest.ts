import { platform, arch } from 'os';
import { readFileSync } from 'fs';
import { join } from 'path';

export const OSD_VERSION = '3.6.0';

export interface OsdArtifact {
  url: string;
  sha256: string;
  size: number;
  format: 'tar.gz' | 'zip';
}

const ARTIFACTS_BASE =
  'https://artifacts.opensearch.org/releases/core/opensearch-dashboards';

const MANIFEST: Record<string, OsdArtifact> = {
  'linux-x64': {
    url: `${ARTIFACTS_BASE}/${OSD_VERSION}/opensearch-dashboards-min-${OSD_VERSION}-linux-x64.tar.gz`,
    sha256: '',
    size: 217769295,
    format: 'tar.gz',
  },
  'linux-arm64': {
    url: `${ARTIFACTS_BASE}/${OSD_VERSION}/opensearch-dashboards-min-${OSD_VERSION}-linux-arm64.tar.gz`,
    sha256: '',
    size: 0,
    format: 'tar.gz',
  },
  'win32-x64': {
    url: '',
    sha256: '',
    size: 0,
    format: 'zip',
  },
  'darwin-x64': {
    url: '',
    sha256: '',
    size: 0,
    format: 'tar.gz',
  },
  'darwin-arm64': {
    url: '',
    sha256: '',
    size: 0,
    format: 'tar.gz',
  },
};

export function getPlatformKey(): string {
  const p = platform();
  const a = arch() === 'arm64' ? 'arm64' : 'x64';
  return `${p}-${a}`;
}

export function getArtifact(key?: string): OsdArtifact {
  const k = key ?? getPlatformKey();
  const artifact = MANIFEST[k];
  if (!artifact) throw new Error(`No OSD artifact for platform: ${k}`);
  return artifact;
}

export function loadLocalManifest(resourcesPath: string): typeof MANIFEST {
  const p = join(resourcesPath, 'osd-setup', 'manifest.json');
  return JSON.parse(readFileSync(p, 'utf-8')).artifacts;
}
