import { NextResponse } from 'next/server';
import { runBdCommand } from '../../../../lib/bridge';
import {
  AGENT_INSTANCE_LABEL_PREFIX,
  AGENT_TYPE_LABEL_PREFIX,
  LEGACY_AGENT_LABEL,
  RUNTIME_INSTANCE_LABEL,
  normalizeAgentHandle,
  toAgentBeadId,
} from '../../../../lib/agent/identity';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectRoot, name, role, instructions } = body;

    if (!projectRoot || !name || !role) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedName = normalizeAgentHandle(name);
    const normalizedRole = normalizeAgentHandle(role);
    const beadId = toAgentBeadId(name);

    // 1. Create the runtime-instance bead
    const createRes = await runBdCommand({
      projectRoot,
      args: [
        'create',
        '--id', beadId,
        '--force',
        '--title', `Agent: ${name}`,
        '--type', 'task',
        '--priority', '2',
        '--description', instructions || `Runtime instance for archetype ${role}`,
        '--json',
      ],
    });

    if (!createRes.success) {
      return NextResponse.json({ ok: false, error: createRes.error }, { status: 500 });
    }

    // 2. Add labels that identify this as a runtime instance
    const updateRes = await runBdCommand({
      projectRoot,
      args: [
        'update',
        beadId,
        '--add-label', LEGACY_AGENT_LABEL,
        '--add-label', RUNTIME_INSTANCE_LABEL,
        '--add-label', `role:${role}`,
        '--add-label', `${AGENT_TYPE_LABEL_PREFIX}${normalizedRole}`,
        '--add-label', `${AGENT_INSTANCE_LABEL_PREFIX}${normalizedName}`,
        '--add-label', 'agent-state:idle',
        '--status', 'deferred',
        '--json',
      ],
    });

    if (!updateRes.success) {
      return NextResponse.json({ ok: false, error: updateRes.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: { id: beadId } });
  } catch (e) {
    console.error('Agent creation failed:', e);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
