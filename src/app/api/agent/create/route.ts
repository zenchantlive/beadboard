import { NextResponse } from 'next/server';
import { runBdCommand } from '../../../../lib/bridge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectRoot, name, role, instructions } = body;

    if (!projectRoot || !name || !role) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create the Agent Bead
    const createRes = await runBdCommand({
      projectRoot,
      args: ['create', `Agent: ${name}`, '--type', 'task', '--priority', '2', '--description', instructions || `Agent role: ${role}`, '--json'],
    });

    if (!createRes.success) {
      return NextResponse.json({ ok: false, error: createRes.error }, { status: 500 });
    }

    const newAgent = JSON.parse(createRes.stdout);
    const agentId = newAgent.id;

    // 2. Add Labels (gt:agent, role:X)
    const updateRes = await runBdCommand({
      projectRoot,
      args: ['update', agentId, '--add-label', `gt:agent,role:${role}`, '--json'],
    });

    if (!updateRes.success) {
      return NextResponse.json({ ok: false, error: updateRes.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: { id: agentId } });
  } catch (e) {
    console.error('Agent creation failed:', e);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
