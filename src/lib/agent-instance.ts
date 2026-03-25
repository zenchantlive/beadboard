/**
 * Agent Instance Model
 * 
 * An Agent Instance is a running copy of an Agent Type.
 * When spawned, it gets a numbered instance (e.g., "Engineer 01", "Engineer 02").
 */

export interface AgentInstance {
  /** Unique instance ID (e.g., "engineer-01-abc123") */
  id: string;
  /** What kind of agent this is (e.g., "engineer", "architect") */
  agentTypeId: string;
  /** Display name for UI (e.g., "Engineer 01") */
  displayName: string;
  /** Current status of this instance */
  status: 'spawning' | 'working' | 'idle' | 'completed' | 'failed';
  /** The bead/task this agent is working on */
  currentBeadId?: string;
  /** When this instance was spawned */
  startedAt: string;
  /** When this instance completed/failed */
  completedAt?: string;
  /** Result summary for completed agents */
  result?: string;
  /** Error message for failed agents */
  error?: string;
}

export interface AgentStatus {
  /** Total number of active agents */
  totalActive: number;
  /** Count by agent type { "engineer": 2, "architect": 1 } */
  byType: Record<string, number>;
  /** All active instances */
  instances: AgentInstance[];
}

/**
 * Generate a unique agent instance ID.
 * Format: {agentTypeId}-{number}-{random}
 */
export function generateAgentInstanceId(agentTypeId: string, instanceNumber: number): string {
  const suffix = String(instanceNumber).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8);
  return `${agentTypeId}-${suffix}-${random}`;
}

/**
 * Get display name for an agent instance.
 * Format: "{AgentTypeName} {number}" (e.g., "Engineer 01")
 */
export function getAgentDisplayName(agentTypeName: string, instanceNumber: number): string {
  const num = String(instanceNumber).padStart(2, '0');
  return `${agentTypeName} ${num}`;
}

/**
 * Parse an instance ID to extract its components.
 */
export function parseAgentInstanceId(instanceId: string): {
  agentTypeId: string;
  instanceNumber: number;
  random: string;
} | null {
  const match = instanceId.match(/^([a-z-]+)-(\d{2})-([a-z0-9]+)$/);
  if (!match) return null;
  return {
    agentTypeId: match[1],
    instanceNumber: parseInt(match[2], 10),
    random: match[3],
  };
}
