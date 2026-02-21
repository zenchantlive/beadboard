import { NextResponse } from 'next/server';
import { runBdCommand } from '../../../../lib/bridge';
import { listAgents, type AgentRecord } from '../../../../lib/agent-registry';

export const dynamic = 'force-dynamic';

interface SwarmTopology {
  completed: { id: string; title: string }[];
  active: { id: string; title: string; assignee?: string }[];
  ready: { id: string; title: string }[];
  blocked: { id: string; title: string; blocked_by: string[] }[];
}

interface Mission {
  id: string;
  title: string;
  description?: string;
  status: 'planning' | 'active' | 'blocked' | 'completed';
  stats: {
    total: number;
    done: number;
    blocked: number;
    active: number;
  };
  topology?: SwarmTopology;
  agents: AgentRecord[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');

  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot is required' }, { status: 400 });
  }

  // 1. Fetch Swarms (Molecules)
  const swarmResult = await runBdCommand({
    projectRoot,
    args: ['swarm', 'list', '--json'],
  });

  if (!swarmResult.success) {
    console.warn('Swarm list failed, returning empty:', swarmResult.error);
    return NextResponse.json({ ok: true, data: { missions: [] } });
  }

  // 2. Fetch All Agents
  const agentResult = await listAgents({}, { projectRoot });
  const allAgents = agentResult.ok ? agentResult.data! : [];

  try {
    const rawData = JSON.parse(swarmResult.stdout);
    const rawSwarms = rawData.swarms || [];

    // 3. Transform & Merge
    const missions: Mission[] = rawSwarms
      .filter((s: any) => !s.title.startsWith('Agent:'))
      .map((s: any) => {
        const assignedAgents = allAgents.filter(a => a.swarm_id === s.epic_id || a.swarm_id === s.id);
        
        // Map status
        let status: Mission['status'] = 'planning';
        if (s.status === 'closed') status = 'completed';
        else if (assignedAgents.length > 0) status = 'active';
        else status = 'planning';

        return {
          id: s.id,
          title: s.title,
          description: s.description || s.epic_description || '',
          status, 
          stats: {
            total: s.total_issues || 0,
            done: s.completed_issues || 0,
            active: s.active_issues || 0,
            blocked: 0 
          },
          agents: assignedAgents
        };
      });

    return NextResponse.json({ ok: true, data: { missions } });
  } catch (e) {
    console.error('Mission list parsing error:', e);
    return NextResponse.json({ ok: false, error: 'Failed to parse mission data' }, { status: 500 });
  }
}