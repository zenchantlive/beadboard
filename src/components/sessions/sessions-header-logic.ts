import type { AgentRecord, AgentLiveness } from '../../lib/agent-registry';

export interface SwarmHealth {
  status: 'active' | 'warning' | 'critical' | 'offline';
  color: string;
}

export function getSwarmHealth(
  members: AgentRecord[],
  livenessMap: Record<string, AgentLiveness | string>
): SwarmHealth {
  if (members.length === 0) {
    return { status: 'offline', color: 'text-zinc-500' };
  }

  let hasStale = false;
  let hasEvicted = false;
  let allIdle = true;

  for (const member of members) {
    const liveness = livenessMap[member.agent_id] as AgentLiveness || 'active';
    
    if (liveness !== 'idle') {
      allIdle = false;
    }

    if (liveness === 'stale') {
      hasStale = true;
    } else if (liveness === 'evicted') {
      hasEvicted = true;
    }
  }

  if (allIdle) {
    return { status: 'offline', color: 'text-zinc-500' };
  }

  if (hasEvicted) {
    return { status: 'critical', color: 'text-rose-400' };
  }

  if (hasStale) {
    return { status: 'warning', color: 'text-amber-400' };
  }

  return { status: 'active', color: 'text-emerald-400' };
}
