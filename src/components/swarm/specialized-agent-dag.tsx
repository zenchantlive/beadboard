import React, { useEffect, useMemo } from 'react';
import {
    Background,
    MarkerType,
    Position,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
    Handle,
    type Edge,
    type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import type { BeadIssue } from '../../lib/types';
import type { AgentArchetype } from '../../lib/types-swarm';

// Custom Node for the Agent DAG
interface AgentNodeData extends Record<string, unknown> {
    title: string;
    status: string;
    assignee: string | null;
    archetype?: AgentArchetype;
    isSelected?: boolean;
}

function AgentNodeCard({ data }: { data: AgentNodeData }) {
    const isDone = data.status === 'closed';
    const isInProgress = data.status === 'in_progress';
    const isBlocked = data.status === 'blocked';

    const statusColor = isDone ? 'text-emerald-400' : isBlocked ? 'text-rose-400' : isInProgress ? 'text-amber-400' : 'text-slate-400';
    let borderColor = isDone ? 'border-emerald-500/30' : isBlocked ? 'border-rose-500/30' : isInProgress ? 'border-amber-500/30' : 'border-slate-500/30';

    let containerClasses = `w-[260px] rounded-xl border bg-[#0a111a] p-3 shadow-xl transition-all duration-500 ${borderColor}`;
    if (isInProgress) {
        containerClasses += ' shadow-[0_0_20px_rgba(251,191,36,0.15)] ring-1 ring-amber-500/30';
    }
    if (data.isSelected) {
        containerClasses = `w-[260px] rounded-xl border bg-[#0a111a] p-3 shadow-[0_0_25px_rgba(56,189,248,0.2)] transition-all duration-300 border-[var(--ui-accent-info)] ring-2 ring-[var(--ui-accent-info)]/50`;
    }

    const bgStr = data.archetype ? `${data.archetype.color}15` : '#ffffff05';
    const colorStr = data.archetype ? data.archetype.color : '#888';

    return (
        <div className={containerClasses}>
            <div className="flex items-start gap-3">
                <div
                    className={`h-10 w-10 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-lg border relative ${isInProgress ? 'animate-pulse duration-1000' : ''}`}
                    style={{ backgroundColor: bgStr, color: colorStr, borderColor: `${colorStr}40` }}
                >
                    {data.assignee ? data.assignee.charAt(0).toUpperCase() : '?'}
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0a111a] bg-current ${statusColor} ${isInProgress ? 'animate-ping' : ''}`} style={{ animationDuration: '2s' }} />
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0a111a] bg-current ${statusColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-[var(--ui-text-muted)] uppercase tracking-wider mb-0.5 truncate flex items-center justify-between">
                        <span>{data.assignee || 'Unassigned'}</span>
                        {isInProgress && <span className="text-amber-500 animate-pulse text-[8px] tracking-widest">WORKING...</span>}
                    </div>
                    <div className="text-sm font-semibold text-[var(--ui-text-primary)] leading-tight line-clamp-2">
                        {data.title}
                    </div>
                    {data.archetype && (
                        <div className="text-[9px] text-[var(--ui-text-muted)] mt-1 truncate">
                            {data.archetype.name}
                        </div>
                    )}
                </div>
            </div>

            {/* React Flow handles */}
            <Handle type="target" position={Position.Left} className="w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-600 !left-[-8px] opacity-0" />
            <Handle type="source" position={Position.Right} className="w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-600 !right-[-8px] opacity-0" />
        </div>
    );
}

const nodeTypes = {
    agentNode: AgentNodeCard,
};

const layoutDagre = (nodes: Node<AgentNodeData>[], edges: Edge[]): Node<AgentNodeData>[] => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 60 });

    for (const node of nodes) {
        dagreGraph.setNode(node.id, { width: 260, height: 110 });
    }

    for (const edge of edges) {
        dagreGraph.setEdge(edge.source, edge.target);
    }

    dagre.layout(dagreGraph);

    return nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const newNode = { ...node };
        if (nodeWithPosition) {
            newNode.targetPosition = Position.Left;
            newNode.sourcePosition = Position.Right;
            newNode.position = {
                x: nodeWithPosition.x - 260 / 2,
                y: nodeWithPosition.y - 110 / 2,
            };
        }
        return newNode;
    });
};

function SpecializedAgentDagInner({ beads, archetypes, selectedId, onSelect }: { beads: BeadIssue[], archetypes: AgentArchetype[], selectedId?: string | null, onSelect?: (id: string) => void }) {
    const { fitView } = useReactFlow();

    const handleNodeClick = React.useCallback(
        (_: React.MouseEvent, node: Node) => {
            onSelect?.(node.id);
        },
        [onSelect],
    );

    const flowModel = useMemo(() => {
        // Find visible beads (hide tombstone)
        const visibleBeads = beads.filter(b => b.status !== 'tombstone');

        const baseNodes: Node<AgentNodeData>[] = visibleBeads.map((issue) => {
            const assigneeStr = issue.assignee?.toLowerCase() || '';
            const matchedArchetype = archetypes.find(a =>
                assigneeStr.includes(a.id.toLowerCase()) ||
                assigneeStr.includes(a.name.toLowerCase())
            );

            return {
                id: issue.id,
                type: 'agentNode',
                data: {
                    title: issue.title,
                    status: issue.status,
                    assignee: issue.assignee,
                    archetype: matchedArchetype,
                    isSelected: issue.id === selectedId
                },
                position: { x: 0, y: 0 },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            };
        });

        const graphEdges: Edge[] = [];
        const beadIds = new Set(visibleBeads.map(b => b.id));

        visibleBeads.forEach(issue => {
            issue.dependencies.forEach(dep => {
                if (dep.type === 'blocks' && beadIds.has(dep.target)) {
                    // issue depends on dep.target (issue is blocked by dep.target)
                    // Edge should flow from blocker to blocked
                    graphEdges.push({
                        id: `e-${dep.target}-${issue.id}`,
                        source: dep.target,
                        target: issue.id,
                        type: 'smoothstep',
                        animated: issue.status === 'in_progress' || issue.status === 'closed',
                        style: { stroke: '#475569', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' }
                    });
                }
            });
        });

        console.log('SpecializedAgentDag generated nodes:', baseNodes.length, 'edges:', graphEdges.length);

        return {
            nodes: layoutDagre(baseNodes, graphEdges),
            edges: graphEdges,
        };
    }, [beads, archetypes, selectedId]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fitView({ padding: 0.3, duration: 300 });
        }, 100);
        return () => clearTimeout(timeout);
    }, [fitView, flowModel.nodes.length]);

    return (
        <ReactFlow
            nodes={flowModel.nodes}
            edges={flowModel.edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            onNodeClick={handleNodeClick}
            fitView
        >
            <Background gap={24} size={1} color="rgba(255,255,255,0.02)" />
        </ReactFlow>
    );
}

export function SpecializedAgentDag(props: { beads: BeadIssue[], archetypes: AgentArchetype[], selectedId?: string | null, onSelect?: (id: string) => void }) {
    return (
        <ReactFlowProvider>
            <SpecializedAgentDagInner {...props} />
        </ReactFlowProvider>
    );
}
