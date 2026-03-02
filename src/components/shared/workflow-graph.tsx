'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Maximize2 } from 'lucide-react';

import type { BeadIssue } from '../../lib/types';
import type { AgentArchetype } from '../../lib/types-swarm';
import { useGraphAnalysis } from '../../hooks/use-graph-analysis';
import { GraphNodeCard, type GraphNodeData } from '../graph/graph-node-card';

export interface WorkflowGraphProps {
  beads: BeadIssue[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onViewInSocial?: (id: string) => void;
  onAssignMode?: (id: string) => void;
  onViewTelemetry?: (id: string) => void;
  className?: string;
  hideClosed?: boolean;
  archetypes?: AgentArchetype[];
  assignMode?: boolean;
  swarmId?: string;
}

const NODE_WIDTH = 320;
const NODE_HEIGHT = 150;

type LayoutDirection = 'LR' | 'TB';
type LayoutDensity = 'normal' | 'compact';

function layoutDagre(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
  direction: LayoutDirection,
  density: LayoutDensity,
): Node<GraphNodeData>[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: density === 'compact' ? 70 : 120,
    nodesep: density === 'compact' ? 35 : 70,
  });

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
  onViewInSocial,
  onAssignMode,
  onViewTelemetry,
  className = '',
  hideClosed = false,
  archetypes = [],
  assignMode = false,
}: WorkflowGraphProps) {
  const { fitView } = useReactFlow();
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('LR');
  const [layoutDensity, setLayoutDensity] = useState<LayoutDensity>('normal');

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

    const sourcePosition = layoutDirection === 'TB' ? Position.Bottom : Position.Right;
    const targetPosition = layoutDirection === 'TB' ? Position.Top : Position.Left;

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
          onViewInSocial: onViewInSocial,
          onAssignMode: onAssignMode,
          onViewTelemetry: onViewTelemetry,
        },
        position: { x: 0, y: 0 },
        sourcePosition,
        targetPosition,
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
      nodes: layoutDagre(baseNodes, graphEdges, layoutDirection, layoutDensity),
      edges: graphEdges,
    };
  }, [beads, hideClosed, selectedId, signalById, actionableNodeIds, cycleNodeIdSet, chainNodeIds, blockerTooltipMap, archetypes, assignMode, onSelect, onViewInSocial, onAssignMode, onViewTelemetry, layoutDirection, layoutDensity]);

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
  }, [fitView, flowModel.nodes.length, layoutDirection, layoutDensity]);

  const handleFitToScreen = useCallback(() => {
    fitView({ padding: 0.24, duration: 240 });
  }, [fitView]);

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
      <div className="absolute right-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] p-1">
          <button
            type="button"
            onClick={() => setLayoutDirection('LR')}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
              layoutDirection === 'LR'
                ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Horizontal
          </button>
          <button
            type="button"
            onClick={() => setLayoutDirection('TB')}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
              layoutDirection === 'TB'
                ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Vertical
          </button>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] p-1">
          <button
            type="button"
            onClick={() => setLayoutDensity('compact')}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
              layoutDensity === 'compact'
                ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Compact
          </button>
          <button
            type="button"
            onClick={() => setLayoutDensity('normal')}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
              layoutDensity === 'normal'
                ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Normal
          </button>
        </div>
        <button
          type="button"
          onClick={handleFitToScreen}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          aria-label="Fit graph to screen"
          title="Fit graph to screen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Fit
        </button>
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

