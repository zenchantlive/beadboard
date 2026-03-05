import { NextResponse } from 'next/server';
import { inboxAgentMessages } from '../../../../../lib/agent-mail';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const agentsParam = searchParams.get('agents') ?? '';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 25;
  
  if (!agentsParam) {
    return NextResponse.json({ ok: true, data: [] }, { status: 200 });
  }
  
  const agentNames = agentsParam.split(',').map(a => a.trim()).filter(Boolean);
  
  const results = await Promise.all(
    agentNames.map(async (agent) => {
      const result = await inboxAgentMessages({ agent, limit });
      if (!result.ok) {
        return { agent, messages: [] };
      }
      return { agent, messages: result.data ?? [] };
    })
  );
  
  return NextResponse.json({ ok: true, data: results }, { status: 200 });
}
