/**
 * osd connect — manage data source connections from CLI.
 */

import { initDatabase, addConnection, listConnections, deleteConnection } from '../core/storage';
import { testConnection } from '../core/connections';
import * as path from 'path';
import * as os from 'os';

const DB_PATH = path.join(os.homedir(), '.osd', 'osd.db');

export async function handleConnectCommand(args: string[]): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'add': return connectAdd(args.slice(1));
    case 'list': return connectList();
    case 'test': return connectTest(args.slice(1));
    case 'remove': return connectRemove(args[1]);
    default:
      console.log('Usage: osd connect <add|list|test|remove>');
      console.log('  osd connect add --name prod --url https://... --type opensearch --auth basic');
      console.log('  osd connect list');
      console.log('  osd connect test <name>');
      console.log('  osd connect remove <name>');
  }
}

function connectAdd(args: string[]): void {
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    if (key && args[i + 1]) opts[key] = args[i + 1];
  }

  if (!opts.name || !opts.url || !opts.type) {
    console.error('Required: --name, --url, --type (opensearch|elasticsearch)');
    process.exit(1);
  }

  const db = initDatabase(DB_PATH);
  const id = addConnection(db, {
    name: opts.name,
    url: opts.url,
    type: opts.type,
    auth_type: opts.auth ?? 'none',
    workspace_id: 'default',
    username: opts.username,
    region: opts.region,
  });
  db.close();
  console.log(`✅ Connection "${opts.name}" added (${id})`);
}

function connectList(): void {
  const db = initDatabase(DB_PATH);
  const conns = listConnections(db) as Array<{ name: string; url: string; type: string; auth_type: string }>;
  db.close();

  if (conns.length === 0) { console.log('No connections saved.'); return; }
  console.log('\nConnections:\n');
  for (const c of conns) {
    console.log(`  ${c.name} — ${c.url} (${c.type}, ${c.auth_type})`);
  }
  console.log('');
}

async function connectTest(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) { console.error('Usage: osd connect test <name>'); process.exit(1); }

  const db = initDatabase(DB_PATH);
  const conns = listConnections(db) as Array<{ name: string; url: string; type: string; auth_type: string }>;
  db.close();

  const conn = conns.find((c) => c.name === name);
  if (!conn) { console.error(`Connection "${name}" not found.`); process.exit(1); }

  console.log(`Testing ${conn.name} (${conn.url})...`);
  const result = await testConnection({ ...conn, type: conn.type as 'opensearch' | 'elasticsearch', auth_type: conn.auth_type as 'basic' | 'apikey' | 'aws-sigv4' | 'none' });

  if (result.success) {
    console.log(`✅ Connected — ${result.cluster_name} v${result.version}`);
  } else {
    console.error(`❌ Failed — ${result.error}`);
    process.exit(1);
  }
}

function connectRemove(name: string): void {
  if (!name) { console.error('Usage: osd connect remove <name>'); process.exit(1); }

  const db = initDatabase(DB_PATH);
  const conns = listConnections(db) as Array<{ id: string; name: string }>;
  const conn = conns.find((c) => c.name === name);
  if (!conn) { db.close(); console.error(`Connection "${name}" not found.`); process.exit(1); }

  deleteConnection(db, conn.id);
  db.close();
  console.log(`✅ Connection "${name}" removed.`);
}
