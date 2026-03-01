'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import type { BeadIssue } from '../../lib/types';
import type { AgentArchetype } from '../../lib/types-swarm';
import { useGraphAnalysis } from '../../hooks/use-graph-analysis';
import { GraphNodeCard, type GraphNodeData } from '../graph/graph-node-card';

export interface WorkflowGraphProps {
  beads: BeadIssue[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
  hideClosed?: boolean;
  archetypes?: AgentArchetype[];
  assignMode?: boolean;
}

const NODE_WIDTH = 320;
const NODE_HEIGHT = 150;

function layoutDagre(nodes: Node<GraphNodeData>[], edges: Edge[]): Node<GraphNodeData>[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR' });

  for (const node of nodes) {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });
}

function WorkflowGraphInner({
  beads,
  selectedId,
  onSelect,
  className = '',
  hideClosed = false,
  archetypes = [],
  assignMode = false,
}: WorkflowGraphProps) {
  const { fitView } = useReactFlow();

  // Use the extracted hook for all graph analysis
  const {
    signalById,
    cycleNodeIdSet,
    actionableNodeIds,
    blockerTooltipMap,
    blockerAnalysis,
    chainNodeIds,
  } = useGraphAnalysis(beads, 'workflow', selectedId);

  const flowModel = useMemo(() => {
    const visibleBeads = beads.filter((issue) => (!hideClosed ? true : issue.status !== 'closed'));

    if (visibleBeads.length === 0) {
      return { nodes: [] as Node<GraphNodeData>[], edges: [] as Edge[] };
    }

    const baseNodes: Node<GraphNodeData>[] = visibleBeads.map((issue) => {
      let matchedArchetype: AgentArchetype | undefined;
      if (archetypes && issue.assignee) {
        const assigneeStr = issue.assignee.toLowerCase();
        matchedArchetype = archetypes.find(a =>
          assigneeStr.includes(a.id.toLowerCase()) ||
          assigneeStr.includes(a.name.toLowerCase())
        );
      }

      return {
        id: issue.id,
        data: {
          title: issue.title,
          kind: 'issue' as const,
          status: issue.status,
          priority: issue.priority,
          blockedBy: signalById.get(issue.id)?.blockedBy ?? 0,
          blocks: signalById.get(issue.id)?.blocks ?? 0,
          isActionable: actionableNodeIds.has(issue.id),
          isCycleNode: cycleNodeIdSet.has(issue.id),
          isDimmed: selectedId ? !chainNodeIds.has(issue.id) : false,
          blockerTooltipLines: blockerTooltipMap.get(issue.id) ?? [],
          assignee: issue.assignee,
          archetype: matchedArchetype,
          isAssignMode: assignMode,
          labels: issue.labels,
          archetypes: archetypes,
          selectedTaskId: selectedId,
          onConversationOpen: onSelect,
        },
        position: { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        type: 'flowNode',
      };
    });

    const visibleIds = new Set(baseNodes.map((node) => node.id));
    const graphEdges: Edge[] = [];

    for (const issue of beads) {
      for (const dep of issue.dependencies) {
        if (!visibleIds.has(issue.id) && !visibleIds.has(dep.target)) continue;
        if (!visibleIds.has(issue.id) || !visibleIds.has(dep.target)) continue;
        if (dep.type !== 'blocks') continue;
        if (issue.id === dep.target) continue;

        const edgeId = `${dep.target}:blocks:${issue.id}`;
        const linkedToSelection = selectedId ? issue.id === selectedId || dep.target === selectedId : false;
        const sourceIssue = beads.find((i) => i.id === dep.target);
        const isInProgressEdge = issue.status === 'in_progress' || sourceIssue?.status === 'in_progress';

        graphEdges.push({
          id: edgeId,
          source: dep.target,
          target: issue.id,
          className: linkedToSelection ? 'workflow-edge-selected' : 'workflow-edge-muted',
          animated: linkedToSelection || isInProgressEdge,
          label: 'BLOCKS',
          labelStyle: {
            fill: linkedToSelection ? '#e2e8f0' : '#cbd5e1',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
          },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 999,
          labelBgStyle: {
            fill: 'rgba(2, 6, 23, 0.92)',
            stroke: linkedToSelection ? 'rgba(125, 211, 252, 0.35)' : 'rgba(251, 191, 36, 0.25)',
            strokeWidth: 1,
          },
          style: {
            stroke: linkedToSelection ? '#7dd3fc' : '#fbbf24',
            strokeWidth: linkedToSelection ? 2.8 : 2.1,
            opacity: linkedToSelection ? 1 : 0.78,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: linkedToSelection ? '#7dd3fc' : '#fbbf24',
            width: 14,
            height: 14,
          },
        });
      }
    }

    return {
      nodes: layoutDagre(baseNodes, graphEdges),
      edges: graphEdges,
    };
  }, [beads, hideClosed, selectedId, signalById, actionableNodeIds, cycleNodeIdSet, chainNodeIds, blockerTooltipMap, archetypes, assignMode, onSelect]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      flowNode: GraphNodeCard as NodeTypes['flowNode'],
    }),
    [],
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      zIndex: 40,
      interactionWidth: 24,
    }),
    [],
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelect?.(node.id);
    },
    [onSelect],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      fitView({ padding: 0.3, duration: 200 });
    }, 50);
    return () => clearTimeout(timeout);
  }, [fitView, flowModel.nodes.length]);

  return (
    <div className={`relative h-full min-h-[24rem] overflow-hidden rounded-2xl border border-white/5 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.4),rgba(5,8,15,0.8))] shadow-inner ${className}`}>
      <div className="workflow-graph-legend absolute left-3 top-3 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 backdrop-blur-sm">
        <p className="text-[10px] text-text-muted/60">
          <span className="font-bold uppercase tracking-[0.15em]">Legend</span>{' '}
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
        {blockerAnalysis ? (
          <p className="text-[10px] text-text-muted/60">
            Open blockers: {blockerAnalysis.openBlockerCount}
          </p>
        ) : null}
      </div>
      <ReactFlow
        className="workflow-graph-flow"
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        // translateExtent removed for unlimited panning
        nodes={flowModel.nodes}
        edges={flowModel.edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onlyRenderVisibleElements
        onNodeClick={handleNodeClick}
      >
        <Background gap={32} size={1} color="rgba(255,255,255,0.03)" />
      </ReactFlow>
    </div>
    );
}

export function WorkflowGraph(props: WorkflowGraphProps) {
  return (
    <ReactFlowProvider>
      <WorkflowGraphInner {...props} />
    </ReactFlowProvider>
  );
}

