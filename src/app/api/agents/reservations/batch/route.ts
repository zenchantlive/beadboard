import { NextResponse } from 'next/server';
import { statusAgentReservations } from '../../../../../lib/agent-reservations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const agentsParam = searchParams.get('agents') ?? '';
  
  if (!agentsParam) {
    return NextResponse.json({ ok: true, data: [] }, { status: 200 });
  }
  
  const agentNames = agentsParam.split(',').map(a => a.trim()).filter(Boolean);
  
  const results = await Promise.all(
    agentNames.map(async (agent) => {
      const result = await statusAgentReservations({ agent });
      if (!result.ok || !result.data) {
        return { agent, scope: undefined, reservations: [] };
      }
      const reservations = result.data.reservations ?? [];
      const first = reservations[0];
      return { 
        agent, 
        scope: first?.scope as string | undefined, 
        reservations 
      };
    })
  );
  
  return NextResponse.json({ ok: true, data: results }, { status: 200 });
}
