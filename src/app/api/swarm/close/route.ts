import { NextResponse } from 'next/server';

import { runBdCommand } from '../../../../lib/bridge';

interface CloseSwarmPayload {
  projectRoot: string;
  swarmId: string;
  reason?: string;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { classification: 'bad_args', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { ok: false, error: { classification: 'bad_args', message: 'Payload must be a JSON object' } },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  if (typeof data.projectRoot !== 'string' || !data.projectRoot.trim()) {
    return NextResponse.json(
      { ok: false, error: { classification: 'bad_args', message: 'projectRoot is required' } },
      { status: 400 },
    );
  }

  if (typeof data.swarmId !== 'string' || !data.swarmId.trim()) {
    return NextResponse.json(
      { ok: false, error: { classification: 'bad_args', message: 'swarmId is required' } },
      { status: 400 },
    );
  }

  const payload: CloseSwarmPayload = {
    projectRoot: data.projectRoot.trim(),
    swarmId: data.swarmId.trim(),
    reason: typeof data.reason === 'string' ? data.reason.trim() : undefined,
  };

  const args = ['close', payload.swarmId, '--json'];
  if (payload.reason) {
    args.push('--reason', payload.reason);
  }

  const result = await runBdCommand({
    projectRoot: payload.projectRoot,
    args,
  });

  if (!result.success) {
    return NextResponse.json(
      { ok: false, error: { classification: result.classification ?? 'unknown', message: result.error ?? result.stderr } },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, swarmId: payload.swarmId });
}
