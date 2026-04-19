#!/usr/bin/env node
'use strict';

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'chat': {
    const { runChatCLI, parseChatArgs } = require('../src/cli/chat.js');
    runChatCLI(parseChatArgs(args.slice(1)));
    break;
  }
  case 'mcp': {
    const { handleMcpCommand } = require('../src/cli/mcp.js');
    handleMcpCommand(args.slice(1));
    break;
  }
  case 'skill': {
    const { handleSkillCommand } = require('../src/cli/skills.js');
    handleSkillCommand(args.slice(1));
    break;
  }
  case 'agent': {
    const { handleAgentCommand } = require('../src/cli/agents.js');
    handleAgentCommand(args.slice(1));
    break;
  }
  case 'doctor': {
    const { handleDoctorCommand } = require('../src/cli/doctor.js');
    handleDoctorCommand();
    break;
  }
  case 'update': {
    const { handleUpdateCommand } = require('../src/cli/update.js');
    handleUpdateCommand(args.slice(1));
    break;
  }
  case 'plugin': {
    const { handlePluginCommand } = require('../src/cli/plugins.js');
    handlePluginCommand(args.slice(1));
    break;
  }
  case '--help':
  case '-h':
  case 'help':
    printHelp();
    break;
  case '--version':
  case '-v':
    console.log(require('../package.json').version);
    break;
  default:
    if (args.includes('--tui')) {
      require('../src/tui/index.js');
    } else if (!command) {
      // No args = launch GUI
      launchElectron(args);
    } else {
      console.error(`Unknown command: ${command}\n`);
      printHelp();
      process.exit(1);
    }
}

function launchElectron(extraArgs) {
  const { execFileSync } = require('child_process');
  const electronPath = require('electron');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  execFileSync(electronPath, [root, ...extraArgs], { stdio: 'inherit' });
}

function printHelp() {
  console.log(`OpenSearch Dashboards Desktop

Usage: osd <command> [options]

Commands:
  (none)          Launch desktop GUI
  --tui           Launch terminal UI
  chat            Agent chat (CLI mode)
  mcp             Manage MCP servers
  skill           Manage skills
  agent           Manage agent personas
  plugin          Manage plugins
  update          Check for and install updates
  doctor          Run system health checks

Options:
  -h, --help      Show this help
  -v, --version   Show version`);
}
