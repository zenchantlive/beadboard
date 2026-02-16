export type ProtocolEventType = 'HANDOFF' | 'BLOCKED' | 'INCURSION' | 'RESUME' | 'INFO';

export interface ProtocolEventEnvelope<T = any> {
  id: string;
  version: 'v1';
  event_type: ProtocolEventType;
  project_root: string;
  bead_id: string;
  from_agent: string | null;
  to_agent: string | null;
  scope: string | null;
  created_at: string;
  payload: T;
}

export type ProtocolEvent = ProtocolEventEnvelope;

export interface CreateProtocolEventInput {
  event_type: ProtocolEventType;
  project_root: string;
  bead_id: string;
  from_agent?: string;
  to_agent?: string;
  scope?: string;
  payload: any;
}

export interface ProtocolDeps {
  now: () => string;
  idGenerator: () => string;
}

export function createProtocolEvent(
  input: CreateProtocolEventInput,
  deps: Partial<ProtocolDeps> = {}
): ProtocolEvent {
  const now = deps.now ? deps.now() : new Date().toISOString();
  const generateId = deps.idGenerator ?? (() => `proto_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`);

  return {
    id: generateId(),
    version: 'v1',
    event_type: input.event_type,
    project_root: input.project_root,
    bead_id: input.bead_id,
    from_agent: input.from_agent ?? null,
    to_agent: input.to_agent ?? null,
    scope: input.scope ?? null,
    created_at: now,
    payload: input.payload,
  };
}
