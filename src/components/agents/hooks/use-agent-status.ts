// src/components/agents/hooks/use-agent-status.ts
import { useState, useEffect } from 'react';

export type WorkerStatus = 'idle' | 'spawning' | 'working' | 'blocked' | 'completed' | 'failed';

export interface AgentStatus {
  agentTypeId?: string;
  workerStatus: WorkerStatus;
  workerDisplayName?: string;
  workerError?: string;
  isLoading: boolean;
}

export function useAgentStatus(beadId: string): AgentStatus {
  const [status, setStatus] = useState<AgentStatus>({
    workerStatus: 'idle',
    isLoading: true,
  });

  useEffect(() => {
    // TODO: Fetch from agent status API
    setStatus({ workerStatus: 'idle', isLoading: false });
  }, [beadId]);

  return status;
}
