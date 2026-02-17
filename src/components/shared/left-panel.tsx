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
    blocked: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
    in_progress: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]',
    ready: 'bg-teal-500 shadow-[0_0_8px_#14b8a6]',
    done: 'bg-slate-500',
    empty: 'bg-white/10'
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
      <div className="w-16 overflow-y-auto flex flex-col items-center py-4 gap-2 bg-[#1a1a1a]/95 backdrop-blur-xl border-r border-white/5">
        {epicTree.map(({ epic, status }) => (
          <button
            key={epic.id}
            onClick={() => handleEpicClick(epic.id)}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200 ring-1',
              selectedEpicId === epic.id
                ? 'bg-white/10 ring-white/30 text-white'
                : 'hover:bg-white/5 ring-transparent text-text-muted',
              status === 'blocked' && 'ring-rose-500/50',
              status === 'in_progress' && 'ring-amber-500/50'
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
      <div className="h-full bg-[#151515]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Workstreams</span>
          <div className="flex gap-2 text-[10px] font-mono text-text-muted/40">
            <span>{epicTree.length} ACTIVE</span>
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
          {epicTree.map(({ epic, children, stats, status }) => {
            const isExpanded = expandedEpics.has(epic.id);
            const isSelected = selectedEpicId === epic.id;

            // Dynamic Styling based on Status
            const statusStyle = {
              blocked: 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10',
              in_progress: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10',
              ready: 'border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10',
              done: 'border-white/5 bg-white/[0.02] opacity-60',
              empty: 'border-white/5 bg-transparent opacity-40'
            }[status];

            const activeStyle = isSelected ? 'ring-1 ring-white/20 shadow-lg scale-[1.02]' : '';

            return (
              <div key={epic.id} className="group">
                <button
                  type="button"
                  onClick={() => handleEpicClick(epic.id)}
                  className={cn(
                    'w-full flex flex-col p-3 rounded-xl text-left transition-all duration-300 border relative overflow-hidden',
                    statusStyle,
                    activeStyle
                  )}
                >
                  {/* Status Bar Indicator */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1",
                    status === 'blocked' ? 'bg-rose-500' : 
                    status === 'in_progress' ? 'bg-amber-500' :
                    status === 'ready' ? 'bg-teal-500' : 'bg-transparent'
                  )} />

                  <div className="pl-2.5 w-full">
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[10px] font-mono text-text-muted/70 tracking-tight">{epic.id}</span>
                      {stats.blocked > 0 && (
                        <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 rounded animate-pulse">
                          {stats.blocked} BLOCKED
                        </span>
                      )}
                    </div>
                    
                    <div className="truncate text-sm font-bold text-white/90 mb-2 leading-snug">
                      {epic.title}
                    </div>

                    {/* Progress / Stats Bar */}
                    <div className="flex items-center gap-1 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                      <div style={{ width: `${(stats.closed / stats.total) * 100}%` }} className="h-full bg-slate-500/40" />
                      <div style={{ width: `${(stats.in_progress / stats.total) * 100}%` }} className="h-full bg-amber-500" />
                      <div style={{ width: `${(stats.blocked / stats.total) * 100}%` }} className="h-full bg-rose-500" />
                      <div style={{ width: `${(stats.ready / stats.total) * 100}%` }} className="h-full bg-teal-500/60" />
                    </div>
                    
                    <div className="flex justify-between mt-1.5 text-[9px] font-mono text-text-muted/50">
                      <span>{Math.round(((stats.closed + stats.in_progress) / (stats.total || 1)) * 100)}% Done</span>
                      <span>{stats.total} Tasks</span>
                    </div>
                  </div>
                </button>

                {/* Sub-items (Tasks) */}
                {isExpanded && children.length > 0 && (
                  <div className="ml-4 mt-2 space-y-1 border-l border-white/5 pl-3">
                    {children.slice(0, 5).map(child => (
                      <div
                        key={child.id}
                        className="px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer flex items-center justify-between group/child transition-colors"
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

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <label className="flex items-center gap-3 cursor-pointer group px-2 py-1 rounded hover:bg-white/5 transition-colors">
            <div className={`w-3 h-3 rounded-full border ${selectedEpicId === null ? 'bg-teal-500 border-teal-500' : 'border-white/20'}`} />
            <span className={cn(
              "text-xs font-medium transition-colors",
              selectedEpicId === null ? "text-teal-400" : "text-text-muted group-hover:text-text-secondary"
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
