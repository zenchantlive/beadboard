'use client';

import { useEffect, useState } from 'react';
import type { BeadIssue } from '../lib/types';

interface UseMissionGraphResult {
  nodes: BeadIssue[];
  isLoading: boolean;
  error: string | null;
}

export function useMissionGraph(projectRoot: string, missionId: string): UseMissionGraphResult {
  const [nodes, setNodes] = useState<BeadIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGraph() {
      if (!missionId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/mission/graph?projectRoot=${encodeURIComponent(projectRoot)}&id=${encodeURIComponent(missionId)}`
        );
        const payload = await response.json();
        if (payload.ok && payload.data) {
          setNodes(payload.data.nodes);
        } else {
          setError(payload.error || 'Failed to load graph');
        }
      } catch (e) {
        setError('Failed to fetch mission graph');
      } finally {
        setIsLoading(false);
      }
    }
    fetchGraph();
  }, [projectRoot, missionId]);

  return { nodes, isLoading, error };
}
