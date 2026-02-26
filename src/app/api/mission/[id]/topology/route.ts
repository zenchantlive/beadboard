import { NextResponse } from 'next/server';
import { runBdCommand } from '../../../../../lib/bridge';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');

  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot is required' }, { status: 400 });
  }

  try {
    const result = await runBdCommand({
      projectRoot,
      args: ['swarm', 'status', id, '--json'],
    });

    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    const topology = JSON.parse(result.stdout);
    return NextResponse.json({ ok: true, data: topology });
  } catch (e) {
    console.error(`Failed to fetch topology for ${id}:`, e);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
