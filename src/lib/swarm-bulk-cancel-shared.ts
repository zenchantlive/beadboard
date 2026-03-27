export function buildSwarmBulkCancelConfirmation(swarmId: string, activeCount: number): string {
  return `STOP ${activeCount} ACTIVE WORKERS IN ${swarmId.trim()}`;
}
