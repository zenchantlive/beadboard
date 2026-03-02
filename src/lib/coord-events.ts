import { runBdCommand, type RunBdCommandResult } from './bridge';
import { validateCoordEventEnvelope, type CoordEventEnvelope } from './coord-schema';

export interface WriteCoordEventOptions {
  projectRoot: string;
}

export interface WriteCoordEventError {
  classification: 'bad_args' | 'non_zero_exit' | 'not_found' | 'timeout' | 'unknown';
  message: string;
}

export type WriteCoordEventResult =
  | { ok: true; eventId: string; commandResult: RunBdCommandResult }
  | { ok: false; error: WriteCoordEventError };

interface WriteCoordEventDeps {
  runBdCommand: typeof runBdCommand;
}

function buildAuditEntry(event: CoordEventEnvelope): Record<string, unknown> {
  return {
    version: event.version,
    kind: event.kind,
    issue_id: event.issue_id,
    actor: event.actor,
    timestamp: event.timestamp,
    data: event.data,
  };
}

export async function writeCoordEvent(
  input: unknown,
  options: WriteCoordEventOptions,
  deps?: Partial<WriteCoordEventDeps>,
): Promise<WriteCoordEventResult> {
  const validated = validateCoordEventEnvelope(input);
  if (!validated.ok) {
    return {
      ok: false,
      error: {
        classification: 'bad_args',
        message: validated.error,
      },
    };
  }

  const event = validated.value;
  const auditEntry = buildAuditEntry(event);
  const runner = deps?.runBdCommand ?? runBdCommand;

  const commandResult = await runner({
    projectRoot: options.projectRoot,
    args: ['audit', 'record', '--stdin', '--json'],
    stdinText: `${JSON.stringify(auditEntry)}\n`,
  });

  if (!commandResult.success) {
    return {
      ok: false,
      error: {
        classification: commandResult.classification ?? 'unknown',
        message: commandResult.error ?? commandResult.stderr ?? 'Failed to record coordination event',
      },
    };
  }

  return {
    ok: true,
    eventId: event.data.event_id,
    commandResult,
  };
}
