'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Pencil, Rocket, Star } from 'lucide-react';

import type { RuntimeInstance } from '../../lib/embedded-runtime';
import type { BeadIssue } from '../../lib/types';
import { cn } from '../../lib/utils';
import { useUrlState, type LeftPanelFilters, type LeftPanelStatusFilter, type LeftPanelPriorityFilter, type LeftPanelPresetFilter, type LeftSidebarMode, type ViewType } from '../../hooks/use-url-state';
export type { LeftPanelFilters } from '../../hooks/use-url-state';
import { OrchestratorPanel } from './orchestrator-panel';

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

export interface LeftPanelProps {
  issues: BeadIssue[];
  selectedEpicId?: string | null;
  onEpicSelect?: (epicId: string | null) => void;
  onEpicEdit?: (epicId: string) => void;
  filters: LeftPanelFilters;
  onFiltersChange: (filters: LeftPanelFilters) => void;
  onAssignMode?: (epicId: string) => void;
  sidebarMode?: LeftSidebarMode;
  onSidebarModeChange?: (mode: LeftSidebarMode) => void;
  orchestrator?: RuntimeInstance;
  orchestratorThread?: import('../../lib/orchestrator-chat').OrchestratorChatMessage[];
  projectRoot?: string;
}

function mapStatus(task: BeadIssue): LeftPanelStatusFilter {
  if (task.status === 'open') return 'ready';
  if (task.status === 'in_progress') return 'in_progress';
  if (task.status === 'blocked') return 'blocked';
  if (task.status === 'deferred') return 'deferred';
  if (task.status === 'closed' || task.status === 'tombstone') return 'done';
  return 'all';
}

const views = [
  { id: 'social', label: 'Social' },
  { id: 'graph', label: 'Graph' },
] as const;

function isTaskMatch(task: BeadIssue, filters: LeftPanelFilters): boolean {
  if (filters.query.trim()) {
    const query = filters.query.toLowerCase();
    if (!task.title.toLowerCase().includes(query) && !task.id.toLowerCase().includes(query)) {
      return false;
    }
  }

  if (filters.status !== 'all') {
    if (mapStatus(task) !== filters.status) return false;
  }

  if (filters.priority !== 'all') {
    const priorityMap: Record<number, string> = { 0: 'P0', 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' };
    if (priorityMap[task.priority] !== filters.priority) return false;
  }

  if (filters.preset === 'active') {
    if (task.status !== 'open' && task.status !== 'in_progress') return false;
  }

  if (filters.preset === 'blocked_agents') {
    if (!task.labels.includes('gt:agent') && !task.labels.includes('agent:blocked')) return false;
  }

  if (filters.hideClosed) {
    if (task.status === 'closed' || task.status === 'tombstone') return false;
  }

  return true;
}

function rowTone(entry: EpicEntry): string {
  const { epic } = entry;
  if (epic.status === 'closed') return 'bg-[var(--surface-tertiary)]';
  return 'bg-[var(--surface-quaternary)]';
}

function shouldHideEpicEntry(params: {
  epicStatus: BeadIssue['status'];
  matchedChildrenCount: number;
  totalChildrenCount: number;
  isSelected: boolean;
  filters: LeftPanelFilters;
}): boolean {
  const { epicStatus, matchedChildrenCount, totalChildrenCount, isSelected, filters } = params;
  const hasTaskFilters =
    filters.query.trim().length > 0 ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.preset !== 'all';
  const epicClosed = epicStatus === 'closed' || epicStatus === 'tombstone';
  const noVisibleChildren = matchedChildrenCount === 0 && totalChildrenCount > 0;
  const hiddenByTaskFilters = hasTaskFilters && noVisibleChildren;
  const hiddenByHideClosed = filters.hideClosed && noVisibleChildren;
  const hiddenByEpicClosed = filters.hideClosed && epicClosed;

  if (hiddenByEpicClosed) {
    return true;
  }

  return !isSelected && (hiddenByTaskFilters || hiddenByHideClosed);
}

export function LeftPanel({
  issues,
  selectedEpicId,
  filters,
  onFiltersChange,
  sidebarMode = 'epics',
  onSidebarModeChange,
  orchestrator,
  orchestratorThread,
  projectRoot,
  onEpicSelect,
}: LeftPanelProps) {
  const urlState = useUrlState();
  const { view, setView } = urlState;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const entries = useMemo(() => {
    const epicMap = new Map<string, EpicEntry>();
    const childrenMap = new Map<string, BeadIssue[]>();

    for (const issue of issues) {
      if (issue.labels.includes('gt:agent')) continue;

      const parentEdge = issue.dependencies.find((dep) => dep.type === 'parent');
      if (parentEdge) {
        const children = childrenMap.get(parentEdge.target) ?? [];
        children.push(issue);
        childrenMap.set(parentEdge.target, children);
      } else if (issue.issue_type === 'epic') {
        epicMap.set(issue.id, {
          epic: issue,
          children: [],
          blockedCount: 0,
          activeCount: 0,
          readyCount: 0,
          deferredCount: 0,
          doneCount: 0,
          agentBlockedCount: 0,
          latestTimestamp: issue.updated_at ?? issue.created_at ?? '',
        });
      }
    }

    for (const entry of epicMap.values()) {
      entry.children = childrenMap.get(entry.epic.id) ?? [];
      entry.blockedCount = entry.children.filter((t) => t.status === 'blocked').length;
      entry.activeCount = entry.children.filter((t) => t.status === 'in_progress').length;
      entry.readyCount = entry.children.filter((t) => t.status === 'open').length;
      entry.deferredCount = entry.children.filter((t) => t.status === 'deferred').length;
      entry.doneCount = entry.children.filter((t) => t.status === 'closed' || t.status === 'tombstone').length;
      entry.agentBlockedCount = entry.children.filter((t) => t.labels.includes('agent:blocked')).length;
    }

    return Array.from(epicMap.values())
      .filter((entry) => !shouldHideEpicEntry({
        epicStatus: entry.epic.status,
        matchedChildrenCount: entry.children.length,
        totalChildrenCount: entry.children.length,
        isSelected: selectedEpicId === entry.epic.id,
        filters,
      }))
      .sort((a, b) => b.latestTimestamp.localeCompare(a.latestTimestamp));
  }, [issues, selectedEpicId, filters]);

  const handleEpicClick = (epicId: string) => {
    setExpanded((prev) => ({ ...prev, [epicId]: !prev[epicId] }));
    onEpicSelect?.(epicId);
  };

  return (
    <aside className="flex h-full min-h-0 overflow-hidden flex-col bg-[var(--surface-primary)] border-r border-[var(--border-strong)]" data-testid="left-panel">
      {/* ORCHESTRATOR MODE: Only show mode switcher and chat */}
      {sidebarMode === 'orchestrator' ? (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Project Orchestrator</p>
            <button
              type="button"
              onClick={() => onSidebarModeChange?.('epics')}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] transition-colors border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              title="Switch to Epics view"
            >
              Epics
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {orchestrator ? (
              <OrchestratorPanel
                orchestrator={orchestrator}
                thread={orchestratorThread ?? []}
                projectRoot={projectRoot}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 py-3 text-sm text-[var(--text-tertiary)]">
                Orchestrator not initialized. Run bd init to set up beads.
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* EPICS MODE: Show filters and epic list */}
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
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
              </div>
              <div className="grid grid-cols-2 gap-2">
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

            <div className="mt-2 flex items-center gap-1 rounded-xl bg-[var(--surface-tertiary)] p-1 border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => onSidebarModeChange?.('orchestrator')}
                className="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] transition-colors border bg-[var(--accent-info)]/15 border-[var(--accent-info)]/40 text-[var(--accent-info)]"
                aria-pressed
              >
                Orchestrator
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
            {entries.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">No epics found.</p>
            ) : (
              entries.map((entry) => {
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
                const isExpanded = expanded[epic.id] ?? false;
                const isSelected = selectedEpicId === epic.id;
                const rowBackground = rowTone(entry);

                return (
                  <div key={epic.id} className="mb-2">
                    <div
                      className={cn(
                        'rounded-xl px-3 py-3 transition-colors border border-[var(--border-subtle)]',
                        isSelected
                          ? 'border-[var(--accent-info)] bg-[var(--accent-info)]/10'
                          : rowBackground,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExpanded((prev) => ({ ...prev, [epic.id]: !prev[epic.id] }))}
                              className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)]"
                              aria-label={isExpanded ? 'Collapse epic' : 'Expand epic'}
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <div className="flex min-w-0 items-center gap-1.5">
                              <FolderOpen className="h-3.5 w-3.5 text-[var(--accent-info)]" />
                              <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{epic.title}</span>
                              {total > 0 ? (
                                <span className="shrink-0 rounded-full bg-[var(--surface-tertiary)] px-2 py-0.5 text-[10px] font-mono text-[var(--text-tertiary)]">
                                  {matchedChildren.length}/{total}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </aside>
  );
}
