import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { showAgent } from './agent-registry';
import type { AgentMessage } from './agent-mail';

const MIN_TTL_MINUTES = 5;
const MAX_TTL_MINUTES = 1440;
const DEFAULT_TTL_MINUTES = 120;

export type ReservationCommandName = 'agent reserve' | 'agent release' | 'agent status';
export type ReservationState = 'active' | 'released' | 'expired';

export interface ReservationCommandError {
  code: string;
  message: string;
}

export interface ReservationCommandResponse<T> {
  ok: boolean;
  command: ReservationCommandName;
  data: T | null;
  error: ReservationCommandError | null;
}

export interface AgentReservation {
  reservation_id: string;
  scope: string;
  agent_id: string;
  bead_id: string;
  state: ReservationState;
  created_at: string;
  expires_at: string;
  released_at: string | null;
}

export interface ReserveAgentScopeInput {
  agent: string;
  scope: string;
  bead: string;
  ttl?: number;
  takeoverStale?: boolean;
}

export interface ReserveAgentScopeDeps {
  now: () => string;
  idGenerator: () => string;
}

export interface ReleaseAgentReservationInput {
  agent: string;
  scope: string;
}

export interface StatusAgentReservationsInput {
  bead?: string;
  agent?: string;
}

export interface StatusAgentReservationsData {
  reservations: AgentReservation[];
  unacked_required_messages: AgentMessage[];
  summary: {
    active: number;
    released: number;
    expired: number;
    unacked_required_messages: number;
  };
}

interface MutationDeps {
  now: () => string;
}

interface ActiveReservationsFile {
  reservations: AgentReservation[];
}

function userProfileRoot(): string {
  return process.env.USERPROFILE?.trim() || os.homedir();
}

function agentRoot(): string {
  return path.join(userProfileRoot(), '.beadboard', 'agent');
}

function reservationsRoot(): string {
  return path.join(agentRoot(), 'reservations');
}

function activeReservationsPath(): string {
  return path.join(reservationsRoot(), 'active.json');
}

function reservationHistoryPath(): string {
  return path.join(reservationsRoot(), 'history.jsonl');
}

function messageIndexDirectoryPath(): string {
  return path.join(agentRoot(), 'messages', 'index');
}

function trimOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function success<T>(command: ReservationCommandName, data: T): ReservationCommandResponse<T> {
  return {
    ok: true,
    command,
    data,
    error: null,
  };
}

function invalid(command: ReservationCommandName, code: string, message: string): ReservationCommandResponse<never> {
  return {
    ok: false,
    command,
    data: null,
    error: { code, message },
  };
}

function defaultReservationId(nowIso: string): string {
  const seed = Math.random().toString(16).slice(2, 6);
  const compact = nowIso.replace(/[-:]/g, '').replace('.000Z', '').replace('T', '_');
  return `res_${compact}_${seed}`;
}

function addMinutes(iso: string, minutes: number): string {
  const base = Date.parse(iso);
  const next = new Date(base + minutes * 60_000);
  return next.toISOString();
}

function isExpired(reservation: AgentReservation, nowIso: string): boolean {
  return reservation.expires_at.localeCompare(nowIso) <= 0;
}

function toActiveFile(reservations: AgentReservation[]): ActiveReservationsFile {
  return { reservations };
}

function parseActiveFile(raw: string): AgentReservation[] {
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as AgentReservation[];
  }

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as ActiveReservationsFile).reservations)) {
    return (parsed as ActiveReservationsFile).reservations;
  }

  return [];
}

async function readActiveReservations(): Promise<AgentReservation[]> {
  try {
    const raw = await fs.readFile(activeReservationsPath(), 'utf8');
    return parseActiveFile(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function lockActiveReservations(): Promise<number> {
  // Ensure the directory and file exist before trying to lock
  await fs.mkdir(path.dirname(activeReservationsPath()), { recursive: true });
  try {
    const fd = await fs.open(activeReservationsPath(), 'r+');
    await fs.flock(fd, 'ex');
    return fd;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist, create it first
      await fs.writeFile(activeReservationsPath(), JSON.stringify({ reservations: [] }), 'utf8');
      const fd = await fs.open(activeReservationsPath(), 'r+');
      await fs.flock(fd, 'ex');
      return fd;
    }
    throw error;
  }
}

async function unlockActiveReservations(fd: number): Promise<void> {
  await fs.flock(fd, 'un');
  await fs.close(fd);
}

async function atomicWriteJson(filePath: string, payload: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const tempFile = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempFile, payload, 'utf8');
  await fs.rename(tempFile, filePath);
}

async function writeActiveReservations(reservations: AgentReservation[]): Promise<void> {
  const snapshot = `${JSON.stringify(toActiveFile(reservations), null, 2)}\n`;
  await atomicWriteJson(activeReservationsPath(), snapshot);
}

async function appendReservationHistory(reservation: AgentReservation): Promise<void> {
  const historyPath = reservationHistoryPath();
  await fs.mkdir(path.dirname(historyPath), { recursive: true });
  await fs.appendFile(historyPath, `${JSON.stringify(reservation)}\n`, 'utf8');
}

async function readRequiredAckMessages(): Promise<AgentMessage[]> {
  try {
    const entries = await fs.readdir(messageIndexDirectoryPath(), { withFileTypes: true });
    const messages: AgentMessage[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) {
        continue;
      }

      const filePath = path.join(messageIndexDirectoryPath(), entry.name);
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw) as AgentMessage;
        if (parsed.requires_ack && !parsed.acked_at) {
          messages.push(parsed);
        }
      } catch {
        continue;
      }
    }

    return messages.sort((left, right) => right.created_at.localeCompare(left.created_at));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function resolveRegisteredAgent(agentId: string): Promise<boolean> {
  const result = await showAgent({ agent: agentId });
  return result.ok;
}

async function sweepExpiredReservations(nowIso: string): Promise<{ active: AgentReservation[]; expired: number }> {
  const reservations = await readActiveReservations();
  const active: AgentReservation[] = [];
  const expired: AgentReservation[] = [];

  for (const reservation of reservations) {
    if (isExpired(reservation, nowIso)) {
      expired.push({ ...reservation, state: 'expired' });
    } else {
      active.push(reservation);
    }
  }

  if (expired.length > 0) {
    await writeActiveReservations(active);
    for (const reservation of expired) {
      await appendReservationHistory(reservation);
    }
  }

  return { active, expired: expired.length };
}

export async function reserveAgentScope(
  input: ReserveAgentScopeInput,
  deps: Partial<ReserveAgentScopeDeps> = {},
): Promise<ReservationCommandResponse<AgentReservation>> {
  const command: ReservationCommandName = 'agent reserve';

  const agentId = trimOrEmpty(input.agent);
  const scope = trimOrEmpty(input.scope);
  const beadId = trimOrEmpty(input.bead);
  const ttlMinutes = input.ttl ?? DEFAULT_TTL_MINUTES;

  if (!agentId || !(await resolveRegisteredAgent(agentId))) {
    return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
  }

  if (!scope || !beadId) {
    return invalid(command, 'INVALID_ARGS', 'Scope and bead id are required.');
  }

  if (!Number.isInteger(ttlMinutes) || ttlMinutes < MIN_TTL_MINUTES || ttlMinutes > MAX_TTL_MINUTES) {
    return invalid(command, 'INVALID_ARGS', `TTL must be an integer between ${MIN_TTL_MINUTES} and ${MAX_TTL_MINUTES} minutes.`);
  }

  let lockFd: number | null = null;
  try {
    // Acquire exclusive lock to prevent race conditions
    lockFd = await lockActiveReservations();
    
    const now = deps.now ? deps.now() : new Date().toISOString();
    const reservations = await readActiveReservations();
    const existing = reservations.find((reservation) => reservation.scope === scope);

    if (existing) {
      if (!isExpired(existing, now)) {
        return invalid(command, 'RESERVATION_CONFLICT', `Scope is already reserved by ${existing.agent_id}.`);
      }

      if (!input.takeoverStale) {
        return invalid(command, 'RESERVATION_STALE_FOUND', 'An expired reservation exists. Re-run with --takeover-stale.');
      }

      const withoutExisting = reservations.filter((reservation) => reservation.reservation_id !== existing.reservation_id);
      await writeActiveReservations(withoutExisting);
      await appendReservationHistory({ ...existing, state: 'expired' });

      const generateId = deps.idGenerator ?? (() => defaultReservationId(now));
      const created: AgentReservation = {
        reservation_id: generateId(),
        scope,
        agent_id: agentId,
        bead_id: beadId,
        state: 'active',
        created_at: now,
        expires_at: addMinutes(now, ttlMinutes),
        released_at: null,
      };

      await writeActiveReservations([...withoutExisting, created]);
      return success(command, created);
    }

    const generateId = deps.idGenerator ?? (() => defaultReservationId(now));
    const created: AgentReservation = {
      reservation_id: generateId(),
      scope,
      agent_id: agentId,
      bead_id: beadId,
      state: 'active',
      created_at: now,
      expires_at: addMinutes(now, ttlMinutes),
      released_at: null,
    };

    await writeActiveReservations([...reservations, created]);
    return success(command, created);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to reserve scope.');
  } finally {
    if (lockFd !== null) {
      await unlockActiveReservations(lockFd);
    }
  }
}

export async function releaseAgentReservation(
  input: ReleaseAgentReservationInput,
  deps: Partial<MutationDeps> = {},
): Promise<ReservationCommandResponse<AgentReservation>> {
  const command: ReservationCommandName = 'agent release';

  const agentId = trimOrEmpty(input.agent);
  const scope = trimOrEmpty(input.scope);

  if (!agentId || !(await resolveRegisteredAgent(agentId))) {
    return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
  }

  if (!scope) {
    return invalid(command, 'INVALID_ARGS', 'Scope is required.');
  }

  let lockFd: number | null = null;
  try {
    // Acquire exclusive lock to prevent race conditions
    lockFd = await lockActiveReservations();
    
    const now = deps.now ? deps.now() : new Date().toISOString();
    const reservations = await readActiveReservations();
    const existing = reservations.find((reservation) => reservation.scope === scope);

    if (!existing || isExpired(existing, now)) {
      if (existing && isExpired(existing, now)) {
        const remaining = reservations.filter((reservation) => reservation.reservation_id !== existing.reservation_id);
        await writeActiveReservations(remaining);
        await appendReservationHistory({ ...existing, state: 'expired' });
      }
      return invalid(command, 'RESERVATION_NOT_FOUND', 'No active reservation exists for this scope.');
    }

    if (existing.agent_id !== agentId) {
      return invalid(command, 'RELEASE_FORBIDDEN', 'Only the reservation owner may release this scope.');
    }

    const released: AgentReservation = {
      ...existing,
      state: 'released',
      released_at: now,
    };

    const remaining = reservations.filter((reservation) => reservation.reservation_id !== existing.reservation_id);
    await writeActiveReservations(remaining);
    await appendReservationHistory(released);

    return success(command, released);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to release reservation.');
  } finally {
    if (lockFd !== null) {
      await unlockActiveReservations(lockFd);
    }
  }
}

export async function statusAgentReservations(
  input: StatusAgentReservationsInput,
  deps: Partial<MutationDeps> = {},
): Promise<ReservationCommandResponse<StatusAgentReservationsData>> {
  const command: ReservationCommandName = 'agent status';

  const beadId = trimOrEmpty(input.bead);
  const agentId = trimOrEmpty(input.agent);

  if (agentId && !(await resolveRegisteredAgent(agentId))) {
    return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
  }

  try {
    const now = deps.now ? deps.now() : new Date().toISOString();
    const swept = await sweepExpiredReservations(now);

    const reservations = swept.active.filter((reservation) => {
      if (beadId && reservation.bead_id !== beadId) {
        return false;
      }
      if (agentId && reservation.agent_id !== agentId) {
        return false;
      }
      return true;
    });

    const unackedRequiredMessages = (await readRequiredAckMessages()).filter((message) => {
      if (beadId && message.bead_id !== beadId) {
        return false;
      }
      if (agentId && message.to_agent !== agentId) {
        return false;
      }
      return true;
    });

    return success(command, {
      reservations,
      unacked_required_messages: unackedRequiredMessages,
      summary: {
        active: reservations.length,
        released: 0,
        expired: swept.expired,
        unacked_required_messages: unackedRequiredMessages.length,
      },
    });
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to load reservation status.');
  }
}
