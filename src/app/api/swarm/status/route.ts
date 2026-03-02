import { NextResponse } from 'next/server';

import { runBdCommand } from '../../../../lib/bridge';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');
  const epicId = searchParams.get('epic');

  if (!projectRoot) {
    return NextResponse.json(
      { ok: false, error: { classification: 'bad_args', message: 'projectRoot is required' } },
      { status: 400 },
    );
  }

  if (!epicId) {
    return NextResponse.json(
      { ok: false, error: { classification: 'bad_args', message: 'epic is required' } },
      { status: 400 },
    );
  }

  const result = await runBdCommand({
    projectRoot,
    args: ['swarm', 'status', epicId, '--json'],
  });

  if (!result.success) {
    const status = result.classification === 'not_found' ? 503 : 400;
    return NextResponse.json(
      { ok: false, error: { classification: result.classification ?? 'unknown', message: result.error ?? result.stderr } },
      { status },
    );
  }

  try {
    const data = JSON.parse(result.stdout);
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, error: { classification: 'unknown', message: 'Failed to parse swarm status output' } },
      { status: 500 },
    );
  }
}
