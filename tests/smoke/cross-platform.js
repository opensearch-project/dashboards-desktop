#!/usr/bin/env node
/**
 * Cross-platform smoke test — runs on macOS, Linux, Windows.
 * Verifies: tsc, vitest, build:ts all succeed.
 * Usage: node tests/smoke/cross-platform.js
 */
const { execSync } = require('child_process');
const os = require('os');

const platform = os.platform();
const arch = os.arch();
const nodeVersion = process.version;

console.log(`\n🔍 Smoke test — ${platform}/${arch} — Node ${nodeVersion}\n`);

const checks = [
  { name: 'TypeScript', cmd: 'npx tsc --noEmit' },
  { name: 'Unit tests', cmd: 'npx vitest run --reporter=dot' },
  { name: 'Build', cmd: 'npm run build:ts' },
];

let passed = 0;
let failed = 0;

for (const check of checks) {
  try {
    console.log(`  ⏳ ${check.name}...`);
    execSync(check.cmd, { stdio: 'pipe', timeout: 120_000 });
    console.log(`  ✅ ${check.name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${check.name}`);
    if (err.stderr) console.log(`     ${err.stderr.toString().split('\n')[0]}`);
    failed++;
  }
}

console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);
console.log(`Platform: ${platform}/${arch} | Node: ${nodeVersion}\n`);
process.exit(failed > 0 ? 1 : 0);
