import type { BeadIssue } from './types';

export interface AgentRoster {
  name: string;
  status: 'active' | 'stale' | 'stuck' | 'dead';
  currentTask?: string;
}

export interface SwarmCard {
  swarmId: string;
  title: string;
  agents: AgentRoster[];
  attentionItems: string[];
  progress: number;
  lastActivity: Date;
  health: 'active' | 'stale' | 'stuck' | 'dead';
}

const STALE_THRESHOLD_MS = 15 * 60 * 1000;
const DEAD_THRESHOLD_MS = 60 * 60 * 1000;

function extractSwarmId(labels: string[]): string | null {
  const swarmLabel = labels.find((l) => l.startsWith('swarm:'));
  return swarmLabel ? swarmLabel.slice(6) : null;
}

function isAgent(labels: string[]): boolean {
  return labels.includes('gt:agent');
}

function deriveAgentStatus(lastActivity: string, now: Date): 'active' | 'stale' | 'stuck' | 'dead' {
  const last = new Date(lastActivity).getTime();
  const diffMs = now.getTime() - last;

  if (diffMs >= DEAD_THRESHOLD_MS) return 'dead';
  if (diffMs >= 2 * STALE_THRESHOLD_MS) return 'stuck';
  if (diffMs >= STALE_THRESHOLD_MS) return 'stale';
  return 'active';
}

function deriveSwarmHealth(
  agents: AgentRoster[],
  lastActivity: Date,
  now: Date
): 'active' | 'stale' | 'stuck' | 'dead' {
  if (agents.length === 0) {
    const diffMs = now.getTime() - lastActivity.getTime();
    if (diffMs >= DEAD_THRESHOLD_MS) return 'dead';
    if (diffMs >= STALE_THRESHOLD_MS) return 'stale';
    return 'active';
  }

  const activeCount = agents.filter((a) => a.status === 'active').length;
  const stuckCount = agents.filter((a) => a.status === 'stuck').length;
  const deadCount = agents.filter((a) => a.status === 'dead').length;

  if (deadCount === agents.length) return 'dead';
  if (stuckCount + deadCount >= agents.length / 2) return 'stuck';
  if (activeCount === 0) return 'stale';
  return 'active';
}

function calculateProgress(beads: BeadIssue[]): number {
  if (beads.length === 0) return 0;

  const closedCount = beads.filter((b) => b.status === 'closed').length;
  return Math.round((closedCount / beads.length) * 100);
}

function getAttentionItems(beads: BeadIssue[]): string[] {
  return beads
    .filter((b) => b.status === 'blocked' || b.status === 'in_progress')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map((b) => `${b.id}: ${b.title}`);
}

function toAgentName(id: string): string {
  if (id.startsWith('bb-')) return id.slice(3);
  return id;
}

export function buildSwarmCards(beads: BeadIssue[], now: Date = new Date()): SwarmCard[] {
  const epicById = new Map<string, BeadIssue>();
  const beadsBySwarm = new Map<string, BeadIssue[]>();
  const agentsBySwarm = new Map<string, BeadIssue[]>();

  for (const bead of beads) {
    if (bead.issue_type === 'epic') {
      epicById.set(bead.id, bead);
    }

    const swarmId = extractSwarmId(bead.labels);
    if (swarmId) {
      if (isAgent(bead.labels)) {
        const agents = agentsBySwarm.get(swarmId) || [];
        agents.push(bead);
        agentsBySwarm.set(swarmId, agents);
      } else {
        const swarmBeads = beadsBySwarm.get(swarmId) || [];
        swarmBeads.push(bead);
        beadsBySwarm.set(swarmId, swarmBeads);
      }
    }
  }

  const cards: SwarmCard[] = [];

  for (const [swarmId, swarmBeads] of beadsBySwarm) {
    const epic = epicById.get(swarmId);
    const title = epic?.title || `Swarm ${swarmId}`;

    const agentBeads = agentsBySwarm.get(swarmId) || [];
    const agents: AgentRoster[] = agentBeads.map((a) => ({
      name: toAgentName(a.id),
      status: deriveAgentStatus(a.updated_at, now),
      currentTask: a.assignee || undefined,
    }));

    const allTimestamps = swarmBeads
      .map((b) => new Date(b.updated_at).getTime())
      .filter((t) => !isNaN(t));
    const lastActivity = allTimestamps.length > 0
      ? new Date(Math.max(...allTimestamps))
      : new Date(0);

    const health = deriveSwarmHealth(agents, lastActivity, now);
    const progress = calculateProgress(swarmBeads);
    const attentionItems = getAttentionItems(swarmBeads);

    cards.push({
      swarmId,
      title,
      agents,
      attentionItems,
      progress,
      lastActivity,
      health,
    });
  }

  for (const [swarmId, agentBeads] of agentsBySwarm) {
    if (!beadsBySwarm.has(swarmId)) {
      const epic = epicById.get(swarmId);
      const title = epic?.title || `Swarm ${swarmId}`;

      const agents: AgentRoster[] = agentBeads.map((a) => ({
        name: toAgentName(a.id),
        status: deriveAgentStatus(a.updated_at, now),
      }));

      const allTimestamps = agentBeads
        .map((b) => new Date(b.updated_at).getTime())
        .filter((t) => !isNaN(t));
      const lastActivity = allTimestamps.length > 0
        ? new Date(Math.max(...allTimestamps))
        : new Date(0);

      cards.push({
        swarmId,
        title,
        agents,
        attentionItems: [],
        progress: 0,
        lastActivity,
        health: deriveSwarmHealth(agents, lastActivity, now),
      });
    }
  }

  return cards.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
}

export function getSwarmCardSummary(cards: SwarmCard[]): {
  total: number;
  active: number;
  stale: number;
  stuck: number;
  dead: number;
} {
  return {
    total: cards.length,
    active: cards.filter((c) => c.health === 'active').length,
    stale: cards.filter((c) => c.health === 'stale').length,
    stuck: cards.filter((c) => c.health === 'stuck').length,
    dead: cards.filter((c) => c.health === 'dead').length,
  };
}
