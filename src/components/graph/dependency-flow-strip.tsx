'use client';

import type { GraphNode } from '../../lib/graph';
import type { PathWorkspace } from '../../lib/graph-view';
import type { BeadIssue } from '../../lib/types';

/** Props for an individual flow card in the dependency strip. */
interface FlowCardProps {
    /** The graph node data for this card. */
    node: GraphNode;
    /** Whether this card is the currently selected/focused task. */
    selected: boolean;
    /** Number of issues blocking this node. */
    blockedBy: number;
    /** Number of issues this node blocks. */
    blocks: number;
    /** Callback fired when the user clicks this card. */
    onSelect: (id: string) => void;
}

/** Props for the DependencyFlowStrip component. */
interface DependencyFlowStripProps {
    /** The computed path workspace containing blockers, focus, and dependents. */
    workspace: PathWorkspace;
    /** ID of the currently selected task, or null. */
    selectedId: string | null;
    /** Map of issue ID to blocker/blocks counts. */
    signalById: Map<string, { blockedBy: number; blocks: number }>;
    /** Callback fired when the user selects a card. */
    onSelect: (id: string) => void;
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
 * A compact card representing a single node in the dependency flow.
 * Shows ID, title, status, and blocker/blocks counts.
 */
function FlowCard({ node, selected, blockedBy, blocks, onSelect }: FlowCardProps) {
    return (
        <button
            type="button"
            onClick={() => onSelect(node.id)}
            className={`workflow-card w-full rounded-xl px-3 py-2.5 text-left transition duration-200 ${selected
                ? 'workflow-card-selected'
                : 'hover:border-sky-300/40 hover:bg-[linear-gradient(165deg,rgba(76,94,134,0.2),rgba(18,20,30,0.84))]'
                }`}
        >
            {/* Header: node ID + status dot */}
            <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] tracking-[0.04em] text-text-muted/80">{node.id}</span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(node.status)}`} />
            </div>
            {/* Node title - truncates at 2 lines */}
            <p className="mt-1 text-[12px] font-semibold leading-tight text-text-strong line-clamp-2">{node.title}</p>
            {/* Dependency signal counts */}
            <p className="mt-1 text-[10px] text-text-body">
                {blockedBy} blockers &bull; {blocks} dependents
            </p>
        </button>
    );
}

/**
 * Renders a section header with a count badge.
 */
function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
    return (
        <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${color}`}>{label}</span>
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-text-muted/60">{count}</span>
        </div>
    );
}

/**
 * Renders the dependency flow as three responsive sections stacked vertically:
 * Blocked By, Selected/Focus, and Blocks (Dependents).
 * Each section uses a responsive wrapping grid so cards never overflow.
 * On larger screens the three sections sit side-by-side; on smaller screens they stack.
 */
import { useState } from 'react';

// ... (FlowCardProps, DependencyFlowStripProps, statusDot, FlowCard, SectionHeader definitions remain unchanged)

/**
 * Renders the dependency flow as three responsive sections stacked vertically:
 * Blocked By, Selected/Focus, and Blocks (Dependents).
 * Each section uses a responsive wrapping grid so cards never overflow.
 * On larger screens the three sections sit side-by-side; on smaller screens they stack.
 */
export function DependencyFlowStrip({ workspace, selectedId, signalById, onSelect }: DependencyFlowStripProps) {
    const [minimized, setMinimized] = useState(false);

    // Flatten the multi-hop blocker/dependent arrays for display
    const blockerNodes = workspace.blockers.flat();
    const dependentNodes = workspace.dependents.flat();

    return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] px-5 py-4 ring-1 ring-white/5 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted/70">
                    Dependency Flow
                </h3>
                <button
                    onClick={() => setMinimized(!minimized)}
                    className="rounded p-1 hover:bg-white/5 text-text-muted transition-colors"
                    title={minimized ? "Expand" : "Minimize"}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-200 ${minimized ? 'rotate-180' : ''}`}
                    >
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                </button>
            </div>

            {/* Responsive three-column layout: stacks on mobile, side-by-side on desktop */}
            {!minimized && (
                <div className="grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Blocked By section */}
                    <div>
                        <SectionHeader label="Blocked By" count={blockerNodes.length} color="text-rose-400/70" />
                        {blockerNodes.length > 0 ? (
                            <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]">
                                {blockerNodes.map((node) => (
                                    <FlowCard
                                        key={node.id}
                                        node={node}
                                        selected={selectedId === node.id}
                                        blockedBy={signalById.get(node.id)?.blockedBy ?? 0}
                                        blocks={signalById.get(node.id)?.blocks ?? 0}
                                        onSelect={onSelect}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] px-3 py-4 text-center">
                                <p className="text-[10px] text-text-muted/40">No blockers</p>
                            </div>
                        )}
                    </div>

                    {/* Selected / Focused task section */}
                    <div>
                        <SectionHeader label="Selected" count={workspace.focus ? 1 : 0} color="text-sky-400/70" />
                        {workspace.focus ? (
                            <FlowCard
                                node={workspace.focus}
                                selected
                                blockedBy={signalById.get(workspace.focus.id)?.blockedBy ?? 0}
                                blocks={signalById.get(workspace.focus.id)?.blocks ?? 0}
                                onSelect={onSelect}
                            />
                        ) : (
                            <div className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] px-3 py-4 text-center">
                                <p className="text-[10px] text-text-muted/40">Select a task</p>
                            </div>
                        )}
                    </div>

                    {/* Blocks (Dependents) section */}
                    <div>
                        <SectionHeader label="Blocks" count={dependentNodes.length} color="text-amber-400/70" />
                        {dependentNodes.length > 0 ? (
                            <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]">
                                {dependentNodes.map((node) => (
                                    <FlowCard
                                        key={node.id}
                                        node={node}
                                        selected={selectedId === node.id}
                                        blockedBy={signalById.get(node.id)?.blockedBy ?? 0}
                                        blocks={signalById.get(node.id)?.blocks ?? 0}
                                        onSelect={onSelect}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] px-3 py-4 text-center">
                                <p className="text-[10px] text-text-muted/40">No dependents</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
