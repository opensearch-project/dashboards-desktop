import {
  installFromArchive,
  installFromNpm,
  uninstall,
  enable,
  disable,
  listPlugins,
} from '../core/plugins/manager';
import { search } from '../core/plugins/registry';

export async function handlePluginCommand(args: string[]): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'install':
      return pluginInstall(args[1]);
    case 'remove':
      return pluginRemove(args[1]);
    case 'list':
      return pluginList();
    case 'enable':
      return pluginEnable(args[1]);
    case 'disable':
      return pluginDisable(args[1]);
    case 'search':
      return pluginSearch(args.slice(1).join(' '));
    default:
      printUsage();
  }
}

function pluginInstall(target: string): void {
  if (!target) {
    console.error('Usage: osd plugin install <path|package>');
    process.exit(1);
  }

  try {
    const meta =
      target.endsWith('.zip') || target.endsWith('.tar.gz')
        ? installFromArchive(target)
        : installFromNpm(target);
    console.log(`✅ Installed plugin: ${meta.name} (${meta.version})`);
  } catch (err) {
    console.error(`❌ Install failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function pluginRemove(name: string): void {
  if (!name) {
    console.error('Usage: osd plugin remove <name>');
    process.exit(1);
  }
  try {
    uninstall(name);
    console.log(`Removed plugin: ${name}`);
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function pluginList(): void {
  const plugins = listPlugins();
  if (!plugins.length) {
    console.log('No plugins installed.');
    console.log('Install one: osd plugin install <package>');
    return;
  }
  console.log('Installed plugins:\n');
  for (const p of plugins) {
    const status = p.enabled ? '✅' : '⏸️';
    console.log(`  ${status} ${p.name} (${p.version}) — ${p.description}`);
  }
}

function pluginEnable(name: string): void {
  if (!name) {
    console.error('Usage: osd plugin enable <name>');
    process.exit(1);
  }
  enable(name);
  console.log(`Enabled plugin: ${name}`);
}

function pluginDisable(name: string): void {
  if (!name) {
    console.error('Usage: osd plugin disable <name>');
    process.exit(1);
  }
  disable(name);
  console.log(`Disabled plugin: ${name}`);
}

async function pluginSearch(query: string): Promise<void> {
  console.log(`Searching for plugins: ${query || '(all)'}...`);
  const results = await search(query || undefined);
  if (!results.length) {
    console.log('No plugins found.');
    return;
  }
  console.log(`\nFound ${results.length} plugin(s):\n`);
  for (const r of results) {
    console.log(`  📦 ${r.name} (${r.version}) [${r.source}]`);
    console.log(`     ${r.description}`);
    console.log(`     ${r.downloadUrl}\n`);
  }
}

function printUsage(): void {
  console.log(`Usage: osd plugin <command>

Commands:
  install <path|package>   Install a plugin from file or npm
  remove <name>            Remove an installed plugin
  list                     List installed plugins
  enable <name>            Enable a disabled plugin
  disable <name>           Disable a plugin
  search [query]           Search plugin registries`);
}
