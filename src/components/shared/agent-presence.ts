import type { AgentState } from '../../lib/agent';
import type { AgentStatus } from './agent-avatar';

const DEFAULT_STALE_WINDOW_MS = 15 * 60 * 1000;

function getLastEventTime(state: Pick<AgentState, 'lastEventAt'>): number | null {
  if (!state.lastEventAt) {
    return null;
  }

  const timestamp = Date.parse(state.lastEventAt);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function isAgentStateStale(
  state: Pick<AgentState, 'status' | 'lastEventAt'>,
  now = Date.now(),
  staleWindowMs = DEFAULT_STALE_WINDOW_MS,
): boolean {
  if (state.status === 'completed' || state.status === 'failed') {
    return false;
  }

  const lastEventTime = getLastEventTime(state);
  if (lastEventTime === null) {
    return false;
  }

  return now - lastEventTime >= staleWindowMs;
}

export function mapAgentStateToAvatarStatus(
  state: Pick<AgentState, 'status' | 'lastEventAt'>,
  now = Date.now(),
  staleWindowMs = DEFAULT_STALE_WINDOW_MS,
): AgentStatus {
  if (isAgentStateStale(state, now, staleWindowMs)) {
    return 'stale';
  }

  switch (state.status) {
    case 'launching':
      return 'spawning';
    case 'working':
      return 'working';
    case 'blocked':
      return 'stuck';
    case 'completed':
      return 'done';
    case 'failed':
      return 'dead';
    case 'idle':
    default:
      return 'idle';
  }
}
