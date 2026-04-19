#!/usr/bin/env node
'use strict';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'chat') {
  const { runChatCLI, parseChatArgs } = require('../src/cli/chat.js');
  runChatCLI(parseChatArgs(args.slice(1)));
} else if (command === 'skill') {
  const { handleSkillCommand } = require('../src/cli/skills.js');
  handleSkillCommand(args.slice(1));
} else if (command === 'agent') {
  const { handleAgentCommand } = require('../src/cli/agents.js');
  handleAgentCommand(args.slice(1));
} else if (args.includes('--tui')) {
  require('../src/tui/index.js');
} else {
  const { execFileSync } = require('child_process');
  const electronPath = require('electron');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  execFileSync(electronPath, [root, ...args], { stdio: 'inherit' });
}
