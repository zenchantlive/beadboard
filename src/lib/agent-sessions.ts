import type { ActivityEvent } from './activity';
import type { BeadIssue } from './types';
import { listAgents } from './agent-registry';
import { inboxAgentMessages, type AgentMessage } from './agent-mail';

export type AgentSessionState = 'active' | 'reviewing' | 'deciding' | 'needs_input' | 'completed' | 'stale';

export interface SessionTaskCard {
  id: string;
  title: string;
  epicId: string;
  status: BeadIssue['status'];
  sessionState: AgentSessionState;
  owner: string | null;
  lastActor: string | null;
  lastActivityAt: string | null;
  communication: {
    unreadCount: number;
    pendingRequired: boolean;
    latestSnippet: string | null;
  };
}

export interface EpicBucket {
  epic: {
    id: string;
    title: string;
    status: BeadIssue['status'];
  };
  tasks: SessionTaskCard[];
}

export interface CommunicationSummary {
  messages: AgentMessage[];
}

// 24 hours in ms
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Gathers all relevant communication for all agents to build a summary for aggregation.
 */
export async function getCommunicationSummary(): Promise<CommunicationSummary> {
  const agentsResult = await listAgents({});
  const agents = agentsResult.data ?? [];
  const allMessages: AgentMessage[] = [];

  for (const agent of agents) {
    const inbox = await inboxAgentMessages({ agent: agent.agent_id });
    if (inbox.data) {
      allMessages.push(...inbox.data);
    }
  }

  return { messages: allMessages };
}

export interface AgentMetrics {
  activeTasks: number;
  completedTasks: number;
  handoffsSent: number;
  recentWins: { id: string; title: string }[];
}

/**
 * Calculates real-time metrics for a specific agent based on current issues and history.
 */
export async function getAgentMetrics(
  agentId: string,
  issues: BeadIssue[],
  activity: ActivityEvent[]
): Promise<AgentMetrics> {
  const agentIssues = issues.filter(i => i.assignee === agentId);
  const activeTasks = agentIssues.filter(i => i.status !== 'closed').length;
  
  // Tasks closed by this agent
  const completedTasks = issues.filter(i => i.status === 'closed' && i.assignee === agentId).length;
  
  // Count handoffs (e.g. status changes or specific handoff events)
  const handoffsSent = activity.filter(e => e.actor === agentId && e.kind === 'status_changed').length;

  const recentWins = issues
    .filter(i => i.status === 'closed' && i.assignee === agentId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3)
    .map(i => ({ id: i.id, title: i.title }));

  return {
    activeTasks,
    completedTasks,
    handoffsSent,
    recentWins
  };
}

export function buildSessionTaskFeed(
  issues: BeadIssue[],
  activity: ActivityEvent[],
  communicationSummary: CommunicationSummary
): EpicBucket[] {
  const epics = issues.filter(i => i.issue_type === 'epic');
  const tasks = issues.filter(i => i.issue_type !== 'epic');
  const epicMap = new Map<string, EpicBucket>();

  // Initialize buckets
  epics.forEach(epic => {
    epicMap.set(epic.id, {
      epic: { id: epic.id, title: epic.title, status: epic.status },
      tasks: []
    });
  });

  // Helper to find the actual epic ID even if parent is a task
  const findRootEpicId = (task: BeadIssue): string | undefined => {
    // 1. Explicit parent dependency
    const parentDep = task.dependencies.find(d => d.type === 'parent');
    if (parentDep) {
      // If the parent is an epic, we found it
      if (epicMap.has(parentDep.target)) return parentDep.target;
      // If parent is a task, recurse
      const parentIssue = issues.find(i => i.id === parentDep.target);
      if (parentIssue) return findRootEpicId(parentIssue);
    }
    
    // 2. Convention fallback: root prefix (bb-u6f.3.1 -> bb-u6f)
    const rootId = task.id.split('.')[0];
    if (epicMap.has(rootId)) return rootId;
    
    return undefined;
  };

  // Helper to find latest activity
  const getActivityForTask = (taskId: string) => {
    return activity
      .filter(e => e.beadId === taskId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null;
  };

  const deriveState = (task: BeadIssue, lastEvent: ActivityEvent | null, pendingRequired: boolean): AgentSessionState => {
    if (task.status === 'closed') return 'completed';
    if (task.status === 'blocked' || pendingRequired) return 'needs_input';
    
    // Check staleness
    const lastActiveTime = lastEvent ? new Date(lastEvent.timestamp).getTime() : new Date(task.updated_at).getTime();
    if (Date.now() - lastActiveTime > STALE_THRESHOLD_MS) {
      return 'stale';
    }

    if (task.status === 'in_progress') return 'active';
    
    return 'deciding';
  };

  tasks.forEach(task => {
    let epicId = findRootEpicId(task);
    let bucket = epicId ? epicMap.get(epicId) : undefined;
    
    if (!bucket) {
      if (!epicMap.has('uncategorized')) {
        epicMap.set('uncategorized', {
          epic: { id: 'uncategorized', title: 'Uncategorized', status: 'open' },
          tasks: []
        });
      }
      bucket = epicMap.get('uncategorized')!;
      epicId = 'uncategorized';
    }

    const lastEvent = getActivityForTask(task.id);
    const taskMessages = communicationSummary.messages.filter(m => m.bead_id === task.id);
    const unreadCount = taskMessages.filter(m => m.state === 'unread').length;
    const pendingRequired = taskMessages.some(m => m.requires_ack && m.state !== 'acked');
    const latestMessage = taskMessages.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    const sessionState = deriveState(task, lastEvent, pendingRequired);

    const card: SessionTaskCard = {
      id: task.id,
      title: task.title,
      epicId: epicId!,
      status: task.status,
      sessionState,
      owner: task.assignee,
      lastActor: lastEvent?.actor ?? latestMessage?.from_agent ?? null,
      lastActivityAt: lastEvent?.timestamp ?? latestMessage?.created_at ?? task.updated_at,
      communication: {
        unreadCount,
        pendingRequired,
        latestSnippet: latestMessage ? latestMessage.subject : null
      }
    };

    bucket.tasks.push(card);
  });

  return Array.from(epicMap.values()).filter(b => b.tasks.length > 0 || b.epic.id !== 'uncategorized');
}
