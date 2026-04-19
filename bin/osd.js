#!/usr/bin/env node
'use strict';

const args = process.argv.slice(2);

if (args.includes('--tui')) {
  require('../src/tui/index.js');
} else {
  const { execFileSync } = require('child_process');
  const electronPath = require('electron');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  execFileSync(electronPath, [root, ...args], { stdio: 'inherit' });
}
