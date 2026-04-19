/**
 * osd settings — manage app settings from CLI.
 */

import { initDatabase, getSetting, setSetting } from '../core/storage';
import * as path from 'path';
import * as os from 'os';

const DB_PATH = path.join(os.homedir(), '.osd', 'osd.db');

export function handleSettingsCommand(args: string[]): void {
  const sub = args[0];
  switch (sub) {
    case 'get':
      return settingsGet(args[1]);
    case 'set':
      return settingsSet(args[1], args[2]);
    case 'list':
      return settingsList();
    default:
      console.log('Usage: osd settings <get|set|list>');
      console.log('  osd settings get <key>');
      console.log('  osd settings set <key> <value>');
      console.log('  osd settings list');
  }
}

function settingsGet(key: string): void {
  if (!key) {
    console.error('Usage: osd settings get <key>');
    process.exit(1);
  }
  const db = initDatabase(DB_PATH);
  const val = getSetting(db, key);
  db.close();
  if (val === undefined) {
    console.log(`(not set)`);
  } else {
    console.log(val);
  }
}

function settingsSet(key: string, value: string): void {
  if (!key || value === undefined) {
    console.error('Usage: osd settings set <key> <value>');
    process.exit(1);
  }
  const db = initDatabase(DB_PATH);
  setSetting(db, key, value);
  db.close();
  console.log(`✅ ${key} = ${value}`);
}

function settingsList(): void {
  const db = initDatabase(DB_PATH);
  const rows = db.prepare('SELECT key, value FROM settings ORDER BY key').all() as Array<{
    key: string;
    value: string;
  }>;
  db.close();
  if (rows.length === 0) {
    console.log('No settings configured.');
    return;
  }
  console.log('\nSettings:\n');
  for (const r of rows) {
    console.log(`  ${r.key} = ${r.value}`);
  }
  console.log('');
}
