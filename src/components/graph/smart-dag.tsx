'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Filter, UserPlus } from 'lucide-react';

import type { BeadIssue } from '../../lib/types';
import type { GraphHopDepth } from '../../lib/graph-view';
import { WorkflowGraph } from '../shared/workflow-graph';
import { WorkflowTabs, type WorkflowTab } from './workflow-tabs';
import { TaskCardGrid, type BlockerDetail } from './task-card-grid';
import { useArchetypes } from '../../hooks/use-archetypes';
import { useGraphAnalysis } from '../../hooks/use-graph-analysis';

export interface SmartDagProps {
  issues: BeadIssue[];
  epicId?: string | null;
  selectedTaskId?: string;
  onSelectTask?: (id: string) => void;
  projectRoot: string;
  hideClosed?: boolean;
  onAssignModeChange?: (assignMode: boolean) => void;
  onSelectedIssueChange?: (issue: BeadIssue | null) => void;
}

const DEPTH_OPTIONS: GraphHopDepth[] = [1, 2, 'full'];

export function SmartDag({
  issues,
  epicId,
  selectedTaskId,
  onSelectTask,
  projectRoot,
  hideClosed: hideClosedProp = false,
  onAssignModeChange,
  onSelectedIssueChange,
}: SmartDagProps) {
  const { archetypes } = useArchetypes(projectRoot);

  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkflowTab>('tasks');
  const [assignMode, setAssignMode] = useState(false);

  const [hideClosed, setHideClosed] = useState(hideClosedProp);
  const [depth, setDepth] = useState<GraphHopDepth>('full');
  const [blockingOnly, setBlockingOnly] = useState(false);
  const [sortReadyFirst, setSortReadyFirst] = useState(true);

  const displayBeads = useMemo(() => {
    if (!epicId) return issues;
    return issues.filter(issue => {
      if (issue.issue_type === 'epic') return false;
      const parent = issue.dependencies.find(d => d.type === 'parent');
      return parent?.target === epicId;
    });
  }, [issues, epicId]);

  const {
    signalById,
    cycleNodeIdSet,
    actionableNodeIds,
    blockerTooltipMap,
  } = useGraphAnalysis(issues, projectRoot, selectedTaskId ?? null);

  const blockerDetailsMap = useMemo(() => {
    const map = new Map<string, BlockerDetail[]>();
    for (const issue of displayBeads) {
      const blockers: BlockerDetail[] = [];
      for (const dep of issue.dependencies) {
        if (dep.type === 'blocks') {
          const blocker = issues.find(i => i.id === dep.target);
          if (blocker && blocker.status !== 'closed') {
            blockers.push({
              id: blocker.id,
              title: blocker.title,
              status: blocker.status,
              priority: blocker.priority,
            });
          }
        }
      }
      if (blockers.length > 0) {
        map.set(issue.id, blockers);
      }
    }
    return map;
  }, [displayBeads, issues]);

  const blocksDetailsMap = useMemo(() => {
    const map = new Map<string, BlockerDetail[]>();
    for (const issue of displayBeads) {
      const blocking: BlockerDetail[] = [];
      for (const other of issues) {
        for (const dep of other.dependencies) {
          if (dep.type === 'blocks' && dep.target === issue.id) {
            if (other.status !== 'closed') {
              blocking.push({
                id: other.id,
                title: other.title,
                status: other.status,
                priority: other.priority,
              });
            }
          }
        }
      }
      if (blocking.length > 0) {
        map.set(issue.id, blocking);
      }
    }
    return map;
  }, [displayBeads, issues]);

  const sortedTasks = useMemo(() => {
    let tasks = displayBeads.filter(issue => 
      hideClosed ? issue.status !== 'closed' : true
    );

    if (blockingOnly && activeTab === 'dependencies') {
      tasks = tasks.filter(issue => {
        const blockers = blockerDetailsMap.get(issue.id) ?? [];
        return blockers.length > 0 || issue.status === 'blocked';
      });
    }

    if (sortReadyFirst && activeTab === 'tasks') {
      tasks = [...tasks].sort((a, b) => {
        const aReady = actionableNodeIds.has(a.id) && a.status !== 'closed';
        const bReady = actionableNodeIds.has(b.id) && b.status !== 'closed';
        if (aReady && !bReady) return -1;
        if (!aReady && bReady) return 1;
        return a.priority - b.priority;
      });
    }

    return tasks;
  }, [displayBeads, hideClosed, blockingOnly, blockerDetailsMap, sortReadyFirst, actionableNodeIds, activeTab]);

  const handleAssignModeToggle = useCallback(() => {
    const newMode = !assignMode;
    setAssignMode(newMode);
    onAssignModeChange?.(newMode);
  }, [assignMode, onAssignModeChange]);

  const handleTaskSelect = useCallback((id: string, shouldOpenDrawer?: boolean) => {
    onSelectTask?.(id);
    const selectedIssue = issues.find(i => i.id === id) ?? null;
    onSelectedIssueChange?.(selectedIssue);
  }, [onSelectTask, issues, onSelectedIssueChange]);

  const selectedIssue = useMemo(() => 
    issues.find(i => i.id === selectedTaskId) ?? null, 
    [issues, selectedTaskId]
  );

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 relative bg-[radial-gradient(ellipse_at_top,#142336_0%,#090d14_100%)]">
      <div className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-3 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(current => !current)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
              showFilters
                ? 'border-sky-400/30 bg-sky-400/10 text-sky-300'
                : 'border-white/10 bg-white/5 text-text-muted hover:bg-white/10'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters {showFilters ? '▴' : '▾'}
          </button>

          <button
            type="button"
            onClick={handleAssignModeToggle}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
              assignMode
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                : 'border-white/10 bg-white/5 text-text-muted hover:bg-white/10'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Assign
          </button>
        </div>

        <WorkflowTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {showFilters ? (
        <div className="flex flex-wrap items-center gap-4 border-b border-white/5 px-4 py-3 bg-white/[0.01]">
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-text-body transition-all hover:bg-white/5">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-sky-500"
              checked={hideClosed}
              onChange={(e) => setHideClosed(e.target.checked)}
            />
            Hide closed
          </label>

          {activeTab === 'tasks' ? (
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-text-body transition-all hover:bg-white/5">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-sky-500"
                checked={sortReadyFirst}
                onChange={(e) => setSortReadyFirst(e.target.checked)}
              />
              Ready first
            </label>
          ) : null}

          {activeTab === 'dependencies' ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-text-body">
                <span className="text-text-muted">Depth:</span>
                <select
                  className="bg-transparent text-text-body focus:outline-none"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value as GraphHopDepth)}
                >
                  {DEPTH_OPTIONS.map(opt => (
                    <option key={String(opt)} value={opt} className="bg-zinc-900">
                      {opt === 'full' ? 'Full' : `${opt} hop${opt === 1 ? '' : 's'}`}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-text-body transition-all hover:bg-white/5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-sky-500"
                  checked={blockingOnly}
                  onChange={(e) => setBlockingOnly(e.target.checked)}
                />
                Blocking only
              </label>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex-1 overflow-hidden">
        {activeTab === 'tasks' ? (
          <div className="h-full overflow-y-auto p-4">
            <TaskCardGrid
              tasks={sortedTasks}
              selectedId={selectedTaskId ?? null}
              blockerDetailsMap={blockerDetailsMap}
              blocksDetailsMap={blocksDetailsMap}
              actionableIds={actionableNodeIds}
              onSelect={handleTaskSelect}
            />
          </div>
        ) : (
          <div className="h-full p-4">
            <WorkflowGraph
              beads={sortedTasks}
              selectedId={selectedTaskId}
              onSelect={onSelectTask}
              hideClosed={hideClosed}
              archetypes={archetypes}
              assignMode={assignMode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
