'use client';

import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

import type { BeadIssue } from '../../lib/types';

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
        ? 'bg-[linear-gradient(160deg,rgba(56,189,248,0.06),rgba(15,23,42,0.9))] border-sky-400/15'
        : 'bg-[linear-gradient(160deg,rgba(255,255,255,0.03),rgba(15,23,42,0.85))] border-white/8';
}

/**
 * Custom ReactFlow node component with:
 * - Status-aware styling (green glow for actionable, red ring for cycles)
 * - Hover tooltip showing blocker details or "Ready to work"
 * - Pulse animation on selection
 * - Dim effect when not in the selected dependency chain
 */
export function GraphNodeCard({ id, data, selected }: NodeProps<Node<GraphNodeData>>) {
    // Track hover state for tooltip visibility
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className="relative"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Target handle for incoming edges (from the left) */}
            <Handle type="target" position={Position.Left} className="!opacity-0" />

            {/* Main card body */}
            <div
                className={`group w-[18.5rem] rounded-xl border px-3 py-3 text-left transition-all duration-300 ${nodeStyle(data.kind)} ${
                    // Status-based left border accent for visual scanning
                    data.status === 'in_progress' ? 'border-l-2 border-l-amber-400/60' :
                        data.status === 'blocked' ? 'border-l-2 border-l-rose-500/60' :
                            data.status === 'closed' ? 'border-l-2 border-l-emerald-400/40 opacity-60' : ''
                    } ${
                    // Cycle detection ring
                    data.isCycleNode ? 'ring-2 ring-rose-400/55' : ''
                    } ${
                    // Actionable / "ready to work" glow effect
                    data.isActionable && !selected
                        ? 'ring-1 ring-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                        : ''
                    } ${
                    // Selected state with pulse animation
                    selected
                        ? 'border-sky-400/50 shadow-[0_20px_48px_-8px_rgba(0,0,0,0.5)] ring-1 ring-sky-400/20 node-select-pulse'
                        : 'hover:border-white/20 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.3)]'
                    } ${
                    // Dim effect for nodes not in the selected chain
                    data.isDimmed ? 'opacity-30' : 'opacity-100'
                    }`}
            >
                {/* Header: ID + priority + status badges */}
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 mb-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted/60">{id}</span>
                    <div className="flex items-center gap-1.5">
                        {/* "READY" badge for actionable nodes */}
                        {data.isActionable ? (
                            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
                                Ready
                            </span>
                        ) : null}
                        {/* Status badge: IN PROGRESS, BLOCKED, DONE */}
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

                {/* Title - strikethrough for closed tasks */}
                <p className={`text-[15px] font-bold leading-[1.2] tracking-tight text-text-strong group-hover:text-sky-100 transition-colors ${data.status === 'closed' ? 'line-through opacity-70' : ''}`}>
                    {data.title}
                </p>

                {/* Footer: show blocker names for blocked tasks, click hint for others */}
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
            </div>

            {/* Tooltip: shown on hover with 300ms CSS delay */}
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

            {/* Source handle for outgoing edges (to the right) */}
            <Handle type="source" position={Position.Right} className="!opacity-0" />
        </div>
    );
}
