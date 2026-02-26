'use client';

import { useEffect, useState, useCallback } from 'react';
import type { SwarmCardData, SwarmListResponse, SwarmStatusFromApi } from '../lib/swarm-api';
import { apiSwarmToCardData, type SwarmFromApi } from '../lib/swarm-api';

interface UseSwarmListResult {
  swarms: SwarmCardData[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

async function fetchSwarmList(projectRoot: string): Promise<SwarmCardData[]> {
  const response = await fetch(`/api/swarm/list?projectRoot=${encodeURIComponent(projectRoot)}`, {
    cache: 'no-store',
  });
  
  const payload = (await response.json()) as { ok: boolean; data?: SwarmListResponse; error?: { message?: string } };
  
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error?.message ?? 'Failed to fetch swarms');
  }
  
  return payload.data.swarms.map((s: SwarmFromApi) => apiSwarmToCardData(s));
}

async function fetchSwarmStatus(projectRoot: string, epicId: string): Promise<SwarmStatusFromApi | null> {
  try {
    const response = await fetch(
      `/api/swarm/status?projectRoot=${encodeURIComponent(projectRoot)}&epic=${encodeURIComponent(epicId)}`,
      { cache: 'no-store' }
    );
    
    const payload = (await response.json()) as { ok: boolean; data?: SwarmStatusFromApi; error?: { message?: string } };
    
    if (!response.ok || !payload.ok || !payload.data) {
      return null;
    }
    
    return payload.data;
  } catch {
    return null;
  }
}

export function useSwarmList(projectRoot: string): UseSwarmListResult {
  const [swarms, setSwarms] = useState<SwarmCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const swarmList = await fetchSwarmList(projectRoot);
      
      const swarmsWithStatus = await Promise.all(
        swarmList.map(async (swarm) => {
          const status = await fetchSwarmStatus(projectRoot, swarm.epicId);
          if (status) {
            return {
              ...swarm,
              readyIssues: status.ready_count,
              blockedIssues: status.blocked_count,
            };
          }
          return swarm;
        })
      );
      
      setSwarms(swarmsWithStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch swarms');
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { swarms, isLoading, error, refresh };
}
