import fs from 'node:fs/promises';
import path from 'node:path';

import type { AgentMessage } from './agent-mail';
import { classifyOverlap, normalizePath } from './agent-reservations';
import type { CoordEventEnvelope } from './coord-schema';

export type CoordProtocolEvent = CoordEventEnvelope;
export type TakeoverMode = 'stale' | 'evicted';

export interface ProjectedCoordMessage {
  message_id: string;
  thread_id: string;
  bead_id: string;
  from_agent: string;
  to_agent: string;
  category: 'HANDOFF' | 'BLOCKED' | 'DECISION' | 'INFO';
  subject: string;
  body: string;
  state: 'unread' | 'read' | 'acked';
  requires_ack: boolean;
  created_at: string;
  read_at: string | null;
  acked_at: string | null;
}

export interface ProjectedReservation {
  scope: string;
  normalized_scope: string;
  agent_id: string;
  bead_id: string;
  state: 'active';
  created_at: string;
  takeover_mode: TakeoverMode | null;
}

export interface ProjectedReservationIncursion {
  scope: string;
  agents: string[];
  severity: 'exact' | 'partial';
}

type MessageState = 'unread' | 'read' | 'acked';
type EventRefMap = Map<string, { state: MessageState; readAt: string | null; ackedAt: string | null }>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toCategory(value: unknown): ProjectedCoordMessage['category'] {
  if (value === 'HANDOFF' || value === 'BLOCKED' || value === 'DECISION' || value === 'INFO') {
    return value;
  }
  return 'INFO';
}

function requiresAck(category: ProjectedCoordMessage['category']): boolean {
  return category === 'HANDOFF' || category === 'BLOCKED';
}

export async function readCoordEventsFromDisk(projectRoot: string): Promise<CoordProtocolEvent[]> {
  const filePath = path.join(projectRoot, '.beads', 'interactions.jsonl');
  let raw = '';
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const events: CoordProtocolEvent[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!isObject(parsed)) continue;
      if (parsed.version !== 'coord.v1' || parsed.kind !== 'coord_event') continue;
      events.push(parsed as unknown as CoordProtocolEvent);
    } catch {
      continue;
    }
  }

  return events;
}

export function projectMessageState(events: CoordProtocolEvent[]): Map<string, MessageState> {
  const stateMap = new Map<string, MessageState>();
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const event of sorted) {
    if (event.data.event_type === 'SEND') {
      stateMap.set(event.data.event_id, 'unread');
      continue;
    }
    const ref = event.data.event_ref;
    if (!ref || !stateMap.has(ref)) continue;
    if (event.data.event_type === 'READ') {
      stateMap.set(ref, 'read');
    }
    if (event.data.event_type === 'ACK') {
      stateMap.set(ref, 'acked');
    }
  }

  return stateMap;
}

function projectMessageStateDetails(events: CoordProtocolEvent[]): EventRefMap {
  const details: EventRefMap = new Map();
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const event of sorted) {
    if (event.data.event_type === 'SEND') {
      details.set(event.data.event_id, { state: 'unread', readAt: null, ackedAt: null });
      continue;
    }
    const ref = event.data.event_ref;
    if (!ref) continue;
    const current = details.get(ref);
    if (!current) continue;
    if (event.data.event_type === 'READ' && current.state === 'unread') {
      current.state = 'read';
      current.readAt = event.timestamp;
    }
    if (event.data.event_type === 'ACK') {
      current.state = 'acked';
      if (!current.readAt) current.readAt = event.timestamp;
      current.ackedAt = event.timestamp;
    }
  }
  return details;
}

export function projectInbox(
  events: CoordProtocolEvent[],
  beadId?: string,
  agentId?: string,
): ProjectedCoordMessage[] {
  const messageState = projectMessageStateDetails(events);
  const messages: ProjectedCoordMessage[] = [];
  const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  for (const event of sorted) {
    if (event.data.event_type !== 'SEND') continue;
    if (beadId && event.issue_id !== beadId) continue;
    if (agentId && event.data.to_agent !== agentId) continue;
    const payload = isObject(event.data.payload) ? event.data.payload : {};
    const category = toCategory(payload.category);
    const state = messageState.get(event.data.event_id) ?? { state: 'unread', readAt: null, ackedAt: null };

    messages.push({
      message_id: event.data.event_id,
      thread_id: `bead:${event.issue_id}`,
      bead_id: event.issue_id,
      from_agent: event.actor,
      to_agent: typeof event.data.to_agent === 'string' ? event.data.to_agent : 'unknown',
      category,
      subject: typeof payload.subject === 'string' ? payload.subject : '',
      body: typeof payload.body === 'string' ? payload.body : '',
      state: state.state,
      requires_ack: requiresAck(category),
      created_at: event.timestamp,
      read_at: state.readAt,
      acked_at: state.ackedAt,
    });
  }

  return messages;
}

export async function projectInboxFromDisk(projectRoot: string, beadId?: string, agentId?: string): Promise<AgentMessage[]> {
  const events = await readCoordEventsFromDisk(projectRoot);
  return projectInbox(events, beadId, agentId);
}

export function isTakeoverAllowed(ownerLiveness: string, mode: TakeoverMode): boolean {
  if (ownerLiveness === 'active') return false;
  if (ownerLiveness === 'stale') return mode === 'stale';
  if (ownerLiveness === 'evicted') return mode === 'stale' || mode === 'evicted';
  return false;
}

export function projectReservations(
  events: CoordProtocolEvent[],
  livenessMap: Record<string, string> = {},
): ProjectedReservation[] {
  const activeByScope = new Map<string, ProjectedReservation>();
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const event of sorted) {
    const type = event.data.event_type;
    if (type !== 'RESERVE' && type !== 'RELEASE' && type !== 'TAKEOVER') continue;

    const rawScope = typeof event.data.scope === 'string' ? event.data.scope : '';
    if (!rawScope) continue;
    const normalizedScope = normalizePath(rawScope.replace(/\*$/, ''));
    const key = `${event.data.project_root}:${normalizedScope}`;

    if (type === 'RELEASE') {
      activeByScope.delete(key);
      continue;
    }

    if (type === 'RESERVE') {
      activeByScope.set(key, {
        scope: rawScope,
        normalized_scope: normalizedScope,
        agent_id: event.actor,
        bead_id: event.issue_id,
        state: 'active',
        created_at: event.timestamp,
        takeover_mode: null,
      });
      continue;
    }

    if (type === 'TAKEOVER') {
      const mode = event.data.takeover_mode;
      if (mode !== 'stale' && mode !== 'evicted') continue;
      const existing = activeByScope.get(key);
      if (existing) {
        const ownerLiveness = livenessMap[existing.agent_id] ?? 'active';
        if (!isTakeoverAllowed(ownerLiveness, mode)) {
          continue;
        }
      }
      activeByScope.set(key, {
        scope: rawScope,
        normalized_scope: normalizedScope,
        agent_id: event.actor,
        bead_id: event.issue_id,
        state: 'active',
        created_at: event.timestamp,
        takeover_mode: mode,
      });
    }
  }

  return [...activeByScope.values()];
}

export function calculateReservationIncursions(reservations: ProjectedReservation[]): ProjectedReservationIncursion[] {
  const incursions: ProjectedReservationIncursion[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < reservations.length; i++) {
    for (let j = i + 1; j < reservations.length; j++) {
      const left = reservations[i];
      const right = reservations[j];
      if (left.agent_id === right.agent_id) continue;

      const overlap = classifyOverlap(left.scope, right.scope);
      if (overlap === 'disjoint') continue;

      const key = [left.agent_id, right.agent_id].sort().join(':') + ':' + [left.scope, right.scope].sort().join('|');
      if (processedPairs.has(key)) continue;
      processedPairs.add(key);

      incursions.push({
        scope: overlap === 'exact' ? left.scope : `${left.scope} ↔ ${right.scope}`,
        agents: [left.agent_id, right.agent_id],
        severity: overlap,
      });
    }
  }

  return incursions;
}
