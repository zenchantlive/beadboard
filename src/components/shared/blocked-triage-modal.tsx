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
import { Blocks, ChevronRight, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BlockedTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: BeadIssue[];
  projectRoot: string;
}

export function BlockedTriageModal({
  isOpen,
  onClose,
  issues,
  projectRoot,
}: BlockedTriageModalProps) {
  const { archetypes } = useArchetypes(projectRoot);
  const blockedIdsSet = useMemo(() => deriveBlockedIds(issues), [issues]);

  const blockedTasks = useMemo(() => {
    return issues.filter((issue) => {
      const isExplicitlyBlocked = issue.status === 'blocked';
      const isDerivedBlocked = blockedIdsSet.has(issue.id);
      return isExplicitlyBlocked || isDerivedBlocked;
    });
  }, [issues, blockedIdsSet]);

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
            {blockedTasks.length} blocked task{blockedTasks.length !== 1 ? 's' : ''} require attention.
            Click on a row to see the blocker chain and assign an archetype.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {blockedTasks.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              No blocked tasks found.
            </div>
          ) : (
            blockedTasks.map((issue) => {
              const blockerChain = buildBlockedByTree(issues, issue.id);
              const isExpanded = expandedRow === issue.id;

              return (
                <div
                  key={issue.id}
                  className="border rounded-lg bg-[var(--surface-card)] border-[var(--border-subtle)] overflow-hidden"
                >
                  <button
                    onClick={() => toggleRow(issue.id)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 text-[var(--text-tertiary)] transition-transform',
                        isExpanded && 'rotate-90'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text-primary)] truncate">
                        {issue.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {issue.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {issue.status === 'blocked' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--status-blocked)] text-[var(--text-inverse)]">
                          explicit
                        </span>
                      )}
                      {blockedIdsSet.has(issue.id) && issue.status !== 'blocked' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]">
                          derived
                        </span>
                      )}
                    </div>
                  </button>

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
                        <select
                          value={archetypePicker.selectedArchetype || ''}
                          onChange={(e) =>
                            archetypePicker.setSelectedArchetype(e.target.value || null)
                          }
                          className="flex-1 text-sm px-3 py-1.5 rounded border bg-[var(--surface-input)] border-[var(--border-default)] text-[var(--text-primary)]"
                        >
                          <option value="">Select archetype...</option>
                          {archetypes.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
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
