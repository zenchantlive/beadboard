import { NextResponse } from 'next/server';
import { leaveSwarm } from '../../../../lib/swarm-molecules';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectRoot, agentId } = body;

    if (!projectRoot || !agentId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await leaveSwarm(
      { agent: agentId },
      { projectRoot }
    );

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
