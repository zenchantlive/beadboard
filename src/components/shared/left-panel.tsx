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
    onEpicSelect?.(epicId === selectedEpicId ? null : epicId); // Toggle selection
    toggleEpic(epicId);
  };

  if (isTablet) {
    return (
      <div
        className="w-16 overflow-y-auto flex flex-col items-center py-4 gap-2 bg-[#1a1a1a]/95 backdrop-blur-xl border-r border-white/5"
        data-testid="left-panel"
      >
        {epicTree.map(({ epic }) => (
          <button
            key={epic.id}
            type="button"
            onClick={() => handleEpicClick(epic.id)}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200',
              selectedEpicId === epic.id
                ? 'bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/30 shadow-[0_0_10px_rgba(45,212,191,0.2)]'
                : 'hover:bg-white/5 text-text-muted hover:text-white'
            )}
            title={epic.title || epic.id}
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
      style={{
        width: '18rem', // Wider panel
      }}
      data-testid="left-panel"
    >
      <div className="h-full bg-[#1a1a1a]/95 backdrop-blur-xl border-r border-white/5 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Channels</span>
          <span className="text-[10px] font-mono text-text-muted/40">{epicTree.length}</span>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {epicTree.map(({ epic, children }) => {
            const isExpanded = expandedEpics.has(epic.id);
            const isSelected = selectedEpicId === epic.id;
            const childCount = children.length;

            return (
              <div key={epic.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => handleEpicClick(epic.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group',
                    isSelected 
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                      : 'hover:bg-white/5 text-text-secondary hover:text-white border border-transparent'
                  )}
                >
                  <div className={cn(
                    "w-1 h-4 rounded-full transition-colors",
                    isSelected ? "bg-teal-500 shadow-[0_0_8px_#14b8a6]" : "bg-white/10 group-hover:bg-white/30"
                  )} />
                  
                  <span className="flex-1 truncate text-sm font-medium tracking-tight">
                    {epic.title || epic.id}
                  </span>
                  
                  {childCount > 0 && (
                    <span className={cn(
                      "text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors",
                      isSelected ? "bg-teal-500/20 text-teal-300" : "bg-white/5 text-text-muted group-hover:bg-white/10"
                    )}>
                      {childCount}
                    </span>
                  )}
                </button>

                {/* Sub-items (Agents/Tasks usually, but here listed as children) */}
                {isExpanded && childCount > 0 && (
                  <div className="ml-4 mt-1 pl-3 border-l border-white/5 space-y-0.5">
                    {children.slice(0, 5).map(child => (
                      <div
                        key={child.id}
                        className="px-3 py-1.5 text-xs text-text-muted/60 truncate hover:text-text-muted cursor-default"
                      >
                        {child.title}
                      </div>
                    ))}
                    {childCount > 5 && (
                      <div className="px-3 py-1 text-[10px] text-text-muted/30 italic">
                        +{childCount - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {epicTree.length === 0 && (
            <div className="p-8 text-center opacity-40 flex flex-col items-center">
              <div className="text-2xl mb-2">📡</div>
              <p className="text-xs font-mono">NO_CHANNELS</p>
            </div>
          )}
        </div>

        {/* Footer Scope */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                defaultChecked
                onChange={() => onEpicSelect?.(null)} // Clear selection
                checked={selectedEpicId === null}
                className="peer appearance-none w-4 h-4 rounded border border-white/20 bg-transparent checked:bg-teal-500 checked:border-teal-500 transition-all"
              />
              <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="text-xs font-medium text-text-secondary group-hover:text-white transition-colors">
              Global Scope (All)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default LeftPanel;