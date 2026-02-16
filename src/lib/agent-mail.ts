import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { listAgents, showAgent, type AgentRecord } from './agent-registry';

const MESSAGE_CATEGORIES = ['HANDOFF', 'BLOCKED', 'DECISION', 'INFO'] as const;
const MESSAGE_STATES = ['unread', 'read', 'acked'] as const;

export type MessageCategory = (typeof MESSAGE_CATEGORIES)[number];
export type MessageState = (typeof MESSAGE_STATES)[number];
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

interface MessageMutationDeps {
  now: () => string;
}

function userProfileRoot(): string {
  return process.env.USERPROFILE?.trim() || os.homedir();
}

function agentRoot(): string {
  return path.join(userProfileRoot(), '.beadboard', 'agent');
}

function messagesRoot(): string {
  return path.join(agentRoot(), 'messages');
}

function inboxFilePath(agentId: string): string {
  return path.join(messagesRoot(), `${agentId}.jsonl`);
}

function indexDirectoryPath(): string {
  return path.join(messagesRoot(), 'index');
}

function indexFilePath(messageId: string): string {
  return path.join(indexDirectoryPath(), `${messageId}.json`);
}

function trimOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidMessageId(value: string): boolean {
  // Message IDs must be alphanumeric with underscores, hyphens, and colons
  // This prevents path traversal attacks
  return /^[a-zA-Z0-9_\-:]+$/.test(value);
}

function success<T>(command: MailCommandName, data: T): MailCommandResponse<T> {
  return {
    ok: true,
    command,
    data,
    error: null,
  };
}

function invalid(command: MailCommandName, code: string, message: string): MailCommandResponse<never> {
  return {
    ok: false,
    command,
    data: null,
    error: { code, message },
  };
}

function isMessageCategory(value: string): value is MessageCategory {
  return MESSAGE_CATEGORIES.includes(value as MessageCategory);
}

function isMessageState(value: string): value is MessageState {
  return MESSAGE_STATES.includes(value as MessageState);
}

function requiresAck(category: MessageCategory): boolean {
  return category === 'HANDOFF' || category === 'BLOCKED';
}

function defaultMessageId(nowIso: string): string {
  const seed = Math.random().toString(16).slice(2, 6);
  const compact = nowIso.replace(/[-:]/g, '').replace('.000Z', '').replace('T', '_');
  return `msg_${compact}_${seed}`;
}

async function appendInboxMessage(agentId: string, message: AgentMessage): Promise<void> {
  const filePath = inboxFilePath(agentId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(message)}\n`, 'utf8');
}

async function writeMessageIndex(message: AgentMessage): Promise<void> {
  const filePath = indexFilePath(message.message_id);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(message, null, 2)}\n`, 'utf8');
}

async function readMessageIndex(messageId: string): Promise<AgentMessage | null> {
  try {
    const raw = await fs.readFile(indexFilePath(messageId), 'utf8');
    return JSON.parse(raw) as AgentMessage;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function loadInboxMessages(agentId: string): Promise<AgentMessage[]> {
  try {
    const raw = await fs.readFile(inboxFilePath(agentId), 'utf8');
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    const messages: AgentMessage[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as AgentMessage;
        const current = await readMessageIndex(parsed.message_id);
        messages.push(current ?? parsed);
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

async function resolveRegisteredAgent(agentId: string): Promise<AgentRecord | null> {
  const result = await showAgent({ agent: agentId });
  return result.ok ? result.data : null;
}

async function resolveRecipients(to: string, from: string): Promise<string[]> {
  if (to === 'broadcast') {
    const agents = (await listAgents({})).data ?? [];
    return agents.map((a) => a.agent_id).filter((id) => id !== from);
  }

  if (to.startsWith('role:')) {
    const role = to.slice(5);
    const agents = (await listAgents({ role })).data ?? [];
    return agents.map((a) => a.agent_id).filter((id) => id !== from);
  }

  return [to];
}

export async function sendAgentMessage(
  input: SendAgentMessageInput,
  deps: Partial<SendAgentMessageDeps> = {},
): Promise<MailCommandResponse<AgentMessage>> {
  const command: MailCommandName = 'agent send';

  const from = trimOrEmpty(input.from);
  const to = trimOrEmpty(input.to);
  const beadId = trimOrEmpty(input.bead);
  const categoryRaw = trimOrEmpty(input.category);
  const subject = trimOrEmpty(input.subject);
  const body = trimOrEmpty(input.body);
  const threadId = trimOrEmpty(input.thread) || `bead:${beadId}`;

  if (!from || !(await resolveRegisteredAgent(from))) {
    return invalid(command, 'UNKNOWN_SENDER', 'Sender agent is not registered.');
  }

  if (!to) {
    return invalid(command, 'UNKNOWN_RECIPIENT', 'Recipient agent is required.');
  }

  const isRoleOrBroadcast = to === 'broadcast' || to.startsWith('role:');

  if (!isRoleOrBroadcast && !(await resolveRegisteredAgent(to))) {
    return invalid(command, 'UNKNOWN_RECIPIENT', 'Recipient agent is not registered.');
  }

  if (!beadId) {
    return invalid(command, 'MISSING_BEAD_ID', 'Bead id is required.');
  }

  if (!isMessageCategory(categoryRaw)) {
    return invalid(command, 'INVALID_CATEGORY', 'Category must be one of HANDOFF, BLOCKED, DECISION, INFO.');
  }

  if (!subject || !body) {
    return invalid(command, 'INVALID_MESSAGE', 'Subject and body are required.');
  }

  try {
    const now = deps.now ? deps.now() : new Date().toISOString();
    const generateId = deps.idGenerator ?? (() => defaultMessageId(now));
    const recipientIds = await resolveRecipients(to, from);

    if (recipientIds.length === 0) {
      if (to.startsWith('role:')) {
        const role = to.slice(5);
        const allWithRole = (await listAgents({ role })).data ?? [];
        if (allWithRole.length === 0) {
          return invalid(command, 'UNKNOWN_RECIPIENT', `no agents found with role '${role}'.`);
        }
        return invalid(command, 'UNKNOWN_RECIPIENT', 'all recipients were excluded (sender).');
      }
      return invalid(command, 'UNKNOWN_RECIPIENT', 'No recipients available for broadcast.');
    }

    let firstMessage: AgentMessage | null = null;

    for (const recipientId of recipientIds) {
      const messageId = recipientIds.length === 1 ? generateId() : `${generateId()}_${recipientId}`;
      const message: AgentMessage = {
        message_id: messageId,
        thread_id: threadId,
        bead_id: beadId,
        from_agent: from,
        to_agent: recipientId,
        category: categoryRaw,
        subject,
        body,
        state: 'unread',
        requires_ack: requiresAck(categoryRaw),
        created_at: now,
        read_at: null,
        acked_at: null,
      };

      await appendInboxMessage(recipientId, message);
      await writeMessageIndex(message);
      if (!firstMessage) {
        firstMessage = message;
      }
    }

    return success(command, firstMessage as AgentMessage);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to send message.');
  }
}

export async function inboxAgentMessages(
  input: InboxAgentMessagesInput,
): Promise<MailCommandResponse<AgentMessage[]>> {
  const command: MailCommandName = 'agent inbox';

  const agentId = trimOrEmpty(input.agent);
  const state = trimOrEmpty(input.state);
  const beadId = trimOrEmpty(input.bead);
  const limit = input.limit === undefined ? 50 : input.limit;

  if (!agentId || !(await resolveRegisteredAgent(agentId))) {
    return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
  }

  if (state && !isMessageState(state)) {
    return invalid(command, 'INVALID_STATE', 'State must be one of unread, read, acked.');
  }

  if (!Number.isFinite(limit) || limit <= 0 || limit > 500) {
    return invalid(command, 'INVALID_LIMIT', 'Limit must be between 1 and 500.');
  }

  try {
    const messages = await loadInboxMessages(agentId);
    const filtered = messages
      .filter((message) => {
        if (state && message.state !== state) {
          return false;
        }
        if (beadId && message.bead_id !== beadId) {
          return false;
        }
        return true;
      })
      .slice(0, limit);

    return success(command, filtered);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to load inbox.');
  }
}

export async function readAgentMessage(
  input: MessageActionInput,
  deps: Partial<MessageMutationDeps> = {},
): Promise<MailCommandResponse<AgentMessage>> {
  const command: MailCommandName = 'agent read';

  const agentId = trimOrEmpty(input.agent);
  const messageId = trimOrEmpty(input.message);

  if (!agentId || !(await resolveRegisteredAgent(agentId))) {
    return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
  }

  if (!messageId) {
    return invalid(command, 'MESSAGE_NOT_FOUND', 'Message id is required.');
  }

  if (!isValidMessageId(messageId)) {
    return invalid(command, 'INVALID_MESSAGE_ID', 'Message id contains invalid characters.');
  }

  try {
    const existing = await readMessageIndex(messageId);
    if (!existing) {
      return invalid(command, 'MESSAGE_NOT_FOUND', 'Message does not exist.');
    }

    if (existing.to_agent !== agentId) {
      return invalid(command, 'READ_FORBIDDEN', 'Only the recipient may read this message.');
    }

    if (existing.state === 'unread') {
      const now = deps.now ? deps.now() : new Date().toISOString();
      const updated: AgentMessage = {
        ...existing,
        state: 'read',
        read_at: existing.read_at ?? now,
      };
      await writeMessageIndex(updated);
      return success(command, updated);
    }

    return success(command, existing);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to read message.');
  }
}

export async function ackAgentMessage(
  input: MessageActionInput,
  deps: Partial<MessageMutationDeps> = {},
): Promise<MailCommandResponse<AgentMessage>> {
  const command: MailCommandName = 'agent ack';

  const agentId = trimOrEmpty(input.agent);
  const messageId = trimOrEmpty(input.message);

  if (!agentId || !(await resolveRegisteredAgent(agentId))) {
    return invalid(command, 'AGENT_NOT_FOUND', 'Agent is not registered.');
  }

  if (!messageId) {
    return invalid(command, 'MESSAGE_NOT_FOUND', 'Message id is required.');
  }

  if (!isValidMessageId(messageId)) {
    return invalid(command, 'INVALID_MESSAGE_ID', 'Message id contains invalid characters.');
  }

  try {
    const existing = await readMessageIndex(messageId);
    if (!existing) {
      return invalid(command, 'MESSAGE_NOT_FOUND', 'Message does not exist.');
    }

    if (existing.to_agent !== agentId) {
      return invalid(command, 'ACK_FORBIDDEN', 'Only the recipient may acknowledge this message.');
    }

    const now = deps.now ? deps.now() : new Date().toISOString();
    const updated: AgentMessage = {
      ...existing,
      state: 'acked',
      read_at: existing.read_at ?? now,
      acked_at: existing.acked_at ?? now,
    };

    await writeMessageIndex(updated);
    return success(command, updated);
  } catch (error) {
    return invalid(command, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to acknowledge message.');
  }
}
