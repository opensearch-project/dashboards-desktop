/**
 * Differential updates — download only changed files using blockmap.
 *
 * electron-builder generates .blockmap files alongside each artifact.
 * These contain SHA-256 hashes of fixed-size blocks. By comparing
 * old vs new blockmap, we download only changed blocks.
 *
 * Falls back to full download if blockmap unavailable.
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const BLOCKMAP_DIR = join(homedir(), '.osd-desktop', 'blockmaps');

export interface BlockMap {
  version: string;
  files: { name: string; offset: number; size: number; sha256: string }[];
}

export interface DiffResult {
  changed: { name: string; offset: number; size: number }[];
  unchanged: number;
  totalBlocks: number;
  savedBytes: number;
}

/** Compare two blockmaps and return only changed blocks */
export function computeDiff(oldMap: BlockMap, newMap: BlockMap): DiffResult {
  const oldIndex = new Map(oldMap.files.map((f) => [f.name + ':' + f.offset, f.sha256]));
  const changed: DiffResult['changed'] = [];
  let unchanged = 0;
  let savedBytes = 0;

  for (const block of newMap.files) {
    const key = block.name + ':' + block.offset;
    const oldHash = oldIndex.get(key);
    if (oldHash === block.sha256) {
      unchanged++;
      savedBytes += block.size;
    } else {
      changed.push({ name: block.name, offset: block.offset, size: block.size });
    }
  }

  return { changed, unchanged, totalBlocks: newMap.files.length, savedBytes };
}

/** Save blockmap for current version */
export function saveBlockMap(version: string, map: BlockMap): void {
  mkdirSync(BLOCKMAP_DIR, { recursive: true });
  writeFileSync(join(BLOCKMAP_DIR, `${version}.json`), JSON.stringify(map));
}

/** Load blockmap for a version */
export function loadBlockMap(version: string): BlockMap | null {
  const p = join(BLOCKMAP_DIR, `${version}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/** Check if differential update is possible */
export function canDiffUpdate(currentVersion: string): boolean {
  return loadBlockMap(currentVersion) !== null;
}

/** Hash a block of data */
export function hashBlock(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
