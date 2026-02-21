import { NextResponse } from 'next/server';

import { runBdCommand } from '../../../../lib/bridge';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');

  if (!projectRoot) {
    return NextResponse.json(
      { ok: false, error: { classification: 'bad_args', message: 'projectRoot is required' } },
      { status: 400 },
    );
  }

  const result = await runBdCommand({
    projectRoot,
    args: ['swarm', 'list', '--json'],
  });

  if (!result.success) {
    return NextResponse.json(
      { ok: false, error: { classification: result.classification ?? 'unknown', message: result.error ?? result.stderr } },
      { status: 400 },
    );
  }

  try {
    const rawData = JSON.parse(result.stdout);
    // Filter out items that look like agents (start with "Agent:" or have gt:agent style IDs if discernible)
    // Real swarms/molecules usually don't start with "Agent:".
    const swarms = (rawData.swarms || []).filter((s: any) => 
      !s.title.startsWith('Agent: ') && 
      !s.title.startsWith('Agent:')
    );
    
    return NextResponse.json({ ok: true, data: { swarms } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { classification: 'unknown', message: 'Failed to parse swarm list output' } },
      { status: 500 },
    );
  }
}
