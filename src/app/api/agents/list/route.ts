import { NextResponse } from 'next/server';
import { listAgents } from '../../../../lib/agent-registry';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');

  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot is required' }, { status: 400 });
  }

  const result = await listAgents({}, { projectRoot });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
