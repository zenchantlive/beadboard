"use client";

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { deriveBlockedIds, buildBlockedByTree, type BlockedTreeNode } from '../../lib/kanban';
import { useArchetypePicker } from '../../hooks/use-archetype-picker';
import { useArchetypes } from '../../hooks/use-archetypes';
import type { BeadIssue } from '../../lib/types';
import type { AgentState } from '../../lib/agent';
import type { AgentArchetype } from '../../lib/types-swarm';
import { Blocks, ChevronRight, UserPlus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BlockedTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: BeadIssue[];
  projectRoot: string;
  agentStates?: readonly AgentState[];
  onSelectTask?: (taskId: string) => void;
}

export interface BlockedTriageAssignmentOption {
  archetype: AgentArchetype;
  liveCount: number;
  idleCount: number;
  busyCount: number;
  blockedCount: number;
}

export interface BlockedTriageIssueSummary {
  issue: BeadIssue;
  isExplicitlyBlocked: boolean;
  isDerivedBlocked: boolean;
  blockerChain: {
    total: number;
    nodes: BlockedTreeNode[];
  };
}

export function selectBlockedTriageIssues(issues: BeadIssue[]): BlockedTriageIssueSummary[] {
  const blockedIdsSet = deriveBlockedIds(issues);

  return issues
    .filter((issue) => {
      const isExplicitlyBlocked = issue.status === 'blocked';
      const isDerivedBlocked = blockedIdsSet.has(issue.id);
      return isExplicitlyBlocked || isDerivedBlocked;
    })
    .map((issue) => ({
      issue,
      isExplicitlyBlocked: issue.status === 'blocked',
      isDerivedBlocked: blockedIdsSet.has(issue.id),
      blockerChain: buildBlockedByTree(issues, issue.id),
    }))
    .sort((left, right) => {
      if (left.isExplicitlyBlocked !== right.isExplicitlyBlocked) {
        return left.isExplicitlyBlocked ? -1 : 1;
      }
      if (left.issue.priority !== right.issue.priority) {
        return left.issue.priority - right.issue.priority;
      }
      return left.issue.id.localeCompare(right.issue.id);
    });
}

export function buildBlockedTriageAssignmentOptions(
  archetypes: readonly AgentArchetype[],
  agentStates: readonly AgentState[] = [],
): BlockedTriageAssignmentOption[] {
  const countsByType = new Map<string, Omit<BlockedTriageAssignmentOption, 'archetype'>>();

  for (const state of agentStates) {
    const agentTypeId = state.agentTypeId?.trim();
    if (!agentTypeId) {
      continue;
    }

    const current = countsByType.get(agentTypeId) ?? {
      liveCount: 0,
      idleCount: 0,
      busyCount: 0,
      blockedCount: 0,
    };

    if (state.status !== 'completed' && state.status !== 'failed') {
      current.liveCount += 1;
    }
    if (state.status === 'idle') {
      current.idleCount += 1;
    }
    if (state.status === 'launching' || state.status === 'working') {
      current.busyCount += 1;
    }
    if (state.status === 'blocked') {
      current.blockedCount += 1;
    }

    countsByType.set(agentTypeId, current);
  }

  const options = archetypes.map((archetype) => {
    const counts = countsByType.get(archetype.id) ?? {
      liveCount: 0,
      idleCount: 0,
      busyCount: 0,
      blockedCount: 0,
    };

    return {
      archetype,
      ...counts,
    };
  });

  const liveOptions = options.filter((option) => option.liveCount > 0);
  const visibleOptions = liveOptions.length > 0 ? liveOptions : options;

  return visibleOptions.sort((left, right) => {
    if (left.liveCount !== right.liveCount) {
      return right.liveCount - left.liveCount;
    }
    if (left.idleCount !== right.idleCount) {
      return right.idleCount - left.idleCount;
    }
    return left.archetype.name.localeCompare(right.archetype.name);
  });
}

export function BlockedTriageModal({
  isOpen,
  onClose,
  issues,
  projectRoot,
  agentStates = [],
  onSelectTask,
}: BlockedTriageModalProps) {
  const { archetypes } = useArchetypes(projectRoot);
  const blockedTaskSummaries = useMemo(() => selectBlockedTriageIssues(issues), [issues]);
  const assignmentOptions = useMemo(
    () => buildBlockedTriageAssignmentOptions(archetypes, agentStates),
    [agentStates, archetypes],
  );
  const assignmentAvailabilityNote = useMemo(() => {
    const totalLiveOptions = assignmentOptions.filter((option) => option.liveCount > 0).length;
    if (assignmentOptions.length === 0) {
      return 'No agent types are available yet.';
    }
    if (totalLiveOptions === 0) {
      return 'No live agents detected; showing all archetypes.';
    }
    if (totalLiveOptions === assignmentOptions.length) {
      return `Showing ${totalLiveOptions} live agent type${totalLiveOptions === 1 ? '' : 's'}.`;
    }
    return `Showing ${totalLiveOptions} live agent type${totalLiveOptions === 1 ? '' : 's'} of ${assignmentOptions.length}.`;
  }, [assignmentOptions]);

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const archetypePicker = useArchetypePicker();

  const toggleRow = (issueId: string) => {
    setExpandedRow((prev) => (prev === issueId ? null : issueId));
  };

  const handleAssign = async (issueId: string) => {
    await archetypePicker.handleAssign(issueId);
    if (archetypePicker.assignSuccess) {
      setExpandedRow(null);
      archetypePicker.resetAssignState();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-[var(--surface-elevated)] border-[var(--border-strong)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <Blocks className="w-5 h-5 text-[var(--accent-warning)]" />
            Blocked Tasks Triage
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            {blockedTaskSummaries.length} blocked task{blockedTaskSummaries.length !== 1 ? 's' : ''} require attention.
            Click on a row to see the blocker chain and assign an archetype.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {blockedTaskSummaries.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              No blocked tasks found.
            </div>
          ) : (
            blockedTaskSummaries.map(({ issue, isExplicitlyBlocked, isDerivedBlocked, blockerChain }) => {
              const isExpanded = expandedRow === issue.id;

              return (
                <div
                  key={issue.id}
                  className="border rounded-lg bg-[var(--surface-card)] border-[var(--border-subtle)] overflow-hidden"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onSelectTask?.(issue.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectTask?.(issue.id);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleRow(issue.id);
                      }}
                      className="p-0.5"
                      aria-label={isExpanded ? 'Collapse blocker chain' : 'Expand blocker chain'}
                      title={isExpanded ? 'Collapse blocker chain' : 'Expand blocker chain'}
                    >
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 text-[var(--text-tertiary)] transition-transform',
                          isExpanded && 'rotate-90'
                        )}
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text-primary)] truncate">
                        {issue.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {issue.id}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {onSelectTask && (
                        <button
                          type="button"
                          onClick={() => onSelectTask(issue.id)}
                          className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--accent-info)]"
                          title="Open in panel"
                          aria-label="Open in panel"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                      {isExplicitlyBlocked && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--status-blocked)] text-[var(--text-inverse)]">
                          explicit
                        </span>
                      )}
                      {isDerivedBlocked && !isExplicitlyBlocked && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]">
                          derived
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[var(--border-subtle)] p-3 bg-[var(--surface-tertiary)]/50">
                      {blockerChain.nodes.length > 0 ? (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">
                            Blocked by:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {blockerChain.nodes.map((node: BlockedTreeNode) => (
                              <span
                                key={node.id}
                                className="inline-flex items-center text-xs px-2 py-1 rounded bg-[var(--surface-elevated)] border border-[var(--border-subtle)]"
                                style={{ marginLeft: `${node.level * 12}px` }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-danger)] mr-1.5" />
                                {node.title}
                              </span>
                            ))}
                            {blockerChain.total > blockerChain.nodes.length && (
                              <span className="text-xs text-[var(--text-tertiary)] py-1">
                                +{blockerChain.total - blockerChain.nodes.length} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-tertiary)] mb-3">
                          No blocker chain found.
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                            Live availability
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {assignmentAvailabilityNote}
                          </p>
                        </div>
                        <select
                          value={archetypePicker.selectedArchetype || ''}
                          onChange={(e) =>
                            archetypePicker.setSelectedArchetype(e.target.value || null)
                          }
                          className="flex-1 text-sm px-3 py-1.5 rounded border bg-[var(--surface-input)] border-[var(--border-default)] text-[var(--text-primary)]"
                        >
                          <option value="">Select archetype...</option>
                          {assignmentOptions.map((option) => (
                            <option key={option.archetype.id} value={option.archetype.id}>
                              {option.archetype.name} ({option.liveCount} live{option.idleCount > 0 ? `, ${option.idleCount} idle` : ''})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(issue.id)}
                          disabled={!archetypePicker.selectedArchetype || archetypePicker.isAssigning}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--accent-info)] text-[var(--text-inverse)] text-sm font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {archetypePicker.isAssigning ? 'Assigning...' : 'Assign'}
                        </button>
                      </div>
                      {archetypePicker.assignError && (
                        <p className="text-xs text-[var(--accent-danger)] mt-2">
                          {archetypePicker.assignError}
                        </p>
                      )}
                      {archetypePicker.assignSuccess && (
                        <p className="text-xs text-[var(--accent-success)] mt-2">
                          Assigned successfully!
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
