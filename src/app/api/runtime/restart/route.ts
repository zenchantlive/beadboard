import { NextResponse } from 'next/server';
import { bbDaemon } from '../../../../lib/bb-daemon';
import { validateProjectRoot } from '../../../../lib/validate-project-root';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const result = validateProjectRoot(typeof body?.projectRoot === 'string' ? body.projectRoot.trim() : '');
    if (!result.valid) return result.error;

    await bbDaemon.restartOrchestrator(result.projectRoot);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
