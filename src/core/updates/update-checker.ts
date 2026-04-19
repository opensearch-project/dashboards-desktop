import * as https from 'https';

export type Channel = 'stable' | 'beta' | 'nightly';

export interface ReleaseInfo {
  version: string;
  channel: Channel;
  url: string;
  assets: { name: string; url: string; size: number }[];
  notes: string;
  publishedAt: string;
}

const REPO_OWNER = 'opensearch-project';
const REPO_NAME = 'dashboards-desktop';

/** Check GitHub Releases for a newer version on the given channel */
export async function checkForUpdate(
  currentVersion: string,
  channel: Channel = 'stable',
): Promise<ReleaseInfo | null> {
  const releases = await fetchReleases();
  const candidates = releases
    .filter((r) => matchesChannel(r.tag_name, channel))
    .filter((r) => isNewer(r.tag_name, currentVersion));

  if (!candidates.length) return null;

  const latest = candidates[0];
  return {
    version: latest.tag_name.replace(/^v/, ''),
    channel,
    url: latest.html_url,
    assets: latest.assets.map((a: GHAsset) => ({
      name: a.name,
      url: a.browser_download_url,
      size: a.size,
    })),
    notes: latest.body ?? '',
    publishedAt: latest.published_at,
  };
}

function matchesChannel(tag: string, channel: Channel): boolean {
  if (channel === 'nightly') return tag.includes('nightly');
  if (channel === 'beta') return tag.includes('beta') || tag.includes('rc');
  // stable = no prerelease suffix
  return (
    !tag.includes('nightly') &&
    !tag.includes('beta') &&
    !tag.includes('rc') &&
    !tag.includes('alpha')
  );
}

function isNewer(tag: string, current: string): boolean {
  const v = tag.replace(/^v/, '').replace(/-.+$/, '');
  const c = current.replace(/^v/, '').replace(/-.+$/, '');
  const [aM, am, ap] = v.split('.').map(Number);
  const [bM, bm, bp] = c.split('.').map(Number);
  return aM > bM || (aM === bM && (am > bm || (am === bm && (ap ?? 0) > (bp ?? 0))));
}

interface GHAsset {
  name: string;
  browser_download_url: string;
  size: number;
}
interface GHRelease {
  tag_name: string;
  html_url: string;
  body: string;
  published_at: string;
  assets: GHAsset[];
  prerelease: boolean;
}

function fetchReleases(): Promise<GHRelease[]> {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases?per_page=20`,
      headers: { 'User-Agent': 'osd-updater', Accept: 'application/vnd.github+json' },
    };
    https
      .get(opts, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}
