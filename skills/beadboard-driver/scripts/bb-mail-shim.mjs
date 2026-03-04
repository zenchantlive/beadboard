#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function getAgentName() {
  const agent = (process.env.BB_AGENT || process.env.BD_ACTOR || '').trim();
  if (!agent) {
    console.error(
      'bb-mail-shim: agent identity required.\n' +
      'Set BB_AGENT before running bd mail, e.g. export BB_AGENT=silver-scribe',
    );
    process.exit(1);
  }
  return agent;
}

function runBbAgent(args) {
  const result = spawnSync('bb', ['agent', ...args], { stdio: 'inherit', shell: false });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error('bb-mail-shim: bb command not found in PATH.');
    } else {
      console.error(`bb-mail-shim: failed to execute bb: ${result.error.message}`);
    }
    process.exit(1);
  }
  process.exit(result.status ?? 0);
}

const args = process.argv.slice(2);
const subcommand = args[0];
const agent = getAgentName();

if (!subcommand || subcommand === '--help' || subcommand === '-h') {
  console.log('Usage: bd mail inbox|send|read|ack ... (delegated via bb-mail-shim)');
  process.exit(0);
}

switch (subcommand) {
  case 'inbox':
    runBbAgent(['inbox', '--agent', agent, ...args.slice(1)]);
    break;
  case 'send': {
    const rest = args.slice(1);
    const hasFrom = rest.includes('--from');
    runBbAgent(['send', ...(hasFrom ? [] : ['--from', agent]), ...rest]);
    break;
  }
  case 'read': {
    const messageId = args[1];
    if (!messageId) {
      console.error('bb-mail-shim: read requires <message-id>');
      process.exit(1);
    }
    runBbAgent(['read', '--agent', agent, '--message', messageId, ...args.slice(2)]);
    break;
  }
  case 'ack': {
    const messageId = args[1];
    if (!messageId) {
      console.error('bb-mail-shim: ack requires <message-id>');
      process.exit(1);
    }
    runBbAgent(['ack', '--agent', agent, '--message', messageId, ...args.slice(2)]);
    break;
  }
  default:
    runBbAgent([subcommand, ...args.slice(1)]);
}
