'use client';

import { useEffect, useState, useCallback } from 'react';
import type { AgentRecord } from '../lib/agent-registry';

interface UseAgentPoolResult {
  agents: AgentRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getAgentsBySwarm: (swarmId: string) => AgentRecord[];
}

async function fetchAgents(projectRoot: string): Promise<AgentRecord[]> {
  try {
    const response = await fetch(`/api/agents/list?projectRoot=${encodeURIComponent(projectRoot)}`, { cache: 'no-store' });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      console.error('Agent fetch failed:', payload.error);
      return [];
    }

    return (payload.data || []) as AgentRecord[];
  } catch (err) {
    console.error('Agent fetch error:', err);
    return [];
  }
}

export function useAgentPool(projectRoot: string): UseAgentPoolResult {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Only set loading on first fetch
    if (agents.length === 0) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAgents(projectRoot);
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent pool');
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot, agents.length]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const getAgentsBySwarm = useCallback((swarmId: string) => {
    return agents.filter(agent => agent.swarm_id === swarmId);
  }, [agents]);

  return { agents, isLoading, error, refresh, getAgentsBySwarm };
}
