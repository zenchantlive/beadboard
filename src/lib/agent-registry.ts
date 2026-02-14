import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const AGENT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type AgentCommandName = 'agent register' | 'agent list' | 'agent show' | 'agent heartbeat';

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
}

export interface RegisterAgentInput {
  name: string;
  display?: string;
  role: string;
  forceUpdate?: boolean;
}

export interface RegisterAgentDeps {
  now: () => string;
}

export interface ListAgentsInput {
  role?: string;
  status?: string;
}

export interface ShowAgentInput {
  agent: string;
}

export interface HeartbeatAgentInput {
  agent: string;
}

export type AgentLiveness = 'active' | 'stale' | 'evicted';

function userProfileRoot(): string {
  return process.env.USERPROFILE?.trim() || os.homedir();
}

export function agentRegistryRoot(): string {
  return path.join(userProfileRoot(), '.beadboard', 'agent');
}

export function agentsDirectoryPath(): string {
  return path.join(agentRegistryRoot(), 'agents');
}

export function agentFilePath(agentId: string): string {
  return path.join(agentsDirectoryPath(), `${agentId}.json`);
}

function trimOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

async function readAgent(agentId: string): Promise<AgentRecord | null> {
  try {
    const raw = await fs.readFile(agentFilePath(agentId), 'utf8');
    const parsed = JSON.parse(raw) as AgentRecord;
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function writeAgent(record: AgentRecord): Promise<void> {
  const filePath = agentFilePath(record.agent_id);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

async function loadAllAgents(): Promise<AgentRecord[]> {
  try {
    const entries = await fs.readdir(agentsDirectoryPath(), { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'));

    const agents: AgentRecord[] = [];
    for (const file of files) {
      const filePath = path.join(agentsDirectoryPath(), file.name);
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        agents.push(JSON.parse(raw) as AgentRecord);
      } catch {
        continue;
      }
    }

    return agents.sort((left, right) => left.agent_id.localeCompare(right.agent_id));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

export async function registerAgent(
  input: RegisterAgentInput,
  deps: Partial<RegisterAgentDeps> = {},
): Promise<AgentCommandResponse<AgentRecord>> {
  const command: AgentCommandName = 'agent register';
  const agentId = trimOrEmpty(input.name);
  const role = trimOrEmpty(input.role);
  const display = trimOrEmpty(input.display) || agentId;

  const agentIdError = validateAgentId(agentId);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  const roleError = validateRole(role);
  if (roleError) {
    return invalid(command, roleError.code, roleError.message);
  }

  try {
    const existing = await readAgent(agentId);
    const now = deps.now ? deps.now() : new Date().toISOString();

    if (existing && !input.forceUpdate) {
      return invalid(command, 'DUPLICATE_AGENT_ID', 'Agent is already registered. Use --force-update to change display/role.');
    }

    if (existing) {
      const updated: AgentRecord = {
        ...existing,
        display_name: display || existing.display_name,
        role,
        last_seen_at: now,
        version: existing.version + 1,
      };
      await writeAgent(updated);
      return success(command, updated);
    }

    const created: AgentRecord = {
      agent_id: agentId,
      display_name: display,
      role,
      status: 'idle',
      created_at: now,
      last_seen_at: now,
      version: 1,
    };

    await writeAgent(created);
    return success(command, created);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to register agent.');
  }
}

export async function listAgents(input: ListAgentsInput): Promise<AgentCommandResponse<AgentRecord[]>> {
  const command: AgentCommandName = 'agent list';
  const role = trimOrEmpty(input.role);
  const status = trimOrEmpty(input.status);

  try {
    const agents = await loadAllAgents();
    const filtered = agents.filter((agent) => {
      if (role && agent.role !== role) {
        return false;
      }
      if (status && agent.status !== status) {
        return false;
      }
      return true;
    });

    return success(command, filtered);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to list agents.');
  }
}

export async function showAgent(input: ShowAgentInput): Promise<AgentCommandResponse<AgentRecord>> {
  const command: AgentCommandName = 'agent show';
  const agentId = trimOrEmpty(input.agent);

  const agentIdError = validateAgentId(agentId);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  try {
    const agent = await readAgent(agentId);
    if (!agent) {
      return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
    }

    return success(command, agent);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to load agent.');
  }
}

/**
 * Derives the liveness state of an agent based on its last seen timestamp.
 * stale threshold: staleMinutes (default 15)
 * evicted threshold: 2 * staleMinutes (default 30)
 */
export function deriveLiveness(lastSeenAt: string, now: Date = new Date(), staleMinutes: number = 15): AgentLiveness {
  const lastSeen = new Date(lastSeenAt).getTime();
  const diffMs = now.getTime() - lastSeen;
  const diffMin = diffMs / (1000 * 60);

  if (diffMin >= 2 * staleMinutes) {
    return 'evicted';
  }
  if (diffMin >= staleMinutes) {
    return 'stale';
  }
  return 'active';
}

/**
 * Updates the last_seen_at timestamp for a registered agent.
 */
export async function heartbeatAgent(
  input: HeartbeatAgentInput,
  deps: Partial<RegisterAgentDeps> = {},
): Promise<AgentCommandResponse<AgentRecord>> {
  const command: AgentCommandName = 'agent heartbeat';
  const agentId = trimOrEmpty(input.agent);

  const agentIdError = validateAgentId(agentId);
  if (agentIdError) {
    return invalid(command, agentIdError.code, agentIdError.message);
  }

  try {
    const existing = await readAgent(agentId);
    if (!existing) {
      return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
    }

    const now = deps.now ? deps.now() : new Date().toISOString();
    const updated: AgentRecord = {
      ...existing,
      last_seen_at: now,
      version: existing.version + 1,
    };

    await writeAgent(updated);
    return success(command, updated);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to heartbeat agent.');
  }
}
