// src/components/agents/agent-action-row.tsx
'use client';

import { AgentAssignButton } from './agent-assign-button';
import { AgentSpawnButton } from './agent-spawn-button';
import { useAgentStatus, useSpawnAgent } from './hooks';
import type { AgentArchetype } from '../../lib/types-swarm';

export interface AgentActionRowProps {
  beadId: string;
  beadStatus: string;
  agents: AgentArchetype[];
  projectRoot: string;
  currentAgentTypeId?: string;
  onAgentAssigned?: (agentTypeId: string) => void;
  onAgentSpawned?: (workerId: string, displayName: string) => void;
  size?: 'sm' | 'md';
}

export function AgentActionRow({
  beadId,
  beadStatus,
  agents,
  projectRoot,
  currentAgentTypeId,
  onAgentAssigned,
  onAgentSpawned,
  size = 'sm',
}: AgentActionRowProps) {
  const { workerStatus, workerDisplayName, workerError } = useAgentStatus(beadId);
  const { spawn, isSpawning } = useSpawnAgent(projectRoot);

  const handleAssign = async (agentTypeId: string) => {
    // Call API to assign agent type to bead
    try {
      const response = await fetch('/api/beads/assign-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beadId, agentTypeId }),
      });
      if (response.ok && onAgentAssigned) {
        onAgentAssigned(agentTypeId);
      }
    } catch (error) {
      console.error('Failed to assign agent:', error);
    }
  };

  const handleSpawn = async () => {
    if (!currentAgentTypeId) return;
    
    const result = await spawn(beadId, currentAgentTypeId);
    if (result.success && onAgentSpawned) {
      onAgentSpawned(result.workerId!, result.displayName!);
    }
  };

  // Don't show for closed beads
  if (beadStatus === 'closed') {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <AgentAssignButton
        beadId={beadId}
        agents={agents}
        currentAgentTypeId={currentAgentTypeId}
        onAssign={handleAssign}
        size={size}
      />
      <AgentSpawnButton
        beadId={beadId}
        agentTypeId={currentAgentTypeId}
        workerStatus={isSpawning ? 'spawning' : workerStatus}
        workerDisplayName={workerDisplayName}
        workerError={workerError}
        onSpawn={handleSpawn}
        size={size}
      />
    </div>
  );
}
