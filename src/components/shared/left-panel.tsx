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
}

function buildEpicTree(issues: BeadIssue[]): EpicNode[] {
  const epics = issues.filter(issue => issue.issue_type === 'epic');
  const epicMap = new Map<string, EpicNode>();

  for (const epic of epics) {
    epicMap.set(epic.id, { epic, children: [] });
  }

  for (const issue of issues) {
    if (issue.issue_type === 'epic') continue;

    const parentDep = issue.dependencies.find(dep => dep.type === 'parent');
    if (parentDep && epicMap.has(parentDep.target)) {
      epicMap.get(parentDep.target)!.children.push(issue);
    }
  }

  return Array.from(epicMap.values()).sort((a, b) =>
    a.epic.id.localeCompare(b.epic.id)
  );
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
    onEpicSelect?.(epicId);
    toggleEpic(epicId);
  };

  if (isTablet) {
    return (
      <div
        className="w-12 overflow-y-auto flex flex-col items-center py-3 gap-2"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        data-testid="left-panel"
      >
        {epicTree.map(({ epic }) => (
          <button
            key={epic.id}
            type="button"
            onClick={() => handleEpicClick(epic.id)}
            className={cn(
              'w-9 h-9 rounded flex items-center justify-center text-xs font-medium transition-colors',
              selectedEpicId === epic.id
                ? 'bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]'
                : 'hover:bg-white/5'
            )}
            style={{ color: selectedEpicId === epic.id ? undefined : 'var(--color-text-muted-dark)' }}
            title={epic.id}
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
        'flex flex-col h-full overflow-hidden',
        !isDesktop && 'hidden lg:flex'
      )}
      style={{
        width: '13rem',
        backgroundColor: 'var(--color-bg-card)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      }}
      data-testid="left-panel"
    >
      <div className="p-3 border-b border-white/10">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted-dark)' }}
        >
          Channels
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {epicTree.map(({ epic, children }) => {
          const isExpanded = expandedEpics.has(epic.id);
          const isSelected = selectedEpicId === epic.id;
          const childCount = children.length;

          return (
            <div key={epic.id} className="select-none">
              <button
                type="button"
                onClick={() => handleEpicClick(epic.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                  'hover:bg-white/5 focus:outline-none focus:bg-white/5'
                )}
                style={{
                  color: isSelected
                    ? 'var(--color-accent-green)'
                    : 'var(--color-text-secondary)',
                }}
                data-testid={`epic-${epic.id}`}
              >
                <span
                  className="text-xs transition-transform inline-block"
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                >
                  ▶
                </span>
                <span className="flex-1 truncate text-sm">
                  {epic.id}
                </span>
                {childCount > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: 'var(--color-text-muted-dark)',
                    }}
                  >
                    {childCount}
                  </span>
                )}
              </button>

              {isExpanded && childCount > 0 && (
                <div className="pl-6">
                  {children.map(child => {
                    const childSelected = selectedEpicId === child.id;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => onEpicSelect?.(child.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                          'hover:bg-white/5 focus:outline-none focus:bg-white/5'
                        )}
                        style={{
                          color: childSelected
                            ? 'var(--color-accent-green)'
                            : 'var(--color-text-muted-dark)',
                        }}
                        data-testid={`bead-${child.id}`}
                      >
                        <span className="text-xs opacity-60">▶</span>
                        <span className="flex-1 truncate text-xs">
                          {child.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {epicTree.length === 0 && (
          <div
            className="p-4 text-sm text-center"
            style={{ color: 'var(--color-text-muted-dark)' }}
          >
            No epics found
          </div>
        )}
      </div>

      <div
        className="border-t border-white/10 p-3"
        style={{ backgroundColor: 'var(--color-bg-base)' }}
      >
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted-dark)' }}
        >
          Scope
        </span>
        <div className="mt-2 flex flex-col gap-1.5">
          <label
            className="flex items-center gap-2 cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-white/20 accent-[var(--color-accent-green)]"
            />
            <span className="text-xs">All Projects</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default LeftPanel;
