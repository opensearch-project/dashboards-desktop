#!/usr/bin/env node
// Cross-platform file copy for build:ts (works on Windows + Unix)
const fs = require('fs');
const path = require('path');

const copies = [
  ['src/renderer/index.html', 'dist/renderer/index.html'],
  ['src/renderer/shell.html', 'dist/renderer/shell.html'],
  ['src/renderer/chat-overlay.html', 'dist/renderer/chat-overlay.html'],
  ['src/renderer/styles/theme.css', 'dist/renderer/styles/theme.css'],
];

for (const [src, dest] of copies) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}
