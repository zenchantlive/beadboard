// src/components/agents/hooks/use-agent-status.ts
import { useState, useEffect, useRef } from 'react';

export type WorkerStatus = 'idle' | 'spawning' | 'working' | 'blocked' | 'completed' | 'failed';

export interface AgentStatus {
  agentTypeId?: string;
  workerStatus: WorkerStatus;
  workerDisplayName?: string;
  workerError?: string;
  isLoading: boolean;
}

const POLL_INTERVAL_MS = 5000;

export function useAgentStatus(beadId: string): AgentStatus {
  const [status, setStatus] = useState<AgentStatus>({
    workerStatus: 'idle',
    isLoading: true,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    if (!beadId) return;
    
    try {
      const response = await fetch(`/api/runtime/worker-status?beadId=${encodeURIComponent(beadId)}`);
      if (!response.ok) {
        // If API returns 404 or error, no worker exists yet
        setStatus({ workerStatus: 'idle', isLoading: false });
        return;
      }
      
      const data = await response.json();
      setStatus({
        workerStatus: data.status || 'idle',
        workerDisplayName: data.displayName,
        workerError: data.error,
        agentTypeId: data.agentTypeId,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch worker status:', error);
      setStatus({ workerStatus: 'idle', isLoading: false });
    }
  };

  useEffect(() => {
    if (!beadId) {
      setStatus({ workerStatus: 'idle', isLoading: false });
      return;
    }

    // Initial fetch
    fetchStatus();

    // Set up polling
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [beadId]);

  return status;
}
