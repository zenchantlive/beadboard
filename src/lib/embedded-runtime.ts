import path from 'node:path';

import type { BeadIssue } from './types';

export type RuntimeBackendId = 'pi';
export type AgentInstanceKind = 'orchestrator' | 'worker';
export type LaunchSurface = 'social' | 'graph' | 'swarm' | 'sessions' | 'activity' | 'task';
export type RuntimeEventKind =
  | 'orchestrator.message'
  | 'launch.requested'
  | 'launch.planned'
  | 'launch.started'
  | 'worker.spawned'
  | 'worker.updated'
  | 'worker.completed'
  | 'worker.failed'
  | 'deviation.proposed'
  | 'deviation.approved'
  | 'deviation.rejected';

export type RuntimeStatus =
  | 'idle'
  | 'planning'
  | 'launching'
  | 'working'
  | 'waiting'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'stale';

export type TemplateDeviationSeverity = 'minor' | 'major';

export interface AgentTypeDefinition {
  id: string;
  archetypeId: string;
  label: string;
  backend: RuntimeBackendId;
  defaultModel?: string | null;
}

export interface RuntimeInstance {
  id: string;
  projectId: string;
  backend: RuntimeBackendId;
  kind: AgentInstanceKind;
  agentTypeId: string;
  label: string;
  status: RuntimeStatus;
  taskId: string | null;
  epicId: string | null;
  swarmId: string | null;
}

export interface LaunchRequest {
  id: string;
  projectId: string;
  backend: RuntimeBackendId;
  origin: LaunchSurface;
  taskId: string;
  epicId: string | null;
  swarmId: string | null;
  templateId: string | null;
  requestedAgentTypeId: string | null;
  contextSummary: string;
  issueTitle: string;
  dependencyIds: string[];
  createdAt: string;
}

export interface TemplateDeviationRecord {
  id: string;
  launchRequestId: string;
  severity: TemplateDeviationSeverity;
  summary: string;
  reason: string;
  requiresApproval: boolean;
  createdAt: string;
}

export interface RuntimeConsoleEvent {
  id: string;
  projectId: string;
  kind: RuntimeEventKind;
  title: string;
  detail: string;
  timestamp: string;
  status?: RuntimeStatus;
  actorLabel?: string;
  taskId?: string | null;
  swarmId?: string | null;
  metadata?: Record<string, unknown>;
}

function stableProjectId(projectRoot: string): string {
  return projectRoot
    .replace(/^[A-Za-z]:/, '')
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase() || 'root';
}

export function getProjectRuntimeId(projectRoot: string): string {
  return stableProjectId(path.resolve(projectRoot));
}

export function getOrchestratorAgentType(): AgentTypeDefinition {
  return {
    id: 'pi-orchestrator',
    archetypeId: 'orchestrator',
    label: 'Project Orchestrator',
    backend: 'pi',
    defaultModel: null,
  };
}

export function createOrchestratorInstance(projectRoot: string): RuntimeInstance {
  const projectId = getProjectRuntimeId(projectRoot);
  return {
    id: `${projectId}:orchestrator`,
    projectId,
    backend: 'pi',
    kind: 'orchestrator',
    agentTypeId: getOrchestratorAgentType().id,
    label: 'Main Orchestrator',
    status: 'idle',
    taskId: null,
    epicId: null,
    swarmId: null,
  };
}

export function buildLaunchRequest(params: {
  issue: BeadIssue;
  origin: LaunchSurface;
  projectRoot: string;
  swarmId?: string | null;
  requestedAgentTypeId?: string | null;
}): LaunchRequest {
  const { issue, origin, projectRoot, swarmId = null, requestedAgentTypeId = null } = params;
  const projectId = getProjectRuntimeId(projectRoot);
  const epicId = issue.dependencies.find((dep) => dep.type === 'parent')?.target ?? null;
  const dependencyIds = issue.dependencies
    .filter((dep) => dep.type !== 'parent')
    .map((dep) => dep.target)
    .sort();

  return {
    id: `${projectId}:${origin}:${issue.id}`,
    projectId,
    backend: 'pi',
    origin,
    taskId: issue.id,
    epicId,
    swarmId,
    templateId: issue.templateId ?? null,
    requestedAgentTypeId,
    contextSummary: `Launch ${issue.id} from ${origin} with ${dependencyIds.length} dependency link(s).`,
    issueTitle: issue.title,
    dependencyIds,
    createdAt: new Date().toISOString(),
  };
}

export function createDeviationRecord(params: {
  launchRequest: LaunchRequest;
  severity: TemplateDeviationSeverity;
  summary: string;
  reason: string;
}): TemplateDeviationRecord {
  const { launchRequest, severity, summary, reason } = params;
  return {
    id: `${launchRequest.id}:deviation`,
    launchRequestId: launchRequest.id,
    severity,
    summary,
    reason,
    requiresApproval: severity === 'major',
    createdAt: new Date().toISOString(),
  };
}

export function createRuntimeConsoleEvent(params: {
  projectId: string;
  kind: RuntimeEventKind;
  title: string;
  detail: string;
  status?: RuntimeStatus;
  actorLabel?: string;
  taskId?: string | null;
  swarmId?: string | null;
  metadata?: Record<string, unknown>;
}): RuntimeConsoleEvent {
  const { projectId, kind, title, detail, status, actorLabel, taskId = null, swarmId = null, metadata } = params;
  return {
    id: `${projectId}:${kind}:${taskId ?? 'global'}:${Date.now()}`,
    projectId,
    kind,
    title,
    detail,
    timestamp: new Date().toISOString(),
    status,
    actorLabel,
    taskId,
    swarmId,
    metadata,
  };
}

export function createLaunchConsoleEvents(request: LaunchRequest): RuntimeConsoleEvent[] {
  return [
    createRuntimeConsoleEvent({
      projectId: request.projectId,
      kind: 'launch.requested',
      title: `Launch requested for ${request.taskId}`,
      detail: `${request.issueTitle} queued from ${request.origin}.`,
      status: 'planning',
      actorLabel: 'Main Orchestrator',
      taskId: request.taskId,
      swarmId: request.swarmId,
      metadata: { templateId: request.templateId, requestedAgentTypeId: request.requestedAgentTypeId },
    }),
    createRuntimeConsoleEvent({
      projectId: request.projectId,
      kind: 'orchestrator.message',
      title: 'Orchestrator reviewing launch context',
      detail: request.contextSummary,
      status: 'planning',
      actorLabel: 'Main Orchestrator',
      taskId: request.taskId,
      swarmId: request.swarmId,
    }),
  ];
}
