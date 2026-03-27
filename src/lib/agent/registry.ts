import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { runBdCommand } from '../bridge';
import { activityEventBus } from '../realtime';
import type {
  AgentCommandName,
  AgentZfcState,
  AgentCommandError,
  AgentCommandResponse,
  AgentRecord,
  RegisterAgentInput,
  RegisterAgentDeps,
  ListAgentsInput,
  ShowAgentInput,
  ActivityLeaseInput,
  AgentLiveness,
} from './types';
import {
  AGENT_INSTANCE_LABEL_PREFIX,
  AGENT_TYPE_LABEL_PREFIX,
  LEGACY_AGENT_LABEL,
  RUNTIME_INSTANCE_LABEL,
  extractAgentInstanceLabel,
  extractAgentTypeLabel,
  fromAgentBeadId,
  isRuntimeAgentLabels,
  normalizeAgentHandle,
  toAgentBeadId,
} from './identity';

const AGENT_ID_PATTERN = /^[a-z0-9][a-z0-9./#_-]*$/i;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const agentCache = new Map<string, CacheEntry<AgentRecord | null>>();
const CACHE_TTL_MS = 30_000;
type BdRunner = typeof runBdCommand;

type AgentRegistryDeps = Partial<RegisterAgentDeps> & {
  runBd?: BdRunner;
};

function getAgentCacheKey(projectRoot: string, beadId: string): string {
  return `${projectRoot}::${beadId}`;
}

function getCachedAgent(projectRoot: string, beadId: string): AgentRecord | null | undefined {
  const cacheKey = getAgentCacheKey(projectRoot, beadId);
  const entry = agentCache.get(cacheKey);
  if (!entry) {
    return undefined;  // Cache miss
  }
  if (entry.expiresAt > Date.now()) {
    return entry.data;  // Valid cache hit (could be null or AgentRecord)
  }
  agentCache.delete(cacheKey);  // Expired entry
  return null;  // Treat expired as miss
}

function setCachedAgent(projectRoot: string, beadId: string, data: AgentRecord | null): void {
  agentCache.set(getAgentCacheKey(projectRoot, beadId), { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function invalidateCachedAgent(projectRoot: string, beadId: string): void {
  agentCache.delete(getAgentCacheKey(projectRoot, beadId));
}

function extractJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON block found in output');
  }
  const jsonPart = text.slice(start, end + 1);
  return JSON.parse(jsonPart);
}

function extractJsonArray(text: string): any[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) {
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

function extractAgentStateLabel(labels: readonly string[]): string | undefined {
  const stateLabel = labels.find((label) => label.startsWith('agent-state:') || label.startsWith('state:'));
  if (!stateLabel) return undefined;
  return stateLabel.split(':').slice(1).join(':') || undefined;
}

async function readAgentBeadEntries(projectRoot: string, runBd: BdRunner): Promise<any[]> {
  const listResult = await runBd({
    projectRoot,
    args: ['list', '--all', '--label', LEGACY_AGENT_LABEL, '--json'],
    timeoutMs: 120_000,
  });

  if (!listResult.success) {
    throw new Error(`Failed to list agents from bd: ${listResult.error}`);
  }

  return extractJsonArray(listResult.stdout);
}

async function callBdAgentShow(
  beadId: string,
  projectRoot: string,
  runBd: BdRunner,
  options: { refresh?: boolean } = {},
): Promise<AgentRecord | null> {
  if (options.refresh) {
    invalidateCachedAgent(projectRoot, beadId);
  }

  const cached = getCachedAgent(projectRoot, beadId);
  if (cached !== undefined) {
    return cached;  // Valid cache hit (could be null or AgentRecord)
  }

  let record: AgentRecord | null = null;
  try {
    const beadRecord = (await readAgentBeadEntries(projectRoot, runBd)).find((entry) => entry.id === beadId) ?? null;
    record = beadRecord ? mapBdAgentToRecord(beadRecord) : null;
  } catch {
    record = null;
  }

  setCachedAgent(projectRoot, beadId, record);
  return record;
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
  if (!AGENT_ID_PATTERN.test(value) || value.length < 3 || value.length > 96) {
    return {
      code: 'INVALID_AGENT_ID',
      message: 'Agent id must be 3..96 characters and use letters, numbers, ".", "/", "#", "_" or "-".',
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
  const labels = Array.isArray(bdAgent.labels)
    ? bdAgent.labels.filter((label: unknown): label is string => typeof label === 'string')
    : [];
  let role = bdAgent.role_type || 'agent';
  let swarmId: string | undefined;
  let currentTask: string | undefined;
  let status = bdAgent.agent_state;

  if (labels.length > 0) {
    const roleLabel = labels.find((l: string) => l.startsWith('role:'));
    if (roleLabel) {
      role = roleLabel.split(':')[1];
    }
    const swarmLabel = labels.find((l: string) => l.startsWith('swarm:'));
    if (swarmLabel) {
      swarmId = swarmLabel.split(':')[1];
    }
    const workingLabel = labels.find((l: string) => l.startsWith('working:'));
    if (workingLabel) {
      currentTask = workingLabel.split(':')[1];
    }
    status = status || extractAgentStateLabel(labels);
  }

  const agentTypeId = extractAgentTypeLabel(labels) ?? normalizeAgentHandle(role);
  const agentInstanceId = extractAgentInstanceLabel(labels) ?? fromAgentBeadId(bdAgent.id);
  let rig = bdAgent.rig;
  if (!rig && labels.length > 0) {
    const rigLabel = labels.find((l: string) => l.startsWith('rig:'));
    if (rigLabel) {
      rig = rigLabel.split(':')[1];
    }
  }

  const record: AgentRecord = {
    agent_id: agentInstanceId,
    display_name: bdAgent.title?.replace(/^Agent: /, '') || agentInstanceId,
    role,
    status: status || 'idle',
    created_at: bdAgent.created_at || bdAgent.last_activity || bdAgent.updated_at || new Date().toISOString(),
    last_seen_at: bdAgent.last_activity || bdAgent.updated_at || bdAgent.created_at || new Date().toISOString(),
    version: 1,
    rig,
    role_type: bdAgent.role_type,
    swarm_id: swarmId,
    current_task: currentTask,
    agent_type_id: agentTypeId,
    agent_instance_id: agentInstanceId,
    identity_kind: isRuntimeAgentLabels(labels) ? 'runtime-instance' : undefined,
  };
  return record;
}

export async function registerAgent(
  input: RegisterAgentInput,
  deps: AgentRegistryDeps = {},
): Promise<AgentCommandResponse<AgentRecord>> {
  const command: AgentCommandName = 'agent register';
  const name = trimOrEmpty(input.name);
  const role = trimOrEmpty(input.role);
  const display = trimOrEmpty(input.display) || name;
  const projectRoot = deps.projectRoot || process.cwd();
  const runBd = deps.runBd ?? runBdCommand;

  const agentIdError = validateAgentId(name);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  const roleError = validateRole(role);
  if (roleError) {
    return invalid(command, roleError.code, roleError.message);
  }

  try {
    const beadId = toAgentBeadId(name);
    const agentTypeId = normalizeAgentHandle(role);
    const agentInstanceId = normalizeAgentHandle(name);

    const showResult = await runBd({
      projectRoot,
      args: ['agent', 'show', beadId, '--json'],
    });

    if (showResult.success && !input.forceUpdate) {
      return invalid(command, 'DUPLICATE_AGENT_ID', 'Agent is already registered. Use --force-update to change display/role.');
    }

    if (!showResult.success) {
      const createResult = await runBd({
        projectRoot,
        args: [
          'create',
          '--id',
          beadId,
          '--force',
          '--title',
          `Agent: ${display}`,
          '--description',
          `Runtime instance for archetype ${role}`,
          '--type',
          'task',
          '--priority',
          '0',
          '--json',
        ],
      });

      if (!createResult.success) {
        return invalid(command, 'INTERNAL_ERROR', `Failed to create agent bead: ${createResult.error}`);
      }
    }

    const existingAgent = showResult.success
      ? (await readAgentBeadEntries(projectRoot, runBd)).find((entry) => entry.id === beadId) ?? null
      : null;
    const existingLabels = Array.isArray(existingAgent?.labels)
      ? existingAgent.labels.filter((label: unknown): label is string => typeof label === 'string')
      : [];
    const labels = existingLabels.filter(
      (label: string) =>
        label !== LEGACY_AGENT_LABEL &&
        label !== RUNTIME_INSTANCE_LABEL &&
        !label.startsWith('role:') &&
        !label.startsWith('rig:') &&
        !label.startsWith('agent-state:') &&
        !label.startsWith(AGENT_TYPE_LABEL_PREFIX) &&
        !label.startsWith(AGENT_INSTANCE_LABEL_PREFIX) &&
        !label.startsWith('state:'),
    );
    labels.unshift(LEGACY_AGENT_LABEL, RUNTIME_INSTANCE_LABEL);
    if (role) {
      labels.push(`role:${role}`);
    }
    labels.push(`${AGENT_TYPE_LABEL_PREFIX}${agentTypeId}`);
    labels.push(`${AGENT_INSTANCE_LABEL_PREFIX}${agentInstanceId}`);
    if (input.rig) {
      labels.push(`rig:${input.rig}`);
    }
    labels.push('agent-state:idle');

    const updateArgs = ['update', beadId, '--title', `Agent: ${display}`, '--status', 'deferred'];
    for (const label of labels) {
      updateArgs.push('--set-labels', label);
    }

    const updateResult = await runBd({
      projectRoot,
      args: [...updateArgs, '--json'],
    });

    if (!updateResult.success) {
      console.error('Update failed:', updateResult.error, updateResult.stdout, updateResult.stderr);
      return invalid(command, 'INTERNAL_ERROR', `Failed to update agent details: ${updateResult.error}`);
    }

    const flushResult = await runBd({
      projectRoot,
      args: ['admin', 'flush'],
    });
    if (!flushResult.success) {
      console.error('Flush failed:', flushResult.error, flushResult.stdout, flushResult.stderr);
    }

    const record = await callBdAgentShow(beadId, projectRoot, runBd, { refresh: true });
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
  deps: AgentRegistryDeps = {},
): Promise<AgentCommandResponse<AgentRecord[]>> {
  const command: AgentCommandName = 'agent list';
  const role = trimOrEmpty(input.role);
  const status = trimOrEmpty(input.status);
  const projectRoot = deps.projectRoot || process.cwd();
  const runBd = deps.runBd ?? runBdCommand;

  try {
    const rawList = await readAgentBeadEntries(projectRoot, runBd);
    if (rawList.length === 0) {
      return success(command, []);
    }

    const agents = rawList
      .map((item) => mapBdAgentToRecord(item))
      .filter((record) => (!role || record.role === role) && (!status || record.status === status));

    return success(command, agents.sort((a, b) => a.agent_id.localeCompare(b.agent_id)));
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to list agents.');
  }
}

export async function showAgent(
  input: ShowAgentInput,
  deps: AgentRegistryDeps = {},
): Promise<AgentCommandResponse<AgentRecord>> {
  const command: AgentCommandName = 'agent show';
  const name = trimOrEmpty(input.agent);
  const projectRoot = deps.projectRoot || process.cwd();
  const runBd = deps.runBd ?? runBdCommand;

  const agentIdError = validateAgentId(name);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  try {
    const beadId = toAgentBeadId(name);
    const record = await callBdAgentShow(beadId, projectRoot, runBd);

    if (!record) {
      return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
    }

    return success(command, record);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to load agent.');
  }
}

export async function setAgentState(
  input: { agent: string; state: AgentZfcState },
  deps: AgentRegistryDeps = {},
): Promise<AgentCommandResponse<AgentRecord>> {
  const command: AgentCommandName = 'agent state';
  const name = trimOrEmpty(input.agent);
  const state = input.state;
  const projectRoot = deps.projectRoot || process.cwd();
  const runBd = deps.runBd ?? runBdCommand;

  const agentIdError = validateAgentId(name);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  try {
    const beadId = toAgentBeadId(name);

    const existingAgent = (await readAgentBeadEntries(projectRoot, runBd)).find((entry) => entry.id === beadId) ?? null;
    if (!existingAgent) {
      return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
    }

    const existingLabels = Array.isArray(existingAgent.labels)
      ? existingAgent.labels.filter((label: unknown): label is string => typeof label === 'string')
      : [];
    const labels = existingLabels.filter(
      (label: string) => !label.startsWith('agent-state:') && !label.startsWith('state:'),
    );
    labels.push(`agent-state:${state}`);

    const issueStatus = state === 'done' || state === 'stopped' || state === 'dead'
      ? 'closed'
      : 'deferred';

    const stateResult = await runBd({
      projectRoot,
      args: ['update', beadId, '--status', issueStatus, ...labels.flatMap((label: string) => ['--set-labels', label]), '--json'],
    });

    if (!stateResult.success) {
      return invalid(command, 'INTERNAL_ERROR', `Failed to set agent state: ${stateResult.error}`);
    }

    const record = await callBdAgentShow(beadId, projectRoot, runBd, { refresh: true });
    if (!record) {
      return invalid(command, 'INTERNAL_ERROR', 'Failed to retrieve agent state after update.');
    }

    return success(command, record);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to set agent state.');
  }
}

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

export async function extendActivityLease(
  input: ActivityLeaseInput,
  deps: AgentRegistryDeps = {},
): Promise<AgentCommandResponse<AgentRecord | null>> {
  const command: AgentCommandName = 'agent activity-lease';
  const name = trimOrEmpty(input.agent);
  const projectRoot = deps.projectRoot || process.cwd();
  const runBd = deps.runBd ?? runBdCommand;

  const agentIdError = validateAgentId(name);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  try {
    const beadId = toAgentBeadId(name);
    
    const wispResult = await runBd({
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

    return success(command, null);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to extend activity lease.');
  }
}
