'use client';

import {
    Background,
    ReactFlow,
    type Edge,
    type Node,
    type NodeMouseHandler,
    type NodeTypes,
} from '@xyflow/react';

import type { BlockedChainAnalysis } from '../../lib/graph-view';
import type { GraphNodeData } from './graph-node-card';

/** Props for the GraphSection component. */
interface GraphSectionProps {
    /** ReactFlow nodes with layout positions applied. */
    nodes: Node<GraphNodeData>[];
    /** ReactFlow edges connecting the nodes. */
    edges: Edge[];
    /** Map of custom node type names to their React components. */
    nodeTypes: NodeTypes;
    /** Default edge rendering options. */
    defaultEdgeOptions: {
        type: 'smoothstep';
        zIndex: number;
        interactionWidth: number;
    };
    /** Callback fired when a node is clicked in the graph. */
    onNodeClick: NodeMouseHandler;
    /** Optional blocker summary for the currently selected task. */
    blockerAnalysis?: BlockedChainAnalysis | null;
    /** Whether closed items are hidden from the graph workspace. */
    hideClosed?: boolean;
}

/**
 * Renders the ReactFlow graph with status-lane layout.
 * Shows a compact legend and full graph viewport.
 * Nodes are positioned in columns by status: Done | In Progress | Ready | Blocked.
 */
export function GraphSection({
    nodes,
    edges,
    nodeTypes,
    defaultEdgeOptions,
    onNodeClick,
    blockerAnalysis,
    hideClosed = false,
}: GraphSectionProps) {
    return (
        <div className="flex flex-col gap-3">
            {/* Compact legend + tip */}
            <div className="workflow-graph-legend flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] text-text-muted/60">
                    <span className="font-bold uppercase tracking-[0.15em]">Legend</span>
                    {' '}
                    {!hideClosed ? (
                        <>
                            <span className="text-emerald-400">Done</span>
                            {' \u2192 '}
                        </>
                    ) : null}
                    <span className="text-amber-400">In Progress</span>
                    {' \u2192 '}
                    <span className="text-cyan-400">Ready</span>
                    {' \u2192 '}
                    <span className="text-rose-400">Blocked</span>
                </p>
                <p className="text-[10px] text-text-muted/40">
                    Click a task to see details &bull;{' '}
                    <span className="inline-block h-1 w-4 rounded bg-amber-400 align-middle" /> = blocks
                </p>
                {blockerAnalysis ? (
                    <p className="text-[10px] text-text-muted/60">
                        Open blockers: {blockerAnalysis.openBlockerCount}
                        {' | '}
                        In progress blockers: {blockerAnalysis.inProgressBlockerCount}
                    </p>
                ) : null}
                <p className="w-full text-[10px] text-text-muted/55 md:w-auto md:max-w-[26rem]">
                    <span className="font-semibold text-text-muted/75">Read left to right:</span>{' '}
                    Left = blockers, middle = selected task, Right = work this task unblocks.
                </p>
            </div>

            {/* ReactFlow graph viewport */}
            <div className="relative h-[60vh] min-h-[35rem] overflow-hidden rounded-2xl border border-white/5 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.4),rgba(5,8,15,0.8))] shadow-inner">
                <ReactFlow
                    className="workflow-graph-flow"
                    defaultEdgeOptions={defaultEdgeOptions}
                    proOptions={{ hideAttribution: true }}
                    fitView
                    fitViewOptions={{ padding: 0.3 }}
                    minZoom={0.3}
                    maxZoom={1.5}
                    translateExtent={[
                        [-500, -500],
                        [3000, 2500],
                    ]}
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable
                    onlyRenderVisibleElements
                    onNodeClick={onNodeClick}
                >
                    <Background gap={32} size={1} color="rgba(255,255,255,0.03)" />
                </ReactFlow>
            </div>
        </div>
    );
}
