export interface SwarmFromApi {
  id: string;
  title: string;
  epic_id: string;
  epic_title: string;
  status: string;
  coordinator: string;
  total_issues: number;
  completed_issues: number;
  active_issues: number;
  progress_percent: number;
}

export interface SwarmListResponse {
  swarms: SwarmFromApi[];
}

export interface SwarmStatusFromApi {
  epic_id: string;
  epic_title: string;
  total_issues: number;
  completed: Array<{ id: string; title: string; status: string }>;
  active: Array<{ id: string; title: string; status: string }>;
  ready: Array<{ id: string; title: string; status: string }>;
  blocked: Array<{ id: string; title: string; status: string }>;
  progress_percent: number;
  active_count: number;
  ready_count: number;
  blocked_count: number;
}

export interface SwarmCardData {
  swarmId: string;
  title: string;
  epicId: string;
  epicTitle: string;
  status: string;
  coordinator: string;
  totalIssues: number;
  completedIssues: number;
  activeIssues: number;
  readyIssues: number;
  blockedIssues: number;
  progressPercent: number;
  agents: import('./agent-registry').AgentRecord[];
}

export function apiSwarmToCardData(swarm: SwarmFromApi, status?: SwarmStatusFromApi): SwarmCardData {
  return {
    swarmId: swarm.id,
    title: swarm.title,
    epicId: swarm.epic_id,
    epicTitle: swarm.epic_title,
    status: swarm.status,
    coordinator: swarm.coordinator,
    totalIssues: swarm.total_issues,
    completedIssues: swarm.completed_issues,
    activeIssues: swarm.active_issues,
    readyIssues: status?.ready_count ?? 0,
    blockedIssues: status?.blocked_count ?? 0,
    progressPercent: swarm.progress_percent,
    agents: [], // Populated separately via agent-registry
  };
}
