'use client';

import { useMemo } from 'react';
import { Activity, AlertCircle, CheckCircle2, Loader2, UserRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BeadIssue } from '../../lib/types';
import type { AgentState } from '../../lib/agent';
import { selectTaskAssignedAgentStates } from '../../lib/agent/ownership';
export { selectTaskAssignedAgentStates } from '../../lib/agent/ownership';

type TaskAssignedAgentContextProps = {
  taskId: string;
  agentStates: readonly AgentState[];
  issue?: BeadIssue | null;
};

function stateTone(status: AgentState['status']): string {
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
  }
}

function statusIcon(status: AgentState['status']) {
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
  }
}

export function TaskAssignedAgentContext({ taskId, agentStates, issue }: TaskAssignedAgentContextProps) {
  const assignedAgentStates = useMemo(
    () => selectTaskAssignedAgentStates(agentStates, taskId, issue?.agentInstanceId ?? null),
    [agentStates, issue?.agentInstanceId, taskId],
  );

  return (
    <section className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            <UserRound className="h-3.5 w-3.5" />
            Assigned Agent
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Live runtime state for this task from the shared agent contract.
          </p>
        </div>
        <Badge className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] text-[10px] text-[var(--text-secondary)]">
          {`${assignedAgentStates.length} live`}
        </Badge>
      </div>

      {assignedAgentStates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-3 py-2 text-sm text-[var(--text-tertiary)]">
          No live assigned agent is currently reporting for this task.
        </div>
      ) : (
        <div className="space-y-2">
          {assignedAgentStates.map((state) => {
            const Icon = statusIcon(state.status);
            return (
              <div
                key={`${state.projectId}:${state.agentId}`}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {state.label}
                      </span>
                      <Badge className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]', stateTone(state.status))}>
                        {state.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--text-tertiary)]">
                      <span>agent {state.agentTypeId ?? 'unknown'}</span>
                      <span>•</span>
                      <span>task {state.taskId ?? taskId}</span>
                      {state.swarmId ? (
                        <>
                          <span>•</span>
                          <span>swarm {state.swarmId}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Icon className={cn('h-4 w-4 shrink-0 text-[var(--text-tertiary)]', state.status === 'launching' ? 'animate-spin' : null)} />
                </div>

                {state.blocker ? (
                  <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
                    Blocked: {state.blocker}
                  </div>
                ) : null}

                {state.error ? (
                  <div className="mt-2 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-100">
                    Error: {state.error}
                  </div>
                ) : null}

                {state.result ? (
                  <div className="mt-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-100">
                    Result: {state.result}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
