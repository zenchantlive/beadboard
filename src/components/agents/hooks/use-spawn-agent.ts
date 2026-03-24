// src/components/agents/hooks/use-spawn-agent.ts
import { useState } from 'react';

export interface SpawnResult {
  success: boolean;
  workerId?: string;
  displayName?: string;
  error?: string;
}

export function useSpawnAgent(projectRoot: string) {
  const [isSpawning, setIsSpawning] = useState(false);

  const spawn = async (beadId: string, agentTypeId: string): Promise<SpawnResult> => {
    setIsSpawning(true);
    try {
      const response = await fetch('/api/runtime/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRoot, beadId, agentTypeId }),
      });
      const data = await response.json();
      
      if (!data.ok) {
        return { success: false, error: data.error };
      }
      
      return {
        success: true,
        workerId: data.workerId,
        displayName: data.displayName,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      setIsSpawning(false);
    }
  };

  return { spawn, isSpawning };
}
