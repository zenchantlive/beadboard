export const COORD_SCHEMA_VERSION = 'coord.v1' as const;
export const COORD_EVENT_KIND = 'coord_event' as const;

export type CoordEventType =
  | 'SEND'
  | 'READ'
  | 'ACK'
  | 'RESERVE'
  | 'RELEASE'
  | 'TAKEOVER'
  | 'RESUME'
  | 'BLOCKED'
  | 'HANDOFF'
  | 'INCURSION';

export type TakeoverMode = 'stale' | 'evicted';

export interface CoordEventData {
  event_type: CoordEventType;
  event_id: string;
  project_root: string;
  payload: Record<string, unknown>;
  to_agent?: string;
  scope?: string;
  state?: 'unread' | 'read' | 'acked';
  event_ref?: string;
  takeover_mode?: TakeoverMode;
  reason?: string;
}

export interface CoordEventEnvelope {
  version: typeof COORD_SCHEMA_VERSION;
  kind: typeof COORD_EVENT_KIND;
  issue_id: string;
  actor: string;
  timestamp: string;
  data: CoordEventData;
}

export type CoordValidationResult =
  | { ok: true; value: CoordEventEnvelope }
  | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isEventType(value: unknown): value is CoordEventType {
  if (!nonEmptyString(value)) return false;
  return (
    value === 'SEND' ||
    value === 'READ' ||
    value === 'ACK' ||
    value === 'RESERVE' ||
    value === 'RELEASE' ||
    value === 'TAKEOVER' ||
    value === 'RESUME' ||
    value === 'BLOCKED' ||
    value === 'HANDOFF' ||
    value === 'INCURSION'
  );
}

function fail(error: string): CoordValidationResult {
  return { ok: false, error };
}

export function validateCoordEventEnvelope(input: unknown): CoordValidationResult {
  if (!isObject(input)) return fail('Envelope must be an object');

  if (input.version !== COORD_SCHEMA_VERSION) {
    return fail(`version must be "${COORD_SCHEMA_VERSION}"`);
  }
  if (input.kind !== COORD_EVENT_KIND) {
    return fail(`kind must be "${COORD_EVENT_KIND}"`);
  }
  if (!nonEmptyString(input.issue_id)) return fail('issue_id is required');
  if (!nonEmptyString(input.actor)) return fail('actor is required');
  if (!nonEmptyString(input.timestamp)) return fail('timestamp is required');

  if (!isObject(input.data)) return fail('data object is required');

  const data = input.data;
  if (!isEventType(data.event_type)) return fail('data.event_type is invalid');
  if (!nonEmptyString(data.event_id)) return fail('data.event_id is required');
  if (!nonEmptyString(data.project_root)) return fail('data.project_root is required');
  if (!isObject(data.payload)) return fail('data.payload must be an object');

  if ((data.event_type === 'READ' || data.event_type === 'ACK') && !nonEmptyString(data.event_ref)) {
    return fail('data.event_ref is required for READ/ACK');
  }

  if (data.event_type === 'TAKEOVER') {
    if (!nonEmptyString(data.scope)) return fail('data.scope is required for TAKEOVER');
    if (data.takeover_mode !== 'stale' && data.takeover_mode !== 'evicted') {
      return fail('data.takeover_mode must be stale or evicted');
    }
    if (!nonEmptyString(data.reason)) return fail('data.reason is required for TAKEOVER');
  }

  if (data.event_type === 'SEND') {
    if (!nonEmptyString(data.to_agent)) return fail('data.to_agent is required for SEND');
    if (data.state !== 'unread' && data.state !== 'read' && data.state !== 'acked') {
      return fail('data.state must be unread/read/acked for SEND');
    }
    if (!nonEmptyString(data.payload.subject)) return fail('data.payload.subject is required for SEND');
    if (!nonEmptyString(data.payload.body)) return fail('data.payload.body is required for SEND');
  }

  return { ok: true, value: input as unknown as CoordEventEnvelope };
}
