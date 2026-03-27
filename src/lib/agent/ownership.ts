import type { AgentState } from './state';

export function selectTaskAssignedAgentStates(
  agentStates: readonly AgentState[],
  taskId: string,
  agentInstanceId?: string | null,
): AgentState[] {
  const normalizedTaskId = taskId.trim();
  const normalizedAgentInstanceId = agentInstanceId?.trim() || null;

  const matches = agentStates.filter((state) => {
    if (state.taskId === normalizedTaskId) {
      return true;
    }
    if (normalizedAgentInstanceId && state.agentId === normalizedAgentInstanceId) {
      return true;
    }
    return false;
  });

  return [...matches].sort((left, right) => {
    const leftWeight = getStatePriority(left.status);
    const rightWeight = getStatePriority(right.status);
    if (leftWeight !== rightWeight) {
      return leftWeight - rightWeight;
    }
    const leftTime = left.lastEventAt ? Date.parse(left.lastEventAt) : 0;
    const rightTime = right.lastEventAt ? Date.parse(right.lastEventAt) : 0;
    return rightTime - leftTime;
  });
}

function getStatePriority(status: AgentState['status']): number {
  switch (status) {
    case 'blocked':
      return 0;
    case 'working':
      return 1;
    case 'launching':
      return 2;
    case 'idle':
      return 3;
    case 'completed':
      return 4;
    case 'failed':
      return 5;
  }
}
