import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Creates an isolated test SQLite database.
 * Returns the db instance and a cleanup function.
 *
 * Usage:
 *   const { db, dbPath, cleanup } = createTestDb();
 *   // ... use db ...
 *   cleanup();
 */
export function createTestDb() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-test-'));
  const dbPath = path.join(tmpDir, 'osd.db');

  // Lazy-require so tests work even if better-sqlite3 isn't compiled
  // sde's storage module will use this same pattern
  let db: any;
  try {
    const storage = require('../../src/core/storage');
    db = storage.initDatabase(dbPath);
  } catch {
    // If storage module doesn't exist yet, return null db
    db = null;
  }

  return {
    db,
    dbPath,
    tmpDir,
    cleanup: () => {
      if (db) db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}
