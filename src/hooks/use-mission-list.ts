'use client';

import { useEffect, useState, useCallback } from 'react';
import type { AgentRecord } from '../lib/agent-registry';

export interface MissionData {
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
  agents: AgentRecord[];
}

interface UseMissionListResult {
  missions: MissionData[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

async function fetchMissions(projectRoot: string): Promise<MissionData[]> {
  try {
    const response = await fetch(`/api/mission/list?projectRoot=${encodeURIComponent(projectRoot)}`, { cache: 'no-store' });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message || 'Failed to fetch missions');
    }

    return payload.data.missions || [];
  } catch (err) {
    console.error('Mission fetch error:', err);
    throw err;
  }
}

export function useMissionList(projectRoot: string): UseMissionListResult {
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMissions(projectRoot);
      setMissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load missions');
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { missions, isLoading, error, refresh };
}
