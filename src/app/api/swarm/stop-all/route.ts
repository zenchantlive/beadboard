import { NextResponse } from 'next/server';

import { validateProjectRoot } from '../../../../lib/validate-project-root';
import { stopActiveSwarmWorkers } from '../../../../lib/swarm-bulk-cancel';

export const dynamic = 'force-dynamic';

interface StopAllRouteDeps {
  stopActiveSwarmWorkers: typeof stopActiveSwarmWorkers;
}

export async function handleStopAllRequest(
  request: Request,
  deps: StopAllRouteDeps = { stopActiveSwarmWorkers },
): Promise<Response> {
  try {
    const body = await request.json();
    const projectRoot = validateProjectRoot(body?.projectRoot);

    if (!projectRoot.valid) {
      return projectRoot.error;
    }

    const swarmId = typeof body?.swarmId === 'string' ? body.swarmId.trim() : '';
    if (!swarmId) {
      return NextResponse.json({ ok: false, error: { message: 'swarmId is required' } }, { status: 400 });
    }

    const confirmation = typeof body?.confirmation === 'string' ? body.confirmation : '';
    if (!confirmation.trim()) {
      return NextResponse.json({ ok: false, error: { message: 'confirmation is required' } }, { status: 400 });
    }

    const result = await deps.stopActiveSwarmWorkers(projectRoot.projectRoot, swarmId, confirmation);

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleStopAllRequest(request);
}
