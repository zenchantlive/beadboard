
export function getAgentRoleColor(role: string): string {
  const colors: Record<string, string> = {
    ui: 'border-blue-500',
    graph: 'border-green-500',
    orchestrator: 'border-purple-500',
    agent: 'border-zinc-500',
  };
  return colors[role] || 'border-zinc-500';
}
