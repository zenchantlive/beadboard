import { NextResponse } from 'next/server';
import { joinSwarm, leaveSwarm } from '../../../../lib/swarm-molecules';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectRoot, agentId, missionId, action } = body;

    if (!projectRoot || !agentId || !missionId || !action) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'join') {
      result = await joinSwarm({ agent: agentId, epicId: missionId }, { projectRoot });
    } else if (action === 'leave') {
      result = await leaveSwarm({ agent: agentId, projectRoot });
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
    }

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: result.data });

  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
