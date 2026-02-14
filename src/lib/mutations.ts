import { runBdCommand, type RunBdCommandResult } from './bridge';

export type MutationOperation = 'create' | 'update' | 'close' | 'reopen' | 'comment';
export type MutationStatus = 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed';

interface MutationBasePayload {
  projectRoot: string;
  bdPath?: string;
}

export interface CreateMutationPayload extends MutationBasePayload {
  title: string;
  description?: string;
  priority?: number;
  issueType?: string;
  assignee?: string;
  labels?: string[];
}

export interface UpdateMutationPayload extends MutationBasePayload {
  id: string;
  title?: string;
  description?: string;
  status?: MutationStatus;
  priority?: number;
  issueType?: string;
  assignee?: string;
  labels?: string[];
}

export interface CloseMutationPayload extends MutationBasePayload {
  id: string;
  reason?: string;
}

export interface ReopenMutationPayload extends MutationBasePayload {
  id: string;
  reason?: string;
}

export interface CommentMutationPayload extends MutationBasePayload {
  id: string;
  text: string;
}

export type MutationPayload =
  | CreateMutationPayload
  | UpdateMutationPayload
  | CloseMutationPayload
  | ReopenMutationPayload
  | CommentMutationPayload;

export interface MutationErrorShape {
  classification: 'bad_args' | 'not_found' | 'timeout' | 'non_zero_exit' | 'unknown';
  message: string;
}

export interface MutationResponse {
  ok: boolean;
  operation: MutationOperation;
  command: RunBdCommandResult;
  error?: MutationErrorShape;
}

export class MutationValidationError extends Error {
  readonly code = 'MUTATION_VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'MutationValidationError';
  }
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new MutationValidationError(`"${field}" is required.`);
  }
  const trimmed = value.trim();
  // Sanitize to prevent command injection - remove control characters and shell metacharacters
  const sanitized = trimmed.replace(/[\x00-\x1f\x7f]/g, '').replace(/[;&|`$(){}[\]\\*?<>!#"'%\n\r]/g, '');
  if (!sanitized) {
    throw new MutationValidationError(`"${field}" contains only invalid characters.`);
  }
  return sanitized;
}

function asOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new MutationValidationError('Expected a string value.');
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asOptionalPriority(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 4) {
    throw new MutationValidationError('"priority" must be a number between 0 and 4.');
  }
  return value;
}

function asOptionalLabels(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new MutationValidationError('"labels" must be an array of strings.');
  }
  const labels = value.map((label) => {
    if (typeof label !== 'string' || !label.trim()) {
      throw new MutationValidationError('"labels" must be an array of non-empty strings.');
    }
    return label.trim();
  });

  return labels.length ? labels : undefined;
}

function asOptionalStatus(value: unknown): MutationStatus | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const status = asNonEmptyString(value, 'status');
  if (!['open', 'in_progress', 'blocked', 'deferred', 'closed'].includes(status)) {
    throw new MutationValidationError('"status" is invalid.');
  }
  return status as MutationStatus;
}

function parseBasePayload(raw: unknown): MutationBasePayload {
  if (!raw || typeof raw !== 'object') {
    throw new MutationValidationError('Payload must be a JSON object.');
  }

  const data = raw as Record<string, unknown>;
  return {
    projectRoot: asNonEmptyString(data.projectRoot, 'projectRoot'),
    bdPath: asOptionalString(data.bdPath),
  };
}

export function validateMutationPayload(operation: MutationOperation, payload: unknown): MutationPayload {
  const base = parseBasePayload(payload);
  const data = payload as Record<string, unknown>;

  if (operation === 'create') {
    return {
      ...base,
      title: asNonEmptyString(data.title, 'title'),
      description: asOptionalString(data.description),
      priority: asOptionalPriority(data.priority),
      issueType: asOptionalString(data.issueType),
      assignee: asOptionalString(data.assignee),
      labels: asOptionalLabels(data.labels),
    };
  }

  if (operation === 'update') {
    const mapped: UpdateMutationPayload = {
      ...base,
      id: asNonEmptyString(data.id, 'id'),
      title: asOptionalString(data.title),
      description: asOptionalString(data.description),
      status: asOptionalStatus(data.status),
      priority: asOptionalPriority(data.priority),
      issueType: asOptionalString(data.issueType),
      assignee: asOptionalString(data.assignee),
      labels: asOptionalLabels(data.labels),
    };

    if (
      !mapped.title &&
      !mapped.description &&
      !mapped.status &&
      mapped.priority === undefined &&
      !mapped.issueType &&
      !mapped.assignee &&
      !mapped.labels
    ) {
      throw new MutationValidationError('At least one update field is required.');
    }

    return mapped;
  }

  if (operation === 'close') {
    return {
      ...base,
      id: asNonEmptyString(data.id, 'id'),
      reason: asOptionalString(data.reason),
    };
  }

  if (operation === 'reopen') {
    return {
      ...base,
      id: asNonEmptyString(data.id, 'id'),
      reason: asOptionalString(data.reason),
    };
  }

  return {
    ...base,
    id: asNonEmptyString(data.id, 'id'),
    text: asNonEmptyString(data.text, 'text'),
  };
}

function pushOptionalArg(args: string[], flag: string, value: string | undefined): void {
  if (value) {
    args.push(flag, value);
  }
}

function pushOptionalLabels(args: string[], labels: string[] | undefined): void {
  if (labels && labels.length > 0) {
    args.push('-l', labels.join(','));
  }
}

export function buildBdMutationArgs(operation: MutationOperation, payload: MutationPayload): string[] {
  if (operation === 'create') {
    const data = payload as CreateMutationPayload;
    const args = ['create', data.title];
    pushOptionalArg(args, '-d', data.description);
    if (data.priority !== undefined) {
      args.push('-p', String(data.priority));
    }
    pushOptionalArg(args, '-t', data.issueType);
    pushOptionalArg(args, '-a', data.assignee);
    pushOptionalLabels(args, data.labels);
    args.push('--json');
    return args;
  }

  if (operation === 'update') {
    const data = payload as UpdateMutationPayload;
    const args = ['update', data.id];
    pushOptionalArg(args, '--title', data.title);
    pushOptionalArg(args, '-d', data.description);
    pushOptionalArg(args, '-s', data.status);
    if (data.priority !== undefined) {
      args.push('-p', String(data.priority));
    }
    pushOptionalArg(args, '-t', data.issueType);
    pushOptionalArg(args, '-a', data.assignee);
    pushOptionalLabels(args, data.labels);
    args.push('--json');
    return args;
  }

  if (operation === 'close') {
    const data = payload as CloseMutationPayload;
    const args = ['close', data.id];
    pushOptionalArg(args, '-r', data.reason);
    args.push('--json');
    return args;
  }

  if (operation === 'reopen') {
    const data = payload as ReopenMutationPayload;
    const args = ['reopen', data.id];
    pushOptionalArg(args, '-r', data.reason);
    args.push('--json');
    return args;
  }

  const data = payload as CommentMutationPayload;
  return ['comments', 'add', data.id, data.text, '--json'];
}

interface ExecuteMutationDeps {
  runBdCommand: typeof runBdCommand;
}

export async function executeMutation(
  operation: MutationOperation,
  payload: MutationPayload,
  deps: Partial<ExecuteMutationDeps> = {},
): Promise<MutationResponse> {
  const runner = deps.runBdCommand ?? runBdCommand;
  const args = buildBdMutationArgs(operation, payload);
  const command = await runner({
    projectRoot: payload.projectRoot,
    args,
    explicitBdPath: payload.bdPath,
  });

  if (!command.success) {
    return {
      ok: false,
      operation,
      command,
      error: {
        classification: command.classification ?? 'unknown',
        message: command.error ?? (command.stderr || 'Mutation command failed.'),
      },
    };
  }

  return {
    ok: true,
    operation,
    command,
  };
}
