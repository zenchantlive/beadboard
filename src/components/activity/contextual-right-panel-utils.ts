import type { ContextualRightPanelProps } from './contextual-right-panel';

export type ContextualRightPanelVariant = 'activity' | 'epic' | 'swarm' | 'task';

export function resolveContextualRightPanelVariant({
  epicId,
  taskId,
  swarmId,
}: Pick<ContextualRightPanelProps, 'epicId' | 'taskId' | 'swarmId'>): ContextualRightPanelVariant {
  if (taskId) return 'task';
  if (epicId) return 'epic';
  if (swarmId) return 'swarm';
  return 'activity';
}
