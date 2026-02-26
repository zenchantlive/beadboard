'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Star } from 'lucide-react';

import type { BeadIssue } from '../../lib/types';
import { cn } from '../../lib/utils';
import { useUrlState, type ViewType } from '../../hooks/use-url-state';

export type LeftPanelStatusFilter = 'all' | 'ready' | 'in_progress' | 'blocked' | 'deferred' | 'done';
export type LeftPanelPriorityFilter = 'all' | 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type LeftPanelPresetFilter = 'all' | 'active' | 'blocked_agents';

export interface LeftPanelFilters {
  query: string;
  status: LeftPanelStatusFilter;
  priority: LeftPanelPriorityFilter;
  preset: LeftPanelPresetFilter;
  hideClosed: boolean;
}

export interface LeftPanelProps {
  issues: BeadIssue[];
  selectedEpicId?: string | null;
  onEpicSelect?: (epicId: string | null) => void;
  filters: LeftPanelFilters;
  onFiltersChange: (filters: LeftPanelFilters) => void;
}

interface EpicEntry {
  epic: BeadIssue;
  children: BeadIssue[];
  blockedCount: number;
  activeCount: number;
  readyCount: number;
  deferredCount: number;
  doneCount: number;
  agentBlockedCount: number;
  latestTimestamp: string;
}

function mapStatus(task: BeadIssue): LeftPanelStatusFilter {
  if (task.status === 'open') return 'ready';
  if (task.status === 'in_progress') return 'in_progress';
  if (task.status === 'blocked') return 'blocked';
  if (task.status === 'closed' || task.status === 'tombstone') return 'done';
  return 'deferred';
}

function mapPriority(task: BeadIssue): LeftPanelPriorityFilter {
  if (task.priority <= 0) return 'P0';
  if (task.priority === 1) return 'P1';
  if (task.priority === 2) return 'P2';
  if (task.priority === 3) return 'P3';
  return 'P4';
}

function formatRelative(timestamp: string): string {
  const then = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function buildEntries(issues: BeadIssue[]): EpicEntry[] {
  const epics = issues.filter((issue) => issue.issue_type === 'epic');
  const tasks = issues.filter((issue) => issue.issue_type !== 'epic');
  const taskById = new Map(tasks.map((task) => [task.id, task] as const));
  const incomingBlockers = new Map<string, string[]>();

  for (const task of tasks) {
    incomingBlockers.set(task.id, []);
  }

  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      if (dependency.type !== 'blocks') continue;
      if (!taskById.has(dependency.target)) continue;
      const current = incomingBlockers.get(dependency.target) ?? [];
      current.push(task.id);
      incomingBlockers.set(dependency.target, current);
    }
  }

  const isEffectivelyBlocked = (task: BeadIssue): boolean => {
    if (task.status === 'blocked') return true;
    if (task.status === 'closed' || task.status === 'tombstone') return false;
    const blockers = incomingBlockers.get(task.id) ?? [];
    return blockers.some((blockerId) => {
      const blocker = taskById.get(blockerId);
      return blocker ? blocker.status !== 'closed' && blocker.status !== 'tombstone' : false;
    });
  };

  return epics
    .map((epic) => {
      const children = tasks
        .filter((task) => task.dependencies.some((dep) => dep.type === 'parent' && dep.target === epic.id))
        .sort((a, b) => a.id.localeCompare(b.id));
      const blockedCount = children.filter((task) => isEffectivelyBlocked(task)).length;
      const activeCount = children.filter((task) => task.status === 'in_progress').length;
      const readyCount = children.filter((task) => task.status === 'open' && !isEffectivelyBlocked(task)).length;
      const deferredCount = children.filter((task) => task.status === 'deferred').length;
      const doneCount = children.filter((task) => task.status === 'closed' || task.status === 'tombstone').length;
      const agentBlockedCount = children.filter(
        (task) =>
          isEffectivelyBlocked(task) &&
          (Boolean(task.assignee) ||
            task.labels.some((label) => label === 'gt:agent' || label.startsWith('agent:') || label.startsWith('gt:agent:'))),
      ).length;
      const latestTimestamp = [epic.updated_at, ...children.map((child) => child.updated_at)]
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? epic.updated_at;
      return {
        epic,
        children,
        blockedCount,
        activeCount,
        readyCount,
        deferredCount,
        doneCount,
        agentBlockedCount,
        latestTimestamp,
      };
    })
    .sort((a, b) => a.epic.id.localeCompare(b.epic.id));
}

function statusDot(status: BeadIssue['status']): string {
  if (status === 'blocked') return 'bg-[var(--accent-danger)]';
  if (status === 'in_progress') return 'bg-[var(--accent-warning)]';
  if (status === 'closed') return 'bg-[var(--text-tertiary)]';
  return 'bg-[var(--accent-success)]';
}

function rowTone(entry: EpicEntry): string {
  if (entry.blockedCount > 0) {
    return 'rgba(255, 76, 114, 0.08)';
  }
  if (entry.activeCount > 0) {
    return 'rgba(255, 178, 74, 0.08)';
  }
  if (entry.readyCount > 0) {
    return 'rgba(53, 217, 143, 0.08)';
  }
  return 'var(--surface-tertiary)';
}

function isTaskMatch(task: BeadIssue, filters: LeftPanelFilters): boolean {
  if (filters.hideClosed && (task.status === 'closed' || task.status === 'tombstone')) return false;
  const normalizedQuery = filters.query.trim().toLowerCase();
  if (normalizedQuery.length > 0) {
    const searchable = `${task.id} ${task.title} ${task.labels.join(' ')}`.toLowerCase();
    if (!searchable.includes(normalizedQuery)) return false;
  }
  if (filters.status !== 'all' && mapStatus(task) !== filters.status) return false;
  if (filters.priority !== 'all' && mapPriority(task) !== filters.priority) return false;
  if (filters.preset === 'active' && task.status !== 'in_progress') return false;
  if (
    filters.preset === 'blocked_agents' &&
    !(
      task.status === 'blocked' &&
      (Boolean(task.assignee) || task.labels.some((label) => label === 'gt:agent' || label.startsWith('agent:')))
    )
  ) {
    return false;
  }
  return true;
}

export function LeftPanel({ issues, selectedEpicId, onEpicSelect, filters, onFiltersChange }: LeftPanelProps) {
  const { view, setView } = useUrlState();
  const entries = useMemo(() => buildEntries(issues), [issues]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.preset !== 'all' ||
    filters.hideClosed;

  const views: Array<{ id: ViewType; label: string }> = [
    { id: 'social', label: 'Social' },
    { id: 'graph', label: 'Graph' },
  ];

  return (
    <aside className="flex h-full min-h-0 overflow-hidden flex-col bg-[var(--surface-primary)] border-r border-[var(--border-strong)]" data-testid="left-panel">
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-1 rounded-xl bg-[var(--surface-tertiary)] p-1 border border-[var(--border-strong)]">
          {views.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  'flex-1 rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-info)]',
                  active
                    ? 'bg-[var(--accent-info)]/20 text-[var(--accent-info)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-2 rounded-xl bg-[var(--surface-quaternary)] p-2.5 border border-[var(--border-subtle)]">
          <div className="grid grid-cols-1 gap-2">
            <input
              value={filters.query}
              onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
              className="ui-field rounded-lg border-transparent px-2.5 py-2 text-xs shadow-[0_10px_20px_-16px_rgba(0,0,0,0.9)]"
              placeholder="Filter Tasks…"
              aria-label="Filter tasks"
              autoComplete="off"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.status}
                onChange={(event) => onFiltersChange({ ...filters, status: event.target.value as LeftPanelStatusFilter })}
                className="ui-field ui-select rounded-lg border-transparent px-2.5 py-2 text-xs shadow-[0_10px_20px_-16px_rgba(0,0,0,0.9)]"
                aria-label="Status filter"
              >
                <option className="ui-option" value="all">All Status</option>
                <option className="ui-option" value="ready">Ready</option>
                <option className="ui-option" value="in_progress">In Progress</option>
                <option className="ui-option" value="blocked">Blocked</option>
                <option className="ui-option" value="deferred">Deferred</option>
                <option className="ui-option" value="done">Done</option>
              </select>
              <select
                value={filters.priority}
                onChange={(event) => onFiltersChange({ ...filters, priority: event.target.value as LeftPanelPriorityFilter })}
                className="ui-field ui-select rounded-lg border-transparent px-2.5 py-2 text-xs shadow-[0_10px_20px_-16px_rgba(0,0,0,0.9)]"
                aria-label="Priority filter"
              >
                <option className="ui-option" value="all">All Priority</option>
                <option className="ui-option" value="P0">P0</option>
                <option className="ui-option" value="P1">P1</option>
                <option className="ui-option" value="P2">P2</option>
                <option className="ui-option" value="P3">P3</option>
                <option className="ui-option" value="P4">P4</option>
              </select>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, preset: filters.preset === 'active' ? 'all' : 'active' })}
              className={cn(
                'flex-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] transition-colors border',
                filters.preset === 'active'
                  ? 'bg-[var(--accent-warning)]/15 border-[var(--accent-warning)]/40 text-[var(--accent-warning)]'
                  : 'bg-[var(--surface-quaternary)] border-[var(--border-subtle)] text-[var(--text-tertiary)]',
              )}
              aria-pressed={filters.preset === 'active'}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, preset: filters.preset === 'blocked_agents' ? 'all' : 'blocked_agents' })}
              className={cn(
                'flex-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] transition-colors border',
                filters.preset === 'blocked_agents'
                  ? 'bg-[var(--accent-danger)]/15 border-[var(--accent-danger)]/40 text-[var(--accent-danger)]'
                  : 'bg-[var(--surface-quaternary)] border-[var(--border-subtle)] text-[var(--text-tertiary)]',
              )}
              aria-pressed={filters.preset === 'blocked_agents'}
            >
              Agent Blocked
            </button>
          </div>
          <button
            type="button"
            onClick={() => onFiltersChange({ ...filters, hideClosed: !filters.hideClosed })}
            className={cn(
              'w-full rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] transition-colors border',
              filters.hideClosed
                ? 'bg-[var(--accent-success)]/15 border-[var(--accent-success)]/40 text-[var(--accent-success)]'
                : 'bg-[var(--surface-quaternary)] border-[var(--border-subtle)] text-[var(--text-tertiary)]',
            )}
            aria-pressed={filters.hideClosed}
          >
            Hide Closed
          </button>
        </div>

        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Navigation / Epics</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {entries.map((entry) => {
          const {
            epic,
            children,
            blockedCount,
            activeCount,
            readyCount,
            deferredCount,
            doneCount,
            agentBlockedCount,
            latestTimestamp,
          } = entry;
          const matchedChildren = children.filter((task) => isTaskMatch(task, filters));
          const total = children.length;
          const donePercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
          const readyPercent = total > 0 ? Math.round((readyCount / total) * 100) : 0;
          const activePercent = total > 0 ? Math.round((activeCount / total) * 100) : 0;
          const blockedPercent = total > 0 ? Math.round((blockedCount / total) * 100) : 0;
          const isExpanded = expanded[epic.id] ?? false;
          const isSelected = selectedEpicId === epic.id;
          const laneColor = blockedCount > 0 ? 'var(--accent-danger)' : activeCount > 0 ? 'var(--accent-warning)' : 'var(--accent-success)';
          const rowBackground = rowTone(entry);

          if (matchedChildren.length === 0 && hasActiveFilters && !isSelected) {
            return null;
          }

          return (
            <div key={epic.id} className="mb-2">
              <div
                className={cn(
                  'rounded-xl px-3 py-3 transition-colors border border-[var(--border-subtle)]',
                  isSelected
                    ? 'text-[var(--text-primary)] ring-1 ring-[var(--accent-info)]/30'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
                )}
                style={{
                  borderLeft: `3px solid ${laneColor}`,
                  background: rowBackground,
                }}
              >
                <div className="mb-1.5 flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded((current) => ({ ...current, [epic.id]: !isExpanded }))}
                    className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-info)]"
                    aria-label={isExpanded ? `Collapse ${epic.title}` : `Expand ${epic.title}`}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEpicSelect?.(isSelected ? null : epic.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      {isExpanded ? <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /> : <Folder className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
                      <p className="truncate text-[15px] font-semibold leading-tight text-[var(--text-primary)]">{epic.title}</p>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--text-tertiary)]">{epic.id}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEpicSelect?.(epic.id)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--surface-quaternary)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] transition-colors hover:text-[var(--text-primary)]"
                    aria-label={`Focus ${epic.title}`}
                  >
                    <Star className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <p><span className="text-[var(--text-primary)]">{total}</span> tasks</p>
                  <p><span className="text-[var(--accent-warning)]">{activeCount}</span> active</p>
                  <p><span className="text-[var(--accent-danger)]">{agentBlockedCount}</span> ag-blocked</p>
                  <p className="ml-auto text-[var(--text-tertiary)]">{formatRelative(latestTimestamp)}</p>
                </div>

                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#0a111a]">
                    <div className="flex h-full w-full">
                      <div style={{ width: `${readyPercent}%`, background: 'var(--accent-success)' }} />
                      <div style={{ width: `${activePercent}%`, background: 'var(--accent-warning)' }} />
                      <div style={{ width: `${blockedPercent}%`, background: 'var(--accent-danger)' }} />
                      <div style={{ width: `${Math.max(0, 100 - readyPercent - activePercent - blockedPercent)}%`, background: 'var(--text-tertiary)' }} />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
                    <span>{donePercent}% done</span>
                    <span><span className="text-[var(--accent-success)]">{readyCount}</span> ready</span>
                  </div>
                </div>

                {deferredCount + doneCount + blockedCount > 0 ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                    {blockedCount > 0 ? <span>{blockedCount} blocked</span> : null}
                    {deferredCount > 0 ? <span>{deferredCount} deferred</span> : null}
                    {doneCount > 0 ? <span>{doneCount} done</span> : null}
                  </div>
                ) : null}
              </div>

              {isExpanded ? (
                <div className="ml-8 mt-1 space-y-1 pl-3">
                  {matchedChildren.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onEpicSelect?.(epic.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', statusDot(task.status))} />
                      <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      {task.assignee ? (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-[var(--alpha-white-low)] text-[var(--text-primary)]">
                          {task.assignee.slice(0, 2)}
                        </span>
                      ) : null}
                      <span className="font-mono text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{task.id}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <footer className="border-t border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[linear-gradient(135deg,#9cb6bf,#f1dcc6)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Alex Chen</p>
            <p className="text-xs text-[var(--text-tertiary)]">Lead Ops</p>
          </div>
        </div>
      </footer>
    </aside>
  );
}

export default LeftPanel;
