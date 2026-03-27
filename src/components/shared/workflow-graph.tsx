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
import type { AgentState } from '../../lib/agent';
import { buildWorkflowEdges } from '../../lib/epic-graph';
import { useGraphAnalysis } from '../../hooks/use-graph-analysis';
import { identifyTransitiveEdges } from '../../lib/graph-view';
import { selectTaskAssignedAgentStates } from '../../lib/agent/ownership';
import { GraphNodeCard, type GraphNodeData } from '../graph/graph-node-card';
import { OffsetEdge } from '../graph/offset-edge';

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
  agentStates?: readonly AgentState[];
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
  agentStates = [],
  assignMode = false,
}: WorkflowGraphProps) {
  const { fitView } = useReactFlow();
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('LR');
  const [layoutDensity, setLayoutDensity] = useState<LayoutDensity>('normal');
  const [showHierarchy, setShowHierarchy] = useState(true);

  // Use the extracted hook for all graph analysis
  const {
    graphModel,
    signalById,
    cycleNodeIdSet,
    actionableNodeIds,
    blockerTooltipMap,
    blockerAnalysis,
    chainNodeIds,
  } = useGraphAnalysis(beads, 'workflow', selectedId);

  const transitiveEdges = useMemo(() => identifyTransitiveEdges(graphModel), [graphModel]);
  const assignedAgentStatesById = useMemo(() => {
    const map = new Map<string, AgentState[]>();
    for (const issue of beads) {
      map.set(
        issue.id,
        selectTaskAssignedAgentStates(agentStates, issue.id, issue.agentInstanceId ?? null),
      );
    }
    return map;
  }, [agentStates, beads]);

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
          assignedAgentStates: assignedAgentStatesById.get(issue.id) ?? [],
        },
        position: { x: 0, y: 0 },
        sourcePosition,
        targetPosition,
        type: 'flowNode',
      };
    });

    const visibleIds = new Set(baseNodes.map((node) => node.id));
    const edgeDescriptors = buildWorkflowEdges({
      issues: beads,
      visibleIds,
      selectedId: selectedId ?? null,
      includeHierarchy: showHierarchy,
    });

    const graphEdges: Edge[] = edgeDescriptors.map((edge) => {
      const isSubtask = edge.kind === 'subtask';
      const label = isSubtask ? 'SUBTASK' : 'BLOCKS';
      const isTransitive = transitiveEdges.has(`${edge.source}:blocks:${edge.target}`);

      let stroke = '#64748b'; // default slate for subtasks / generic
      let strokeBg = 'rgba(100, 116, 139, 0.3)';
      let dashArray: string | undefined = undefined;
      let opacity = 0.78;

      const isFocusedPath = edge.isUpstreamOfFocus || edge.isDownstreamOfFocus || edge.isDirectlyFocused;
      const isAnimated = isFocusedPath || edge.sourceStatus === 'in_progress';

      if (isSubtask) {
        stroke = isFocusedPath ? '#94a3b8' : '#64748b';
        strokeBg = isFocusedPath ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.3)';
        dashArray = '6 4';
        opacity = isFocusedPath ? 1 : (edge.isUnrelated ? 0.15 : 0.58);
      } else {
        // Evaluate Base Status
        if (edge.sourceStatus === 'in_progress') {
          stroke = '#fbbf24'; // Bright Amber
          strokeBg = 'rgba(251, 191, 36, 0.25)';
        } else if (edge.sourceStatus === 'blocked') {
          stroke = '#f43f5e'; // Rose/Red for deep block
          strokeBg = 'rgba(244, 63, 94, 0.25)';
        } else {
          stroke = '#3b82f6'; // Blue
          strokeBg = 'rgba(59, 130, 246, 0.25)';
        }

        // Overrides for Selection
        if (selectedId) {
          if (edge.isUnrelated) {
            stroke = '#1e293b'; // Super dim
            strokeBg = 'transparent';
            opacity = 0.15;
          } else if (edge.isUpstreamOfFocus || (edge.isDirectlyFocused && edge.target === selectedId)) {
            stroke = '#f59e0b'; // Amber for upstream blockers
            strokeBg = 'rgba(245, 158, 11, 0.35)';
            opacity = 1;
          } else if (edge.isDownstreamOfFocus || (edge.isDirectlyFocused && edge.source === selectedId)) {
            stroke = '#0ea5e9'; // Cyan for downstream impact
            strokeBg = 'rgba(14, 165, 233, 0.35)';
            opacity = 1;
          }
        }

        // Transitive styling
        if (isTransitive) {
          dashArray = '4 4';
          if (!selectedId || edge.isUnrelated) {
            stroke = '#334155';
            strokeBg = 'rgba(51, 65, 85, 0.3)';
            opacity = 0.4;
          } else {
            opacity = 0.6; // Keep the focused color but make it dashed & slightly transparent
          }
        }
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        className: isFocusedPath ? 'workflow-edge-selected' : 'workflow-edge-muted',
        animated: isAnimated,
        label,
        labelStyle: {
          fill: isFocusedPath ? '#e2e8f0' : '#cbd5e1',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
        },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 999,
        labelBgStyle: {
          fill: 'rgba(2, 6, 23, 0.92)',
          stroke: strokeBg,
          strokeWidth: 1,
        },
        style: {
          stroke,
          strokeWidth: isFocusedPath ? 2.8 : 2.1,
          opacity,
          strokeDasharray: dashArray,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: stroke,
          width: 14,
          height: 14,
        },
      };
    });

    // --- Apply Offsets to Edge Data ---
    const edgeGroups = new Map<string, Edge[]>();

    for (const edge of graphEdges) {
      const key = [edge.source, edge.target].sort().join('-');
      if (!edgeGroups.has(key)) edgeGroups.set(key, []);
      edgeGroups.get(key)!.push(edge);
    }

    for (const [unused_, groupEdges] of edgeGroups) {
      if (groupEdges.length <= 1) continue;
      // In Vertical layout, we might want X offset, in Horizontal Y offset.
      // OffsetEdge component already handles adjusting the correct axis based on sourcePosition.
      const step = 8;
      const totalSpread = (groupEdges.length - 1) * step;
      let currentOffset = -(totalSpread / 2);
      for (const edge of groupEdges) {
        edge.data = { ...edge.data, offset: currentOffset };
        currentOffset += step;
      }
    }

    return {
      nodes: layoutDagre(baseNodes, graphEdges, layoutDirection, layoutDensity),
      edges: graphEdges,
    };
  }, [transitiveEdges, beads, hideClosed, selectedId, signalById, actionableNodeIds, cycleNodeIdSet, chainNodeIds, blockerTooltipMap, archetypes, assignedAgentStatesById, assignMode, onSelect, onViewInSocial, onAssignMode, onViewTelemetry, layoutDirection, layoutDensity, showHierarchy]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      flowNode: GraphNodeCard as NodeTypes['flowNode'],
    }),
    [],
  );

  const edgeTypes = useMemo(
    () => ({
      offset: OffsetEdge,
    }),
    []
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'offset' as const,
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
            onClick={() => setShowHierarchy((current) => !current)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${showHierarchy
              ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            title="Show parent/subtask links"
          >
            Hierarchy
          </button>
          <button
            type="button"
            onClick={() => setLayoutDirection('LR')}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${layoutDirection === 'LR'
              ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            Horizontal
          </button>
          <button
            type="button"
            onClick={() => setLayoutDirection('TB')}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${layoutDirection === 'TB'
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
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${layoutDensity === 'compact'
              ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            Compact
          </button>
          <button
            type="button"
            onClick={() => setLayoutDensity('normal')}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${layoutDensity === 'normal'
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
        edgeTypes={edgeTypes}
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

