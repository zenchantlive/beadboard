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

export type AgentCommandName = 'agent register' | 'agent list' | 'agent show' | 'agent activity-lease' | 'agent state';

export type AgentZfcState = 'idle' | 'spawning' | 'running' | 'working' | 'stuck' | 'done' | 'stopped' | 'dead';

export interface AgentCommandError {
  code: string;
  message: string;
}

export interface AgentCommandResponse<T> {
  ok: boolean;
  command: AgentCommandName;
  data: T | null;
  error: AgentCommandError | null;
}

export interface AgentRecord {
  agent_id: string;
  display_name: string;
  role: string;
  status: string;
  created_at: string;
  last_seen_at: string;
  version: number;
  rig?: string;
  role_type?: string;
  swarm_id?: string;
  current_task?: string;
}

export interface RegisterAgentInput {
  name: string;
  display?: string;
  role: string;
  forceUpdate?: boolean;
  rig?: string;
}

export interface RegisterAgentDeps {
  now: () => string;
  projectRoot: string;
}

export interface ListAgentsInput {
  role?: string;
  status?: string;
}

export interface ShowAgentInput {
  agent: string;
}

export interface ActivityLeaseInput {
  agent: string;
}

export type AgentLiveness = 'active' | 'stale' | 'evicted' | 'idle';

// Mail/Messaging types
export const MESSAGE_CATEGORIES = ['HANDOFF', 'BLOCKED', 'DECISION', 'INFO'] as const;
export const MESSAGE_STATES = ['unread', 'read', 'acked'] as const;

export type MessageCategory = typeof MESSAGE_CATEGORIES[number];
export type MessageState = typeof MESSAGE_STATES[number];
export type MailCommandName = 'agent send' | 'agent inbox' | 'agent read' | 'agent ack';

export interface MailCommandError {
  code: string;
  message: string;
}

export interface MailCommandResponse<T> {
  ok: boolean;
  command: MailCommandName;
  data: T | null;
  error: MailCommandError | null;
}

export interface AgentMessage {
  message_id: string;
  thread_id: string;
  bead_id: string;
  from_agent: string;
  to_agent: string;
  category: MessageCategory;
  subject: string;
  body: string;
  state: MessageState;
  requires_ack: boolean;
  created_at: string;
  read_at: string | null;
  acked_at: string | null;
}

export interface SendAgentMessageInput {
  from: string;
  to: string;
  bead: string;
  category: MessageCategory;
  subject: string;
  body: string;
  thread?: string;
}

export interface SendAgentMessageDeps {
  now: () => string;
  idGenerator: () => string;
}

export interface InboxAgentMessagesInput {
  agent: string;
  state?: MessageState;
  bead?: string;
  limit?: number;
}

export interface MessageActionInput {
  agent: string;
  message: string;
}

export interface MessageMutationDeps {
  now: () => string;
}
