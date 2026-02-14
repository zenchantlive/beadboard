import { NextResponse } from 'next/server';
import { readAgentMessage } from '../../../../../../../lib/agent-mail';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ beadId: string; messageId: string }> }
): Promise<Response> {
  const { messageId } = await params;
  const url = new URL(request.url);
  const agentId = url.searchParams.get('agent');

  if (!agentId) {
    return NextResponse.json({ ok: false, error: 'agent param required' }, { status: 400 });
  }

  const result = await readAgentMessage({ agent: agentId, message: messageId });
  return NextResponse.json(result);
}
