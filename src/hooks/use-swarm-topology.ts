'use client';

import { useState, useEffect } from 'react';

export interface SwarmTopologyData {
  completed: { id: string; title: string; assignee?: string }[];
  active: { id: string; title: string; assignee?: string }[];
  ready: { id: string; title: string }[];
  blocked: { id: string; title: string; blocked_by: string[] }[];
  progress_percent: number;
}

export function useSwarmTopology(projectRoot: string, swarmId: string) {
  const [topology, setTopology] = useState<SwarmTopologyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchTopology() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/mission/${swarmId}/topology?projectRoot=${encodeURIComponent(projectRoot)}`);
        const result = await response.json();
        
        if (mounted) {
          if (result.ok) {
            setTopology(result.data);
          } else {
            setError(result.error);
          }
        }
      } catch (err) {
        if (mounted) setError('Failed to load topology');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    if (projectRoot && swarmId) {
      fetchTopology();
    }

    return () => { mounted = false; };
  }, [projectRoot, swarmId]);

  return { topology, isLoading, error };
}
