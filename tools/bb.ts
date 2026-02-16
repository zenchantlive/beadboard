import { parseArgs } from 'node:util';
import {
    registerAgent, listAgents, showAgent, extendActivityLease, type AgentCommandResponse
} from '../src/lib/agent-registry';
import {
    sendAgentMessage, inboxAgentMessages, readAgentMessage, ackAgentMessage,
    type MailCommandResponse, type MessageCategory
} from '../src/lib/agent-mail';
import {
    reserveAgentScope, releaseAgentReservation, statusAgentReservations,
    type ReservationCommandResponse
} from '../src/lib/agent-reservations';
// Common types
type AnyCommandResponse = AgentCommandResponse<any> | MailCommandResponse<any> | ReservationCommandResponse<any>;

function stringArg(value: string | boolean | undefined): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function booleanArg(value: string | boolean | undefined): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

// Helper to print response
function printResponse(response: AnyCommandResponse, json: boolean) {
    if (json) {
        console.log(JSON.stringify(response, null, 2));
        return;
    }

    if (!response.ok) {
        console.error(`Error: [${response.error?.code}] ${response.error?.message}`);
        process.exit(1);
    }

    // Human readable mapping
    if (response.command === 'agent register') {
        const d = response.data;
        console.log(`✓ Agent registered: ${d.agent_id} (role: ${d.role}, status: ${d.status})`);
    } else if (response.command === 'agent list') {
        const list = response.data as any[];
        console.log(`Found ${list.length} agents:`);
        list.forEach(a => console.log(`- ${a.agent_id} (${a.role}) [${a.status}]`));
    } else if (response.command === 'agent show') {
        const d = response.data;
        console.log(`Agent: ${d.agent_id}\nRole: ${d.role}\nStatus: ${d.status}\nLast Seen: ${d.last_seen_at}`);
    } else if (response.command === 'agent activity-lease') {
        const d = response.data;
        if (d) {
          console.log(`✓ Activity lease extended: ${d.agent_id} (version: ${d.version})`);
        } else {
          console.log(`✓ Activity lease extended.`);
        }
    } else if (response.command === 'agent send') {
        const d = response.data;
        console.log(`✓ Message sent: ${d.message_id} (state: ${d.state})`);
    } else if (response.command === 'agent inbox') {
        const list = response.data as any[];
        console.log(`Inbox (${list.length}):`);
        list.forEach(m => console.log(`- [${m.message_id}] ${m.category}: ${m.subject} (from: ${m.from_agent})`));
    } else if (response.command === 'agent read') {
        const d = response.data;
        console.log(`✓ Message read: ${d.message_id} (state: ${d.state})`);
    } else if (response.command === 'agent ack') {
        const d = response.data;
        console.log(`✓ Message acked: ${d.message_id} (state: ${d.state})`);
    } else if (response.command === 'agent reserve') {
        const d = response.data;
        console.log(`✓ Scope reserved: ${d.reservation_id}\nScope: ${d.scope}\nExpires: ${d.expires_at}`);
    } else if (response.command === 'agent release') {
        const d = response.data;
        console.log(`✓ Reservation released. State: ${d.state}`);
    } else if (response.command === 'agent status') {
        const d = response.data;
        console.log(`Active Reservations: ${d.reservations.length}`);
        d.reservations.forEach((r: any) => console.log(`- ${r.scope} (agent: ${r.agent_id}, expires: ${r.expires_at})`));
        console.log(`Unacked Required Messages: ${d.unacked_required_messages.length}`);
    } else {
        console.log('Success:', response.data);
    }
}

function printAgentHelp() {
    console.log(`Usage: bb agent <command> [options]

Commands:
  register         Register or update an agent identity
  list             List registered agents
  show             Show one registered agent
  activity-lease   Extend the activity lease (silent refresh)
  send             Send a message to an agent
  inbox      List inbox messages for an agent
  read       Mark one message as read
  ack        Acknowledge one message
  reserve    Reserve a work scope
  release    Release a reservation scope
  status     Show reservation/message status

Naming policy:
  - Use a unique agent name per session.
  - Prefer adjective-noun names (example: amber-otter, cobalt-harbor).
  - Do not reuse a prior session identity.

Examples:
  bb agent list --json
  bb agent register --name amber-otter --role ui
  bb agent status --agent amber-otter
`);
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        printAgentHelp();
        process.exit(0);
    }

    // Very simple manual parsing for subcommand routing since parseArgs is flat
    const domain = args[0]; // agent
    const command = args[1]; // register, list, etc

    if (domain === '--help' || domain === '-h' || domain === 'help') {
        printAgentHelp();
        process.exit(0);
    }

    if (domain !== 'agent') {
        console.error('Only "agent" domain supported currently.');
        process.exit(1);
    }

    if (!command || command === '--help' || command === '-h' || command === 'help') {
        printAgentHelp();
        process.exit(0);
    }

    // Parse remaining args
    const { values } = parseArgs({
        args: args.slice(2),
        options: {
            // Identity
            name: { type: 'string' },
            role: { type: 'string' },
            display: { type: 'string' },
            'force-update': { type: 'boolean' },
            agent: { type: 'string' }, // shared
            status: { type: 'string' }, // shared

            // Mail
            from: { type: 'string' },
            to: { type: 'string' },
            bead: { type: 'string' },
            category: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' },
            thread: { type: 'string' },
            state: { type: 'string' },
            message: { type: 'string' },
            limit: { type: 'string' }, // Note: parseArgs strings, convert to number

            // Reservations
            scope: { type: 'string' },
            ttl: { type: 'string' },
            'takeover-stale': { type: 'boolean' },

            // Output
            json: { type: 'boolean' },
        },
        strict: false,
    });

    const json = booleanArg(values.json) ?? false;
    // Shim deps
    const deps = {};

    try {
        let result: AnyCommandResponse;

        // ACTIVITY LEASE (Passive): Whenever an agent ID is provided in any command,
        // we extend their lease as a side-effect of real work.
        // This provides observability WITHOUT background workers or popups.
        const targetAgent = stringArg(values.agent) || stringArg(values.from) || stringArg(values.name);
        if (targetAgent && command !== 'register' && command !== 'activity-lease') {
            await extendActivityLease({ agent: targetAgent }, deps).catch(() => {});
        }

        switch (command) {
            // --- Identity ---
            case 'register':
                if (!values.name || !values.role) throw new Error('--name and --role required');
                result = await registerAgent({
                    name: stringArg(values.name)!,
                    role: stringArg(values.role)!,
                    display: stringArg(values.display),
                    forceUpdate: booleanArg(values['force-update']),
                }, deps);
                break;

            case 'list':
                result = await listAgents({
                    role: stringArg(values.role),
                    status: stringArg(values.status),
                });
                break;

            case 'show':
                if (!values.agent) throw new Error('--agent required');
                result = await showAgent({ agent: stringArg(values.agent)! });
                break;

            case 'activity-lease':
                if (!values.agent) throw new Error('--agent required');
                result = await extendActivityLease({
                    agent: stringArg(values.agent)!,
                }, deps);
                break;

            // --- Mail ---
            case 'send':
                if (!values.from || !values.to || !values.bead || !values.category || !values.subject || !values.body) {
                    throw new Error('--from, --to, --bead, --category, --subject, --body required');
                }
                result = await sendAgentMessage({
                    from: stringArg(values.from)!,
                    to: stringArg(values.to)!,
                    bead: stringArg(values.bead)!,
                    category: stringArg(values.category)! as MessageCategory,
                    subject: stringArg(values.subject)!,
                    body: stringArg(values.body)!,
                    thread: stringArg(values.thread),
                }, deps);
                break;

            case 'inbox':
                if (!values.agent) throw new Error('--agent required');
                result = await inboxAgentMessages({
                    agent: stringArg(values.agent)!,
                    state: stringArg(values.state) as any,
                    bead: stringArg(values.bead),
                    limit: stringArg(values.limit) ? parseInt(stringArg(values.limit)!, 10) : undefined,
                });
                break;

            case 'read':
                if (!values.agent || !values.message) throw new Error('--agent and --message required');
                result = await readAgentMessage({ agent: stringArg(values.agent)!, message: stringArg(values.message)! }, deps);
                break;

            case 'ack':
                if (!values.agent || !values.message) throw new Error('--agent and --message required');
                result = await ackAgentMessage({ agent: stringArg(values.agent)!, message: stringArg(values.message)! }, deps);
                break;

            // --- Reservations ---
            case 'reserve':
                if (!values.agent || !values.scope || !values.bead) throw new Error('--agent, --scope, --bead required');
                result = await reserveAgentScope({
                    agent: stringArg(values.agent)!,
                    scope: stringArg(values.scope)!,
                    bead: stringArg(values.bead)!,
                    ttl: stringArg(values.ttl) ? parseInt(stringArg(values.ttl)!, 10) : undefined,
                    takeoverStale: booleanArg(values['takeover-stale']),
                }, deps);
                break;

            case 'release':
                if (!values.agent || !values.scope) throw new Error('--agent and --scope required');
                result = await releaseAgentReservation({ agent: stringArg(values.agent)!, scope: stringArg(values.scope)! }, deps);
                break;

            case 'status':
                // status is optional input
                result = await statusAgentReservations({
                    bead: stringArg(values.bead),
                    agent: stringArg(values.agent)
                }, deps);
                break;

            default:
                console.error(`Unknown command: ${command}`);
                process.exit(1);
        }

        printResponse(result, json);

    } catch (error) {
        if (json) {
            console.log(JSON.stringify({
                ok: false,
                command: `agent ${command}`,
                data: null,
                error: { code: 'CLI_ERROR', message: error instanceof Error ? error.message : String(error) }
            }, null, 2));
        } else {
            console.error('Error:', error instanceof Error ? error.message : String(error));
        }
        process.exit(1);
    }
}

main();
