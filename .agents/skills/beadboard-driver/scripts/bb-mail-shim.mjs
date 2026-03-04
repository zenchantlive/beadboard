#!/usr/bin/env node
/**
 * bb-mail-shim.mjs
 * Translates bd mail delegate calls into bb agent coordination commands.
 *
 * bd mail delegates by prepending the configured delegate string to all args:
 *   `bd mail inbox` → `node bb-mail-shim.mjs inbox`
 *   `bd mail send --to foo ...` → `node bb-mail-shim.mjs send --to foo ...`
 *
 * Agent identity is read from (in order):
 *   1. BB_AGENT env var  (e.g., export BB_AGENT=silver-scribe)
 *   2. BD_ACTOR env var  (git actor name used by bd commands)
 *
 * Command mappings:
 *   bd mail inbox [--state s] [--bead b] [--limit n]
 *     → bb agent inbox --agent <self> [...]
 *
 *   bd mail send --to <agent> --bead <id> --category <cat> --subject <s> --body <b>
 *     → bb agent send --from <self> --to <agent> --bead <id> --category <cat> --subject <s> --body <b>
 *     (--from injected automatically; omitted if caller already supplies it)
 *
 *   bd mail read <message-id>
 *     → bb agent read --agent <self> --message <message-id>
 *
 *   bd mail ack <message-id>
 *     → bb agent ack --agent <self> --message <message-id>
 *
 *   bd mail <other> [...]   (passthrough)
 *     → bb agent <other> [...]
 *
 * To configure (one-time, or via session-preflight.mjs):
 *   bd config set mail.delegate "node /abs/path/to/bb-mail-shim.mjs"
 *
 * Note: bb agent commands must be available globally (installed via izs.2).
 * Until then, call tools/bb.ts from the BeadBoard repo directly.
 */
import { spawnSync } from 'node:child_process';

function getAgentName() {
  const agent = (process.env.BB_AGENT || process.env.BD_ACTOR || '').trim();
  if (!agent) {
    console.error(
      'bb-mail-shim: agent identity required.\n' +
        'Set BB_AGENT to your agent name before using bd mail:\n' +
        '  export BB_AGENT=silver-scribe\n' +
        'Or ensure BD_ACTOR is set by your bd environment.',
    );
    process.exit(1);
  }
  return agent;
}

function runBbAgent(args) {
  const result = spawnSync('bb', ['agent', ...args], { stdio: 'inherit', shell: false });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(
        'bb-mail-shim: bb command not found in PATH.\n' +
          'Install the BeadBoard global CLI so bb agent commands are available.\n' +
          'Interim: call tools/bb.ts directly from the BeadBoard repo:\n' +
          '  node --import tsx /path/to/beadboard/tools/bb.ts agent inbox --agent $BB_AGENT',
      );
    } else {
      console.error(`bb-mail-shim: failed to spawn bb: ${result.error.message}`);
    }
    process.exit(1);
  }
  process.exit(result.status ?? 0);
}

const args = process.argv.slice(2);
const subcommand = args[0];

if (!subcommand || subcommand === '--help' || subcommand === '-h') {
  console.log(`bb-mail-shim: bd mail → bb agent translation shim

Usage (via bd mail after delegate is configured):
  bd mail inbox [--state unread|read|acked] [--bead <id>] [--limit <n>]
  bd mail send --to <agent> --bead <id> --category HANDOFF|BLOCKED|DECISION|INFO --subject <text> --body <text>
  bd mail read <message-id>
  bd mail ack <message-id>

Requires: BB_AGENT or BD_ACTOR env var set to your agent name.

Configure once per project:
  bd config set mail.delegate "node /abs/path/to/bb-mail-shim.mjs"
  # or run session-preflight.mjs which sets this automatically`);
  process.exit(0);
}

const agent = getAgentName();

switch (subcommand) {
  case 'inbox': {
    // bd mail inbox [...] → bb agent inbox --agent <self> [...]
    runBbAgent(['inbox', '--agent', agent, ...args.slice(1)]);
    break;
  }

  case 'send': {
    // bd mail send [...] → bb agent send --from <self> [...]
    // Inject --from only if caller hasn't already supplied it
    const rest = args.slice(1);
    const hasFrom = rest.includes('--from');
    runBbAgent(['send', ...(hasFrom ? [] : ['--from', agent]), ...rest]);
    break;
  }

  case 'read': {
    // bd mail read <msg-id> [...] → bb agent read --agent <self> --message <msg-id> [...]
    const msgId = args[1];
    if (!msgId) {
      console.error('bb-mail-shim: "read" requires a <message-id> argument');
      process.exit(1);
    }
    runBbAgent(['read', '--agent', agent, '--message', msgId, ...args.slice(2)]);
    break;
  }

  case 'ack': {
    // bd mail ack <msg-id> [...] → bb agent ack --agent <self> --message <msg-id> [...]
    const msgId = args[1];
    if (!msgId) {
      console.error('bb-mail-shim: "ack" requires a <message-id> argument');
      process.exit(1);
    }
    runBbAgent(['ack', '--agent', agent, '--message', msgId, ...args.slice(2)]);
    break;
  }

  default: {
    // Passthrough for any other subcommand
    runBbAgent([subcommand, ...args.slice(1)]);
  }
}
