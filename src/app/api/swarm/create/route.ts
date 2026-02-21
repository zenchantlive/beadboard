import { NextResponse } from 'next/server';

import { runBdCommand } from '../../../../lib/bridge';

interface CreateSwarmPayload {
  projectRoot: string;
  epicId: string;
  coordinator?: string;
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

  if (typeof data.epicId !== 'string' || !data.epicId.trim()) {
    return NextResponse.json(
      { ok: false, error: { classification: 'bad_args', message: 'epicId is required' } },
      { status: 400 },
    );
  }

  const payload: CreateSwarmPayload = {
    projectRoot: data.projectRoot.trim(),
    epicId: data.epicId.trim(),
    coordinator: typeof data.coordinator === 'string' ? data.coordinator.trim() : undefined,
  };

  const args = ['swarm', 'create', payload.epicId, '--json'];
  if (payload.coordinator) {
    args.push('--coordinator', payload.coordinator);
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

  try {
    const swarm = JSON.parse(result.stdout);
    return NextResponse.json({ ok: true, swarm });
  } catch {
    return NextResponse.json(
      { ok: false, error: { classification: 'unknown', message: 'Failed to parse swarm create output' } },
      { status: 500 },
    );
  }
}
