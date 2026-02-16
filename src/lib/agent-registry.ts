import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { runBdCommand } from './bridge';
import { activityEventBus } from './realtime';

const AGENT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

/**
 * Normalizes agent name to bead ID with prefix.
 * e.g. "silver-castle" -> "bb-silver-castle"
 */
function toBeadId(name: string): string {
  const trimmed = name.trim();
  if (trimmed.startsWith('bb-')) return trimmed;
  return `bb-${trimmed}`;
}

/**
 * Strips prefix from bead ID for display/internal logic.
 * e.g. "bb-silver-castle" -> "silver-castle"
 */
function fromBeadId(id: string): string {
  if (id.startsWith('bb-')) return id.slice(3);
  return id;
}

/**
 * Robustly extracts the first JSON block from a potentially noisy string.
 * Handles cases where 'bd' outputs warnings or daemon logs before the JSON.
 */
function extractJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON block found in output');
  }
  const jsonPart = text.slice(start, end + 1);
  return JSON.parse(jsonPart);
}

/**
 * Robustly extracts the first JSON array from a potentially noisy string.
 */
function extractJsonArray(text: string): any[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) {
    // Check if it's a single object instead
    try {
      const single = extractJson(text);
      return [single];
    } catch {
      return [];
    }
  }
  const jsonPart = text.slice(start, end + 1);
  return JSON.parse(jsonPart);
}

function trimOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Internal helper to fetch and parse agent details robustly.
 */
async function callBdAgentShow(beadId: string, projectRoot: string): Promise<AgentRecord | null> {
  const showResult = await runBdCommand({
    projectRoot,
    args: ['show', beadId, '--json'],
  });

  if (!showResult.success) {
    return null;
  }

  try {
    const bdAgent = extractJson(showResult.stdout);
    return mapBdAgentToRecord(bdAgent);
  } catch {
    return null;
  }
}

function invalid(command: AgentCommandName, code: string, message: string): AgentCommandResponse<never> {
  return {
    ok: false,
    command,
    data: null,
    error: { code, message },
  };
}

function success<T>(command: AgentCommandName, data: T): AgentCommandResponse<T> {
  return {
    ok: true,
    command,
    data,
    error: null,
  };
}

function validateAgentId(value: string): AgentCommandError | null {
  if (!AGENT_ID_PATTERN.test(value) || value.length < 3 || value.length > 48) {
    return {
      code: 'INVALID_AGENT_ID',
      message: 'Agent id must match ^[a-z0-9]+(?:-[a-z0-9]+)*$ and be 3..48 characters.',
    };
  }

  return null;
}

function validateRole(value: string): AgentCommandError | null {
  if (!value) {
    return {
      code: 'INVALID_ROLE',
      message: 'Role is required.',
    };
  }

  return null;
}

function mapBdAgentToRecord(bdAgent: any): AgentRecord {
  // Extract role from labels if role_type is not set
  let role = bdAgent.role_type || 'agent';
  if (role === 'agent' && Array.isArray(bdAgent.labels)) {
    const roleLabel = bdAgent.labels.find((l: string) => l.startsWith('role:'));
    if (roleLabel) {
      role = roleLabel.split(':')[1];
    }
  }

  let rig = bdAgent.rig;
  if (!rig && Array.isArray(bdAgent.labels)) {
    const rigLabel = bdAgent.labels.find((l: string) => l.startsWith('rig:'));
    if (rigLabel) {
      rig = rigLabel.split(':')[1];
    }
  }

  const record: AgentRecord = {
    agent_id: fromBeadId(bdAgent.id),
    display_name: bdAgent.title?.replace(/^Agent: /, '') || fromBeadId(bdAgent.id),
    role,
    status: bdAgent.agent_state || 'idle',
    created_at: bdAgent.created_at || bdAgent.last_activity || new Date().toISOString(),
    last_seen_at: bdAgent.last_activity || new Date().toISOString(),
    version: 1,
    rig,
    role_type: bdAgent.role_type,
  };
  return record;
}

export async function registerAgent(
  input: RegisterAgentInput,
  deps: Partial<RegisterAgentDeps> = {},
): Promise<AgentCommandResponse<AgentRecord>> {
  const command: AgentCommandName = 'agent register';
  const name = trimOrEmpty(input.name);
  const role = trimOrEmpty(input.role);
  const display = trimOrEmpty(input.display) || name;
  const projectRoot = deps.projectRoot || process.cwd();

  const agentIdError = validateAgentId(name);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  const roleError = validateRole(role);
  if (roleError) {
    return invalid(command, roleError.code, roleError.message);
  }

  try {
    const beadId = toBeadId(name);
    
    // 1. Check if agent exists
    const showResult = await runBdCommand({
      projectRoot,
      args: ['agent', 'show', beadId, '--json'],
    });

    if (showResult.success && !input.forceUpdate) {
      return invalid(command, 'DUPLICATE_AGENT_ID', 'Agent is already registered. Use --force-update to change display/role.');
    }

    // 2. Set state (auto-creates if missing)
    const stateResult = await runBdCommand({
      projectRoot,
      args: ['agent', 'state', beadId, 'idle', '--json'],
    });

    if (!stateResult.success) {
      return invalid(command, 'INTERNAL_ERROR', `Failed to set agent state: ${stateResult.error}`);
    }

    // 3. Update title, role, and rig via labels
    const labels = ['gt:agent'];
    if (role) {
      labels.push(`role:${role}`);
    }
    if (input.rig) {
      labels.push(`rig:${input.rig}`);
    }

    const updateArgs = ['update', beadId, '--title', `Agent: ${display}`, '--add-label', labels.join(',')];

    const updateResult = await runBdCommand({
      projectRoot,
      args: [...updateArgs, '--json'],
    });

    if (!updateResult.success) {
      console.error('Update failed:', updateResult.error, updateResult.stdout, updateResult.stderr);
      return invalid(command, 'INTERNAL_ERROR', `Failed to update agent details: ${updateResult.error}`);
    }

    // 4. Force flush to ensure issues.jsonl is updated (critical for tests and sync)
    const flushResult = await runBdCommand({
      projectRoot,
      args: ['admin', 'flush'],
    });
    if (!flushResult.success) {
      console.error('Flush failed:', flushResult.error, flushResult.stdout, flushResult.stderr);
    }

    // 5. Return the new record
    const record = await callBdAgentShow(beadId, projectRoot);
    if (!record) {
      return invalid(command, 'INTERNAL_ERROR', 'Failed to retrieve final agent state.');
    }

    return success(command, record);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to register agent.');
  }
}

export async function listAgents(
  input: ListAgentsInput,
  deps: Partial<RegisterAgentDeps> = {},
): Promise<AgentCommandResponse<AgentRecord[]>> {
  const command: AgentCommandName = 'agent list';
  const role = trimOrEmpty(input.role);
  const status = trimOrEmpty(input.status);
  const projectRoot = deps.projectRoot || process.cwd();

  try {
    const listResult = await runBdCommand({
      projectRoot,
      args: ['list', '--label', 'gt:agent', '--json'],
    });

    if (!listResult.success) {
      return invalid(command, 'INTERNAL_ERROR', `Failed to list agents from bd: ${listResult.error}`);
    }

    const rawList = extractJsonArray(listResult.stdout);
    if (rawList.length === 0) {
      return success(command, []);
    }

    const agents: AgentRecord[] = [];
    for (const item of rawList) {
      // Get detailed agent state for each bead found using show
      const record = await callBdAgentShow(item.id, projectRoot);
      if (record) {
        if (role && record.role !== role) continue;
        if (status && record.status !== status) continue;
        
        agents.push(record);
      }
    }

    return success(command, agents.sort((a, b) => a.agent_id.localeCompare(b.agent_id)));
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to list agents.');
  }
}

export async function showAgent(
  input: ShowAgentInput,
  deps: Partial<RegisterAgentDeps> = {},
): Promise<AgentCommandResponse<AgentRecord>> {
  const command: AgentCommandName = 'agent show';
  const name = trimOrEmpty(input.agent);
  const projectRoot = deps.projectRoot || process.cwd();

  const agentIdError = validateAgentId(name);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  try {
    const beadId = toBeadId(name);
    const record = await callBdAgentShow(beadId, projectRoot);

    if (!record) {
      return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
    }

    return success(command, record);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to load agent.');
  }
}

/**
 * Updates the ZFC state of an agent bead.
 */
export async function setAgentState(
  input: { agent: string; state: AgentZfcState },
  deps: Partial<RegisterAgentDeps> = {},
): Promise<AgentCommandResponse<AgentRecord>> {
  const command: AgentCommandName = 'agent state';
  const name = trimOrEmpty(input.agent);
  const state = input.state;
  const projectRoot = deps.projectRoot || process.cwd();

  const agentIdError = validateAgentId(name);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  try {
    const beadId = toBeadId(name);
    
    const stateResult = await runBdCommand({
      projectRoot,
      args: ['agent', 'state', beadId, state, '--json'],
    });

    if (!stateResult.success) {
      return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
    }

    const record = await callBdAgentShow(beadId, projectRoot);
    if (!record) {
      return invalid(command, 'INTERNAL_ERROR', 'Failed to retrieve agent state after update.');
    }

    return success(command, record);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to set agent state.');
  }
}

export type AgentLiveness = 'active' | 'stale' | 'evicted' | 'idle';

/**
 * Derives the liveness state of an agent based on its last seen timestamp.
 * active: < 15m
 * stale: 15m - 30m
 * evicted: 30m - 60m
 * idle: >= 60m
 */
export function deriveLiveness(lastSeenAt: string, now: Date = new Date(), staleMinutes: number = 15): AgentLiveness {
  const lastSeen = new Date(lastSeenAt).getTime();
  const diffMs = now.getTime() - lastSeen;
  const diffMin = diffMs / (1000 * 60);

  if (diffMin >= 60) {
    return 'idle';
  }
  if (diffMin >= 2 * staleMinutes) {
    return 'evicted';
  }
  if (diffMin >= staleMinutes) {
    return 'stale';
  }
  return 'active';
}

/**
 * Extends the activity lease for a registered agent by emitting a native bd wisp.
 * This provides silent observability WITHOUT persistent git churn.
 */
export async function extendActivityLease(
  input: ActivityLeaseInput,
  deps: Partial<RegisterAgentDeps> = {},
): Promise<AgentCommandResponse<AgentRecord | null>> {
  const command: AgentCommandName = 'agent activity-lease';
  const name = trimOrEmpty(input.agent);
  const projectRoot = deps.projectRoot || process.cwd();

  const agentIdError = validateAgentId(name);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  try {
    const beadId = toBeadId(name);
    
    // We create an ephemeral wisp of type 'heartbeat' tied to the agent bead.
    // This refreshes the 'last_activity' in the bd system without mutating issues.jsonl.
    const wispResult = await runBdCommand({
      projectRoot,
      args: [
        'create', 
        `pulse:${name}:${Date.now()}`, 
        '--type', 'event', 
        '--wisp-type', 'heartbeat', 
        '--ephemeral', 
        '--event-actor', beadId,
        '--json'
      ],
    });

    if (!wispResult.success) {
      return invalid(command, 'INTERNAL_ERROR', `Failed to emit heartbeat wisp: ${wispResult.error}`);
    }

    // Emit heartbeat to activity bus for real-time aggregation
    activityEventBus.emit({
      id: randomUUID(),
      kind: 'heartbeat',
      beadId: beadId,
      beadTitle: `Agent: ${name}`,
      projectId: projectRoot,
      projectName: path.basename(projectRoot),
      timestamp: new Date().toISOString(),
      actor: name,
      payload: { message: 'running' }
    });

    // We return ok: true. The actual lease state will be aggregated from wisps.
    return success(command, null);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to extend activity lease.');
  }
}
