import { NextResponse } from 'next/server';
import { bbDaemon } from '../../../../lib/bb-daemon';
import { validateProjectRoot } from '../../../../lib/validate-project-root';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const result = validateProjectRoot(searchParams.get('projectRoot'));
  if (!result.valid) return result.error;

  await bbDaemon.ensureRunning();
  return NextResponse.json({ ok: true, data: bbDaemon.listTurns(result.projectRoot) });
}
