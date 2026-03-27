import type { ContextualRightPanelProps } from './contextual-right-panel';

export type ContextualRightPanelVariant = 'activity' | 'agent' | 'epic' | 'swarm' | 'task';

export function resolveContextualRightPanelVariant({
  epicId,
  taskId,
  swarmId,
  agentId,
}: Pick<ContextualRightPanelProps, 'epicId' | 'taskId' | 'swarmId' | 'agentId'>): ContextualRightPanelVariant {
  if (taskId) return 'task';
  if (agentId) return 'agent';
  if (epicId) return 'epic';
  if (swarmId) return 'swarm';
  return 'activity';
}
