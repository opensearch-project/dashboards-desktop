import * as https from 'https';

export interface RegistryEntry {
  name: string;
  version: string;
  description: string;
  downloadUrl: string;
  source: 'github' | 'npm';
}

const GITHUB_ORG = 'opensearch-project';
const PLUGIN_TOPIC = 'osd-plugin';

/** Search for plugins on GitHub by topic */
export async function searchGitHub(query?: string): Promise<RegistryEntry[]> {
  const q = encodeURIComponent(`topic:${PLUGIN_TOPIC} ${query ?? ''}`.trim());
  const data = await httpGet(`https://api.github.com/search/repositories?q=${q}&per_page=20`);
  const parsed = JSON.parse(data);

  return (parsed.items ?? []).map((repo: GHRepo) => ({
    name: repo.name,
    version: 'latest',
    description: repo.description ?? '',
    downloadUrl: `https://github.com/${repo.full_name}/releases/latest`,
    source: 'github' as const,
  }));
}

/** Search npm for OSD plugins */
export async function searchNpm(query?: string): Promise<RegistryEntry[]> {
  const q = encodeURIComponent(`osd-plugin ${query ?? ''}`.trim());
  const data = await httpGet(`https://registry.npmjs.org/-/v1/search?text=${q}&size=20`);
  const parsed = JSON.parse(data);

  return (parsed.objects ?? []).map((obj: NpmResult) => ({
    name: obj.package.name,
    version: obj.package.version,
    description: obj.package.description ?? '',
    downloadUrl: `https://www.npmjs.com/package/${obj.package.name}`,
    source: 'npm' as const,
  }));
}

/** Search both registries */
export async function search(query?: string): Promise<RegistryEntry[]> {
  const [gh, npm] = await Promise.allSettled([searchGitHub(query), searchNpm(query)]);
  return [
    ...(gh.status === 'fulfilled' ? gh.value : []),
    ...(npm.status === 'fulfilled' ? npm.value : []),
  ];
}

interface GHRepo { name: string; full_name: string; description: string }
interface NpmResult { package: { name: string; version: string; description: string } }

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'osd-registry' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
