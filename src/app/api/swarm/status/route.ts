import { NextResponse } from 'next/server';

import { runBdCommand } from '../../../../lib/bridge';

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
    return NextResponse.json(
      { ok: false, error: { classification: result.classification ?? 'unknown', message: result.error ?? result.stderr } },
      { status: 400 },
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
