'use client';

import { useState, useEffect, useRef } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Loader2, ChevronDown, UserPlus, X } from 'lucide-react';
import type { BeadIssue } from '../../lib/types';
import type { AgentArchetype } from '../../lib/types-swarm';

/** Data payload for each custom ReactFlow node. */
export interface GraphNodeData {
    /** Index signature required by ReactFlow's Node<Record<string, unknown>> constraint. */
    [key: string]: unknown;
    /** Display title of the task/epic. */
    title: string;
    /** Whether this is an epic or a regular issue. */
    kind: 'epic' | 'issue';
    /** Current workflow status. */
    status: BeadIssue['status'];
    /** Priority level (0 = highest). */
    priority: number;
    /** Number of issues blocking this node. */
    blockedBy: number;
    /** Number of issues this node blocks. */
    blocks: number;
    /** Whether this node has zero open blockers and is actionable. */
    isActionable: boolean;
    /** Whether this node is part of a dependency cycle. */
    isCycleNode: boolean;
    /** Whether this node should appear dimmed (not in selected chain). */
    isDimmed: boolean;
    /** Tooltip lines describing blocker details for hover display. */
    blockerTooltipLines: string[];
    /** Labels attached to this node, including agent assignments (agent:archetype-id). */
    labels: string[];
    /** Available agent archetypes for assignment. */
    archetypes?: AgentArchetype[];
}

function getAssignedArchetypes(labels: string[], archetypes: AgentArchetype[]): AgentArchetype[] {
    const ids = labels.filter(l => l.startsWith('agent:')).map(l => l.replace('agent:', ''));
    return archetypes.filter(a => ids.includes(a.id));
}

/**
 * Returns the Tailwind background color class for a status dot indicator.
 */
function statusDot(status: BeadIssue['status']): string {
    switch (status) {
        case 'open':
            return 'bg-sky-400';
        case 'in_progress':
            return 'bg-amber-400';
        case 'blocked':
            return 'bg-rose-500';
        case 'deferred':
            return 'bg-slate-400';
        case 'closed':
            return 'bg-emerald-400';
        case 'pinned':
            return 'bg-violet-400';
        case 'hooked':
            return 'bg-orange-400';
        default:
            return 'bg-zinc-500';
    }
}

/**
 * Returns the base card style class based on the node kind (epic vs issue).
 */
function nodeStyle(kind: GraphNodeData['kind']): string {
    return kind === 'epic'
        ? 'bg-sky-500/10 border-sky-400/30'
        : 'bg-slate-800/60 border-white/10';
}

/**
 * Custom ReactFlow node component with:
 * - Status-aware styling (green glow for actionable, red ring for cycles)
 * - Hover tooltip showing blocker details or "Ready to work"
 * - Pulse animation on selection
 * - Dim effect when not in the selected dependency chain
 * - Agent archetype assignment badges and dropdown
 */
export function GraphNodeCard({ id, data, selected }: NodeProps<Node<GraphNodeData>>) {
    const [hovered, setHovered] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);
    const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

    // Local state for labels with optimistic updates
    const [localLabels, setLocalLabels] = useState<string[]>(data.labels ?? []);

    // Track pending optimistic labels to prevent SSE overwrites
    const pendingOptimisticLabels = useRef<Set<string>>(new Set());

    // Sync local labels when parent data changes, but preserve pending optimistic updates
    useEffect(() => {
        const serverLabels = data.labels ?? [];
        const pending = pendingOptimisticLabels.current;
        if (pending.size === 0) {
            setLocalLabels(serverLabels);
        } else {
            // Merge: include pending labels that aren't yet in server data
            const merged = new Set([...serverLabels, ...pending]);
            setLocalLabels(Array.from(merged));
        }
    }, [data.labels]);

    const archetypes = data.archetypes ?? [];
    const assignedArchetypes = getAssignedArchetypes(localLabels, archetypes);
    const isClosed = data.status === 'closed';

    const handleAssignAgent = async (archetypeId: string) => {
        // Don't do anything if this archetype is already assigned
        const labelToAdd = `agent:${archetypeId}`;
        if (assignedArchetypes.some(a => a.id === archetypeId)) {
            return;
        }

        setIsAssigning(true);
        setAssignError(null);
        setAssignSuccess(null);

        // Track the new label as pending
        pendingOptimisticLabels.current.add(labelToAdd);

        // Get current agent labels to remove (single archetype constraint)
        const currentAgentLabels = localLabels.filter(l => l.startsWith('agent:'));

        // Optimistic update: remove all agent: labels, add new one
        const previousLabels = localLabels;
        setLocalLabels(prev => [...prev.filter(l => !l.startsWith('agent:')), labelToAdd]);

        try {
            // First remove existing agent labels (if any)
            if (currentAgentLabels.length > 0) {
                for (const existingLabel of currentAgentLabels) {
                    const existingArchetypeId = existingLabel.replace('agent:', '');
                    await fetch('/api/swarm/prep', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ beadId: id, archetypeId: existingArchetypeId }),
                    });
                }
            }

            // Then add the new label
            const response = await fetch('/api/swarm/prep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ beadId: id, archetypeId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error ?? 'Failed to assign agent');
            }

            const archetype = archetypes.find(a => a.id === archetypeId);
            setAssignSuccess(`Assigned ${archetype?.name ?? archetypeId}`);
            setTimeout(() => setAssignSuccess(null), 2000);
        } catch (err) {
            // Revert on error - restore previous labels
            pendingOptimisticLabels.current.delete(labelToAdd);
            setLocalLabels(previousLabels);
            setAssignError(err instanceof Error ? err.message : 'Failed to assign agent');
            setTimeout(() => setAssignError(null), 3000);
        } finally {
            pendingOptimisticLabels.current.delete(labelToAdd);
            setIsAssigning(false);
        }
    };

    const handleUnassignAgent = async (archetypeId: string) => {
        setIsAssigning(true);
        setAssignError(null);
        setAssignSuccess(null);

        // Optimistic update
        const labelToRemove = `agent:${archetypeId}`;
        setLocalLabels(prev => prev.filter(l => l !== labelToRemove));

        try {
            const response = await fetch('/api/swarm/prep', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ beadId: id, archetypeId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error ?? 'Failed to unassign agent');
            }

            const archetype = archetypes.find(a => a.id === archetypeId);
            setAssignSuccess(`Unassigned ${archetype?.name ?? archetypeId}`);
            setTimeout(() => setAssignSuccess(null), 2000);
        } catch (err) {
            // Revert on error
            setLocalLabels(prev => [...prev, labelToRemove]);
            setAssignError(err instanceof Error ? err.message : 'Failed to unassign agent');
            setTimeout(() => setAssignError(null), 3000);
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Handle type="target" position={Position.Left} className="!opacity-0" />

            <div
                className={`group w-[18.5rem] rounded-xl border px-3 py-3 text-left transition-all duration-300 ${nodeStyle(data.kind)} ${
                    data.status === 'in_progress' ? 'border-l-2 border-l-amber-400/60' :
                        data.status === 'blocked' ? 'border-l-2 border-l-rose-500/60' :
                            data.status === 'closed' ? 'border-l-2 border-l-emerald-400/40 opacity-60' : ''
                    } ${
                    data.isCycleNode ? 'ring-2 ring-rose-400/55' : ''
                    } ${
                    data.isActionable && !selected
                        ? 'ring-1 ring-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                        : ''
                    } ${
                    selected
                        ? 'border-sky-400/50 shadow-[0_20px_48px_-8px_rgba(0,0,0,0.5)] ring-1 ring-sky-400/20 node-select-pulse'
                        : 'hover:border-white/20 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.3)]'
                    } ${
                    data.isDimmed ? 'opacity-30' : 'opacity-100'
                    }`}
            >
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 mb-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted/60">{id}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {assignedArchetypes.map((archetype) => (
                            <span
                                key={archetype.id}
                                className="rounded-md px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white ring-1"
                                style={{
                                    backgroundColor: `${archetype.color}20`,
                                    borderColor: `${archetype.color}40`,
                                    color: archetype.color,
                                }}
                            >
                                {archetype.name}
                            </span>
                        ))}
                        {data.isActionable ? (
                            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
                                Ready
                            </span>
                        ) : null}
                        {data.status === 'in_progress' ? (
                            <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-amber-400">
                                In Progress
                            </span>
                        ) : data.status === 'blocked' ? (
                            <span className="rounded-md bg-rose-400/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-rose-400">
                                Blocked
                            </span>
                        ) : data.status === 'closed' ? (
                            <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-emerald-400">
                                Done
                            </span>
                        ) : null}
                        <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted/40">p{data.priority}</span>
                        <span className={`h-2 w-2 rounded-full ring-2 ring-black/40 ${statusDot(data.status)}`} />
                    </div>
                </div>

                <p className={`text-[15px] font-bold leading-[1.2] tracking-tight text-text-strong group-hover:text-sky-100 transition-colors ${data.status === 'closed' ? 'line-through opacity-70' : ''}`}>
                    {data.title}
                </p>

                {data.blockerTooltipLines.length > 0 ? (
                    <div className="mt-2 border-t border-white/5 pt-1.5">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-rose-400/70 mb-0.5">Waiting on</p>
                        {data.blockerTooltipLines.slice(0, 2).map((line) => (
                            <p key={line} className="text-[9px] text-text-muted/70 truncate leading-tight">
                                {line}
                            </p>
                        ))}
                        {data.blockerTooltipLines.length > 2 ? (
                            <p className="text-[8px] text-text-muted/50">
                                +{data.blockerTooltipLines.length - 2} more
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {!isClosed && archetypes.length > 0 ? (
                    <div className="mt-2 border-t border-white/5 pt-2">
                        {assignSuccess ? (
                            <div className="text-[9px] text-emerald-400 font-medium mb-1.5">
                                {assignSuccess}
                            </div>
                        ) : null}
                        {assignError ? (
                            <div className="text-[9px] text-rose-400 font-medium mb-1.5">
                                {assignError}
                            </div>
                        ) : null}
                        {assignedArchetypes.length > 0 ? (
                            <div className="mb-2 flex flex-wrap gap-1">
                                {assignedArchetypes.map((archetype) => (
                                    <div
                                        key={archetype.id}
                                        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] font-medium ring-1"
                                        style={{
                                            backgroundColor: `${archetype.color}15`,
                                            borderColor: `${archetype.color}30`,
                                            color: archetype.color,
                                        }}
                                    >
                                        <span>{archetype.name}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleUnassignAgent(archetype.id);
                                            }}
                                            disabled={isAssigning}
                                            className="hover:opacity-70 transition-opacity"
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <button
                                    type="button"
                                    disabled={isAssigning}
                                    className="flex items-center gap-1.5 w-full rounded-md bg-white/5 hover:bg-white/10 px-2 py-1.5 text-[9px] font-medium text-text-muted/80 transition-colors disabled:opacity-50"
                                >
                                    {isAssigning ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <UserPlus className="h-3 w-3" />
                                    )}
                                    <span>Assign Agent</span>
                                    <ChevronDown className="h-3 w-3 ml-auto" />
                                </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                    className="min-w-[180px] rounded-lg border border-white/10 bg-[#0d0f14]/95 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-lg z-50"
                                    sideOffset={4}
                                >
                                    {archetypes.map((archetype) => {
                                        const isAssigned = assignedArchetypes.some(a => a.id === archetype.id);
                                        return (
                                            <DropdownMenu.Item
                                                key={archetype.id}
                                                disabled={isAssigned || isAssigning}
                                                onClick={() => handleAssignAgent(archetype.id)}
                                                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium outline-none cursor-pointer transition-colors ${
                                                    isAssigned
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : 'text-text-strong hover:bg-white/10 focus:bg-white/10'
                                                }`}
                                            >
                                                <span
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ backgroundColor: archetype.color }}
                                                />
                                                <span>{archetype.name}</span>
                                                {isAssigned && (
                                                    <span className="ml-auto text-[9px] text-text-muted/60">Assigned</span>
                                                )}
                                            </DropdownMenu.Item>
                                        );
                                    })}
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                    </div>
                ) : null}
            </div>

            {hovered ? (
                <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 animate-fade-in">
                    <div className="max-w-xs rounded-lg border border-white/10 bg-[#0d0f14]/95 px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-lg">
                        {data.isActionable ? (
                            <>
                                <p className="text-[10px] font-bold text-emerald-400">Ready to work</p>
                                <p className="mt-0.5 text-[10px] text-text-muted/80">
                                    No open blockers. {data.blocks} task{data.blocks === 1 ? '' : 's'} depend{data.blocks === 1 ? 's' : ''} on this.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-[10px] font-bold text-rose-400">
                                    Blocked by {data.blockedBy} task{data.blockedBy === 1 ? '' : 's'}
                                </p>
                                {data.blockerTooltipLines.length > 0 ? (
                                    <ul className="mt-1 space-y-0.5">
                                        {data.blockerTooltipLines.map((line) => (
                                            <li key={line} className="text-[9px] text-text-muted/80">
                                                &bull; {line}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
            ) : null}

            <Handle type="source" position={Position.Right} className="!opacity-0" />
        </div>
    );
}
