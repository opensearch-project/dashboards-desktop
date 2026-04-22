#!/usr/bin/env node
/**
 * Generate CHANGELOG.md from conventional commits between two tags.
 * Usage: node scripts/generate-changelog.js [from-tag] [to-tag]
 * If no args, generates from last tag to HEAD.
 */

const { execSync } = require('child_process');
const fs = require('fs');

const [,, fromTag, toTag = 'HEAD'] = process.argv;

const lastTag = fromTag || execSync('git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
const range = lastTag ? `${lastTag}..${toTag}` : toTag;
const currentTag = toTag === 'HEAD'
  ? execSync('git describe --tags --abbrev=0 2>/dev/null || echo "unreleased"', { encoding: 'utf8' }).trim()
  : toTag;

const log = execSync(`git log ${range} --pretty=format:"%s|%h|%an" --no-merges`, { encoding: 'utf8' }).trim();
if (!log) { console.log('No commits found.'); process.exit(0); }

const categories = {
  feat: { title: '🚀 Features', items: [] },
  fix: { title: '🐛 Bug Fixes', items: [] },
  perf: { title: '⚡ Performance', items: [] },
  refactor: { title: '♻️ Refactoring', items: [] },
  test: { title: '✅ Tests', items: [] },
  docs: { title: '📚 Documentation', items: [] },
  ci: { title: '🔧 CI/CD', items: [] },
  style: { title: '💄 Style', items: [] },
  chore: { title: '🏗️ Chores', items: [] },
  other: { title: '📝 Other', items: [] },
};

for (const line of log.split('\n')) {
  const [msg, hash] = line.split('|');
  const match = msg.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)/);
  if (match) {
    const [, type, scope, desc] = match;
    const cat = categories[type] || categories.other;
    cat.items.push({ scope, desc, hash });
  } else {
    categories.other.items.push({ scope: null, desc: msg, hash });
  }
}

let md = `# ${currentTag}\n\n`;
for (const cat of Object.values(categories)) {
  if (cat.items.length === 0) continue;
  md += `## ${cat.title}\n\n`;
  for (const { scope, desc, hash } of cat.items) {
    const prefix = scope ? `**${scope}:** ` : '';
    md += `- ${prefix}${desc} (${hash})\n`;
  }
  md += '\n';
}

// Prepend to existing CHANGELOG.md
const changelogPath = 'CHANGELOG.md';
const existing = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '';
fs.writeFileSync(changelogPath, md + existing);
console.log(`✅ Changelog updated for ${currentTag}`);
