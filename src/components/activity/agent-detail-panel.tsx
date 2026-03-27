'use client';

import { useMemo } from 'react';
import { Activity, AlertCircle, ArrowLeft, CheckCircle2, Clock3, Loader2, UserRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BeadIssue } from '../../lib/types';
import type { AgentState } from '../../lib/agent';

export interface AgentDetailPanelProps {
  agentId: string;
  agentStates: readonly AgentState[];
  issues: BeadIssue[];
  onClose: () => void;
}

export function selectAgentDetailStates(
  agentStates: readonly AgentState[],
  issues: readonly BeadIssue[],
  agentId: string,
): AgentState[] {
  const normalized = agentId.trim().toLowerCase();
  const ownedTaskIds = new Set(
    issues.filter((issue) => issue.assignee === agentId || issue.agentInstanceId === agentId).map((issue) => issue.id),
  );

  return agentStates
    .filter((state) => {
      if (state.agentId.trim().toLowerCase() === normalized) {
        return true;
      }

      if (state.label.trim().toLowerCase() === normalized) {
        return true;
      }

      return Boolean(state.taskId && ownedTaskIds.has(state.taskId));
    })
    .sort((left, right) => {
      const leftTime = left.lastEventAt ? Date.parse(left.lastEventAt) : 0;
      const rightTime = right.lastEventAt ? Date.parse(right.lastEventAt) : 0;
      return rightTime - leftTime;
    });
}

function statusTone(status: AgentState['status'] | 'unknown'): string {
  switch (status) {
    case 'blocked':
      return 'border-amber-500/30 bg-amber-500/12 text-amber-200';
    case 'working':
      return 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200';
    case 'launching':
      return 'border-sky-500/30 bg-sky-500/12 text-sky-200';
    case 'idle':
      return 'border-slate-500/30 bg-slate-500/12 text-slate-200';
    case 'completed':
      return 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200';
    case 'failed':
      return 'border-rose-500/30 bg-rose-500/12 text-rose-200';
    default:
      return 'border-[var(--border-subtle)] bg-[var(--surface-quaternary)] text-[var(--text-secondary)]';
  }
}

function statusIcon(status: AgentState['status'] | 'unknown') {
  switch (status) {
    case 'blocked':
      return AlertCircle;
    case 'working':
    case 'launching':
      return Loader2;
    case 'completed':
      return CheckCircle2;
    case 'idle':
    case 'failed':
      return Activity;
    default:
      return UserRound;
  }
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'No runtime timestamp';
  }
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }
  return timestamp.toLocaleString();
}

export function AgentDetailPanel({ agentId, agentStates, issues, onClose }: AgentDetailPanelProps) {
  const matchingStates = useMemo(() => selectAgentDetailStates(agentStates, issues, agentId), [agentId, agentStates, issues]);
  const agentState = matchingStates[0] ?? null;

  const ownedTasks = useMemo(
    () => issues.filter((issue) => (issue.assignee === agentId || issue.agentInstanceId === agentId) && issue.status !== 'closed'),
    [agentId, issues],
  );

  const completedTasks = useMemo(
    () => issues.filter((issue) => (issue.assignee === agentId || issue.agentInstanceId === agentId) && issue.status === 'closed'),
    [agentId, issues],
  );

  const currentTask = useMemo(
    () => (agentState?.taskId ? issues.find((issue) => issue.id === agentState.taskId) ?? null : null),
    [agentState?.taskId, issues],
  );

  const Icon = statusIcon(agentState?.status ?? 'unknown');
  const currentTaskLabel = currentTask?.title ?? agentState?.taskId ?? 'No live task reported';

  return (
    <section className="flex h-full flex-col overflow-hidden bg-[var(--surface-primary)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Agent Detail</span>
          <Badge className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] text-[10px] text-[var(--text-secondary)]">
            {agentState ? 'live' : 'offline'}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)]"
          aria-label="Close agent detail"
          title="Close agent detail"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {agentState?.label ?? agentId}
                </span>
                <Badge className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]', statusTone(agentState?.status ?? 'unknown'))}>
                  {agentState?.status ?? 'unknown'}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--text-tertiary)]">
                <span>agent {agentState?.agentTypeId ?? 'unknown'}</span>
                <span>•</span>
                <span>id {agentState?.agentId ?? agentId}</span>
                {agentState?.swarmId ? (
                  <>
                    <span>•</span>
                    <span>swarm {agentState.swarmId}</span>
                  </>
                ) : null}
              </div>
            </div>
            <Icon className={cn('h-4 w-4 shrink-0 text-[var(--text-tertiary)]', agentState?.status === 'launching' ? 'animate-spin' : null)} />
          </div>

          <div className="mt-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Current Task</div>
            <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">{currentTaskLabel}</div>
            {currentTask ? (
              <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                task {currentTask.id} · {currentTask.status}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Owned Tasks" value={ownedTasks.length} />
          <StatCard label="Completed" value={completedTasks.length} />
        </div>

        {matchingStates.length > 1 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Additional Runtime States</div>
            <div className="mt-2 space-y-2">
              {matchingStates.slice(1).map((state) => (
                <div key={`${state.projectId}:${state.agentId}:${state.taskId ?? 'none'}`} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[var(--text-primary)]">{state.label}</div>
                      <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                        {state.taskId ? `task ${state.taskId}` : 'no task reported'}
                      </div>
                    </div>
                    <Badge className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]', statusTone(state.status))}>
                      {state.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] p-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
            <Clock3 className="h-3.5 w-3.5" />
            Runtime Details
          </div>
          <div className="mt-2 space-y-2 text-sm">
            <DetailLine label="Last event" value={formatTimestamp(agentState?.lastEventAt ?? null)} />
            <DetailLine label="Blocker" value={agentState?.blocker ?? 'None reported'} />
            <DetailLine label="Result" value={agentState?.result ?? 'No result yet'} />
            <DetailLine label="Error" value={agentState?.error ?? 'No error reported'} />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-quaternary)] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Owned Work</div>
          {ownedTasks.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-tertiary)]">No open tasks currently assigned to this agent.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {ownedTasks.slice(0, 3).map((issue) => (
                <div key={issue.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2">
                  <div className="text-sm font-medium text-[var(--text-primary)]">{issue.title}</div>
                  <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">task {issue.id} · {issue.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{label}</span>
      <span className="max-w-[70%] text-right text-[11px] text-[var(--text-secondary)]">{value}</span>
    </div>
  );
}
