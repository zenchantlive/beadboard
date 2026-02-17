'use client';

import { useState, useMemo } from 'react';
import type { BeadIssue } from '../../lib/types';
import { useResponsive } from '../../hooks/use-responsive';
import { cn } from '../../lib/utils';

export interface LeftPanelProps {
  issues: BeadIssue[];
  selectedEpicId?: string | null;
  onEpicSelect?: (epicId: string | null) => void;
}

interface EpicNode {
  epic: BeadIssue;
  children: BeadIssue[];
  stats: {
    total: number;
    closed: number;
    in_progress: number;
    blocked: number;
    ready: number;
    lastActivity: number;
  };
  status: 'blocked' | 'in_progress' | 'ready' | 'done' | 'empty';
}

function buildEpicTree(issues: BeadIssue[]): EpicNode[] {
  const epics = issues.filter(issue => issue.issue_type === 'epic');
  const epicMap = new Map<string, EpicNode>();

  for (const epic of epics) {
    epicMap.set(epic.id, { 
      epic, 
      children: [],
      stats: { total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, lastActivity: new Date(epic.updated_at).getTime() },
      status: 'empty'
    });
  }

  for (const issue of issues) {
    if (issue.issue_type === 'epic') continue;

    const parentDep = issue.dependencies.find(dep => dep.type === 'parent');
    if (parentDep && epicMap.has(parentDep.target)) {
      const node = epicMap.get(parentDep.target)!;
      node.children.push(issue);
      
      node.stats.total++;
      if (issue.status === 'closed') node.stats.closed++;
      else if (issue.status === 'blocked') node.stats.blocked++;
      else if (issue.status === 'in_progress') node.stats.in_progress++;
      else node.stats.ready++; // open/ready
      
      const issueTime = new Date(issue.updated_at).getTime();
      if (issueTime > node.stats.lastActivity) node.stats.lastActivity = issueTime;
    }
  }

  // Determine Aggregate Status
  for (const node of epicMap.values()) {
    if (node.stats.blocked > 0) node.status = 'blocked';
    else if (node.stats.in_progress > 0) node.status = 'in_progress';
    else if (node.stats.ready > 0) node.status = 'ready';
    else if (node.stats.total > 0 && node.stats.closed === node.stats.total) node.status = 'done';
    else node.status = 'empty';
  }

  return Array.from(epicMap.values()).sort((a, b) => {
    // Sort by status priority (Blocked > In Progress > Ready > Done) then Recency
    const statusScore = { blocked: 4, in_progress: 3, ready: 2, done: 1, empty: 0 };
    const scoreDiff = statusScore[b.status] - statusScore[a.status];
    if (scoreDiff !== 0) return scoreDiff;
    return b.stats.lastActivity - a.stats.lastActivity;
  });
}

function StatusIndicator({ status }: { status: string }) {
  const styles = {
    blocked: 'bg-[#C97A7A] shadow-[0_0_8px_rgba(201,122,122,0.45)]',
    in_progress: 'bg-[#D4A574] shadow-[0_0_8px_rgba(212,165,116,0.45)]',
    ready: 'bg-[#7CB97A] shadow-[0_0_8px_rgba(124,185,122,0.45)]',
    done: 'bg-[var(--status-closed)]',
    empty: 'bg-white/10',
  }[status] || 'bg-slate-500';

  return <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles)} />;
}

export function LeftPanel({
  issues,
  selectedEpicId,
  onEpicSelect,
}: LeftPanelProps) {
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const { isDesktop, isTablet } = useResponsive();

  const epicTree = useMemo(() => buildEpicTree(issues), [issues]);
  const featuredEpics = useMemo(() => epicTree.slice(0, 2), [epicTree]);
  const standardEpics = useMemo(() => epicTree.slice(2, 6), [epicTree]);
  const compactEpics = useMemo(() => epicTree.slice(6), [epicTree]);

  const toggleEpic = (epicId: string) => {
    setExpandedEpics(prev => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  const handleEpicClick = (epicId: string) => {
    onEpicSelect?.(epicId === selectedEpicId ? null : epicId); 
    toggleEpic(epicId);
  };

  if (isTablet) {
    return (
      <div className="flex w-16 flex-col items-center gap-2 overflow-y-auto bg-[var(--color-bg-card)]/96 py-4 shadow-[10px_0_28px_-16px_rgba(0,0,0,0.82)]">
        {epicTree.map(({ epic, status }) => (
          <button
            key={epic.id}
            onClick={() => handleEpicClick(epic.id)}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200 ring-1',
              selectedEpicId === epic.id
                ? 'bg-[var(--color-bg-input)] ring-white/30 text-white'
                : 'ring-transparent text-[var(--color-text-muted)] hover:bg-white/5',
              status === 'blocked' && 'ring-[#C97A7A]/50',
              status === 'in_progress' && 'ring-[#D4A574]/50'
            )}
          >
            {epic.id.slice(0, 2).toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden transition-all duration-300',
        !isDesktop && 'hidden lg:flex'
      )}
      style={{ width: '20rem' }}
      data-testid="left-panel"
    >
      <div className="flex h-full flex-col bg-[radial-gradient(circle_at_4%_14%,rgba(212,165,116,0.38),transparent_44%),radial-gradient(circle_at_96%_86%,rgba(91,168,160,0.34),transparent_40%),linear-gradient(165deg,rgba(49,49,62,0.97),rgba(37,40,54,0.98))] shadow-[14px_0_34px_-18px_rgba(0,0,0,0.86)]">
        {/* Header */}
        <div className="flex items-center justify-between bg-[linear-gradient(90deg,rgba(212,165,116,0.16),rgba(91,168,160,0.12))] p-5 shadow-[0_12px_22px_-18px_rgba(0,0,0,0.9)]">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Workstreams</span>
          <div className="flex gap-2 text-[10px] font-mono text-[var(--color-text-muted)]/60">
            <span>{epicTree.length} ACTIVE</span>
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          {[
            { label: 'Featured', items: featuredEpics, tier: 'featured' as const },
            { label: 'Active', items: standardEpics, tier: 'standard' as const },
            { label: 'Queue', items: compactEpics, tier: 'compact' as const },
          ].map((section) => (
            <div key={section.label} className={cn(section.items.length === 0 && 'hidden')}>
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#97A0AF]/75">
                {section.label}
              </p>
              <div className={cn(section.tier === 'compact' ? 'space-y-1.5' : 'space-y-2.5')}>
                {section.items.map(({ epic, children, stats, status }) => {
                  const isExpanded = expandedEpics.has(epic.id);
                  const isSelected = selectedEpicId === epic.id;

                  const statusStyle = {
                    blocked:
                      'bg-[radial-gradient(circle_at_100%_50%,rgba(201,122,122,0.3),transparent_58%),rgba(92,58,58,0.8)] hover:bg-[radial-gradient(circle_at_100%_50%,rgba(201,122,122,0.38),transparent_58%),rgba(106,64,64,0.85)]',
                    in_progress:
                      'bg-[radial-gradient(circle_at_100%_50%,rgba(212,165,116,0.34),transparent_58%),rgba(92,70,45,0.82)] hover:bg-[radial-gradient(circle_at_100%_50%,rgba(212,165,116,0.44),transparent_58%),rgba(108,82,51,0.88)]',
                    ready:
                      'bg-[radial-gradient(circle_at_100%_50%,rgba(124,185,122,0.34),transparent_60%),rgba(54,84,55,0.84)] hover:bg-[radial-gradient(circle_at_100%_50%,rgba(124,185,122,0.44),transparent_60%),rgba(61,95,61,0.9)]',
                    done:
                      'bg-[radial-gradient(circle_at_100%_50%,rgba(91,168,160,0.3),transparent_58%),rgba(52,72,77,0.78)] hover:bg-[radial-gradient(circle_at_100%_50%,rgba(91,168,160,0.38),transparent_58%),rgba(59,82,87,0.84)]',
                    empty:
                      'bg-[radial-gradient(circle_at_100%_50%,rgba(74,104,130,0.2),transparent_58%),rgba(44,49,65,0.76)] hover:bg-[radial-gradient(circle_at_100%_50%,rgba(74,104,130,0.28),transparent_58%),rgba(49,56,74,0.82)]',
                  }[status];

                  if (section.tier === 'compact') {
                    return (
                      <button
                        key={epic.id}
                        type="button"
                        onClick={() => onEpicSelect?.(epic.id === selectedEpicId ? null : epic.id)}
                        className={cn(
                          'w-full rounded-lg px-2.5 py-2 text-left transition-all duration-200',
                          'flex items-center justify-between gap-2',
                          statusStyle,
                          isSelected
                            ? 'shadow-[0_14px_22px_-14px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,255,255,0.08)_inset]'
                            : 'shadow-[0_8px_16px_-12px_rgba(0,0,0,0.82)]',
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[10px] text-[#C7D0DF]/70">{epic.id}</p>
                          <p className="truncate text-xs font-semibold text-white/90">{epic.title}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-mono text-[#C7D0DF]/70">{stats.total}</p>
                          <StatusIndicator status={status} />
                        </div>
                      </button>
                    );
                  }

                  const isFeatured = section.tier === 'featured';
                  const cardPadding = isFeatured ? 'p-4' : 'p-3';
                  const titleClass = isFeatured ? 'text-base' : 'text-sm';
                  const activeStyle = isSelected
                    ? 'shadow-[0_24px_34px_-16px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)_inset] scale-[1.01]'
                    : 'shadow-[0_10px_20px_-14px_rgba(0,0,0,0.85)]';

                  return (
                    <div key={epic.id} className="group">
                      <button
                        type="button"
                        onClick={() => handleEpicClick(epic.id)}
                        className={cn(
                          'w-full flex flex-col rounded-xl text-left transition-all duration-300 relative overflow-hidden',
                          cardPadding,
                          statusStyle,
                          activeStyle,
                        )}
                      >
                        <div
                          className={cn(
                            'absolute left-0 top-0 bottom-0 w-1.5',
                            status === 'blocked'
                              ? 'bg-[#C97A7A]'
                              : status === 'in_progress'
                                ? 'bg-[#D4A574]'
                                : status === 'ready'
                                  ? 'bg-[#7CB97A]'
                                  : 'bg-[#5BA8A0]',
                          )}
                        />

                        <div className="pl-3 w-full">
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-[10px] font-mono text-text-muted/70 tracking-tight">{epic.id}</span>
                            {stats.blocked > 0 && (
                              <span className="rounded bg-[color:rgba(201,122,122,0.24)] px-1.5 text-[9px] font-bold text-[#F0C9C9]">
                                {stats.blocked} BLOCKED
                              </span>
                            )}
                          </div>

                          <div className={cn('truncate font-bold text-white/90 mb-2 leading-snug', titleClass)}>
                            {epic.title}
                          </div>

                          <div className="flex h-1.5 w-full items-center gap-1 overflow-hidden rounded-full bg-black/20">
                            <div style={{ width: `${(stats.closed / (stats.total || 1)) * 100}%` }} className="h-full bg-[#5BA8A0]/75" />
                            <div style={{ width: `${(stats.in_progress / (stats.total || 1)) * 100}%` }} className="h-full bg-[#D4A574]" />
                            <div style={{ width: `${(stats.blocked / (stats.total || 1)) * 100}%` }} className="h-full bg-[#C97A7A]" />
                            <div style={{ width: `${(stats.ready / (stats.total || 1)) * 100}%` }} className="h-full bg-[#7CB97A]" />
                          </div>

                          <div className="flex justify-between mt-1.5 text-[9px] font-mono text-text-muted/50">
                            <span>{Math.round(((stats.closed + stats.in_progress) / (stats.total || 1)) * 100)}% Done</span>
                            <span>{stats.total} Tasks</span>
                          </div>
                        </div>
                      </button>

                      {isExpanded && children.length > 0 && (
                        <div className="ml-4 mt-2 space-y-1 pl-3">
                          {children.slice(0, 5).map((child) => (
                            <div
                              key={child.id}
                              className="group/child flex cursor-pointer items-center justify-between rounded px-2 py-1.5 transition-colors hover:bg-[rgba(212,165,116,0.16)]"
                            >
                              <span className="text-[10px] font-mono text-text-muted/60">{child.id}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-text-muted/60 truncate max-w-[80px]">{child.title}</span>
                                <StatusIndicator status={child.status} />
                              </div>
                            </div>
                          ))}
                          {children.length > 5 && (
                            <div className="px-2 py-1 text-[9px] text-text-muted/30 italic">+{children.length - 5} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-black/18 p-4 shadow-[0_-10px_22px_-18px_rgba(0,0,0,0.82)]">
          <label className="group flex cursor-pointer items-center gap-3 rounded px-2 py-1 transition-colors hover:bg-white/5">
            <div className={`h-3 w-3 rounded-full ${selectedEpicId === null ? 'bg-[var(--status-ready)] shadow-[0_0_8px_rgba(124,185,122,0.7)]' : 'bg-white/25'}`} />
            <span className={cn(
              "text-xs font-medium transition-colors",
              selectedEpicId === null ? "text-[#9BD2CB]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]"
            )}>
              Global Scope
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default LeftPanel;
