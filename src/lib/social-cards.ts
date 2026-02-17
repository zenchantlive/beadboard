import type { BeadIssue } from './types';
export type { AgentStatus, AgentRole } from '../components/shared/agent-avatar';
import type { AgentStatus, AgentRole } from '../components/shared/agent-avatar';

export type SocialCardStatus = 'ready' | 'in_progress' | 'blocked' | 'closed';

export interface AgentInfo {
  name: string;
  status: AgentStatus;
  role?: AgentRole;
}

export type SocialCardPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export interface SocialCard {
  id: string;
  title: string;
  status: SocialCardStatus;
  blocks: string[];     // tasks THIS task blocks (amber) - what I block
  unblocks: string[];  // tasks blocking THIS task (rose) - what blocks me
  agents: AgentInfo[];
  lastActivity: Date;
  priority: SocialCardPriority;
}

function mapStatus(status: BeadIssue['status']): SocialCardStatus {
  switch (status) {
    case 'open':
      return 'ready';
    case 'in_progress':
      return 'in_progress';
    case 'blocked':
      return 'blocked';
    case 'closed':
    case 'tombstone':
      return 'closed';
    case 'deferred':
    case 'pinned':
    case 'hooked':
      return 'ready';
    default:
      return 'ready';
  }
}

function mapPriority(priority: number): SocialCardPriority {
  if (priority <= 0) return 'P0';
  if (priority === 1) return 'P1';
  if (priority === 2) return 'P2';
  if (priority === 3) return 'P3';
  return 'P4';
}

function extractAgents(bead: BeadIssue): AgentInfo[] {
  const agents: AgentInfo[] = [];
  if (bead.assignee) {
    const agentStatus: AgentStatus = 
      typeof bead.metadata?.agentStatus === 'string' 
        ? (bead.metadata.agentStatus as AgentStatus) 
        : 'active';
    
    const agentRole: AgentRole | undefined = 
      typeof bead.metadata?.agentRole === 'string'
        ? (bead.metadata.agentRole as AgentRole)
        : undefined;

    agents.push({ 
      name: bead.assignee, 
      status: agentStatus,
      role: agentRole
    });
  }
  return agents;
}

export function buildSocialCards(beads: BeadIssue[]): SocialCard[] {
  const beadMap = new Map<string, BeadIssue>();
  for (const bead of beads) {
    beadMap.set(bead.id, bead);
  }

  const blocksIncoming = new Map<string, string[]>();
  const blocksOutgoing = new Map<string, string[]>();

  for (const bead of beads) {
    blocksIncoming.set(bead.id, []);
    blocksOutgoing.set(bead.id, []);
  }

  for (const bead of beads) {
    for (const dep of bead.dependencies) {
      if (dep.type === 'blocks' && beadMap.has(dep.target)) {
        const outgoing = blocksOutgoing.get(bead.id) ?? [];
        outgoing.push(dep.target);
        blocksOutgoing.set(bead.id, outgoing);

        const incoming = blocksIncoming.get(dep.target) ?? [];
        incoming.push(bead.id);
        blocksIncoming.set(dep.target, incoming);
      }
    }
  }

  return beads.map((bead) => ({
    id: bead.id,
    title: bead.title,
    status: mapStatus(bead.status),
    blocks: blocksOutgoing.get(bead.id) ?? [],   // what I block (amber)
    unblocks: blocksIncoming.get(bead.id) ?? [], // what blocks me (rose)
    agents: extractAgents(bead),
    lastActivity: new Date(bead.updated_at),
    priority: mapPriority(bead.priority),
  }));
}

