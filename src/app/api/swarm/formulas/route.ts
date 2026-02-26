import { NextResponse } from 'next/server';
import { runBdCommand } from '../../../../lib/bridge';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');

  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot is required' }, { status: 400 });
  }

  // bd formula list --json
  const result = await runBdCommand({
    projectRoot,
    args: ['formula', 'list', '--json', '--allow-stale'],
  });

  if (!result.success) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  try {
    // If output is empty or not JSON array, handle gracefully
    const json = JSON.parse(result.stdout || '[]');
    return NextResponse.json({ ok: true, data: json });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to parse formulas' }, { status: 500 });
  }
}
