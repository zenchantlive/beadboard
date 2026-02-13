'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MarkerType,
  Position,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import { EpicChipStrip } from './epic-chip-strip';
import { WorkflowTabs, type WorkflowTab } from './workflow-tabs';
import { TaskCardGrid, type BlockerDetail } from './task-card-grid';
import { TaskDetailsDrawer } from './task-details-drawer';
import { DependencyFlowStrip } from './dependency-flow-strip';
import { GraphNodeCard, type GraphNodeData } from './graph-node-card';
import { GraphSection } from './graph-section';
import { ProjectScopeControls } from '../shared/project-scope-controls';

import { buildGraphModel, type GraphNode } from '../../lib/graph';
import {
  buildPathWorkspace,
  type GraphHopDepth,
  analyzeBlockedChain,
  detectDependencyCycles,
} from '../../lib/graph-view';
import { buildBlockedByTree, type BlockedTreeNode } from '../../lib/kanban';
import { type BeadIssue } from '../../lib/types';
import type { ProjectScopeOption } from '../../lib/project-scope';

/** Props for the DependencyGraphPage component. */
interface DependencyGraphPageProps {
  /** All issues in the project. */
  issues: BeadIssue[];
  /** The project root key for graph model construction. */
  projectRoot: string;
  /** URL scope key (local or registry key). */
  projectScopeKey: string;
  /** Available scope options for context rendering. */
  projectScopeOptions: ProjectScopeOption[];
  /** Scope mode selection from URL (single/aggregate). */
  projectScopeMode: 'single' | 'aggregate';
}

/** Available hop depth values for the depth selector. */
const DEPTH_OPTIONS: GraphHopDepth[] = [1, 2, 'full'];


/**
 * Positions nodes using the Dagre graph layout engine.
 * This respects dependency direction (Left-to-Right) and creates a true flowchart.
 */
function layoutDagre(nodes: Node<GraphNodeData>[], edges: Edge[]): Node<GraphNodeData>[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set layout direction: 'LR' = Left-to-Right (Blocker -> Blocked)
  dagreGraph.setGraph({ rankdir: 'LR' });

  // Node dimensions (must match Card dimensions + some padding?)
  // Card is ~280x120?
  // We can be precise or approximate.
  const nodeWidth = 320;
  const nodeHeight = 150;

  for (const node of nodes) {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }

  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  dagre.layout(dagreGraph);

  // Apply positions back to nodes
  // Dagre gives center coordinates (x, y). ReactFlow expects top-left?
  // ReactFlow handles position as top-left by default.
  // Wait, Dagre node `x,y` is the CENTER of the node?
  // Let's check docs or common knowledge. Yes, Dagre usually returns center.
  // ReactFlow nodes position is Top-Left.
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });
}

/**
 * Main Workflow Explorer page component.
 * Provides a tabbed interface for browsing tasks and visualizing dependencies.
 *
 * Layout structure:
 * - Header: title + navigation
 * - Toolbar: hop depth, filters, epic chips, tab switcher
 * - Tasks tab: responsive card grid + details drawer
 * - Dependencies tab: flow strip + ReactFlow graph
 */
export function DependencyGraphPage({
  issues,
  projectRoot,
  projectScopeKey,
  projectScopeOptions,
  projectScopeMode,
}: DependencyGraphPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // --- State ---
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [depth, setDepth] = useState<GraphHopDepth>(2);
  const [hideClosed, setHideClosed] = useState(false);
  const [showBlockingOnly, setShowBlockingOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkflowTab>('tasks');
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Task-specific: sort ready (actionable) tasks to the top
  const [sortReadyFirst, setSortReadyFirst] = useState(true);
  // Mobile panel toggle (preserved for mobile responsiveness)
  const [mobilePanel, setMobilePanel] = useState<'overview' | 'flow'>('overview');
  const requestedEpicId = searchParams.get('epic');
  const requestedTaskId = searchParams.get('task');
  const requestedTab = searchParams.get('tab');
  const kanbanHref = useMemo(() => {
    const params = new URLSearchParams();
    if (projectScopeMode !== 'single') {
      params.set('mode', projectScopeMode);
    }
    if (projectScopeKey !== 'local') {
      params.set('project', projectScopeKey);
    }
    const query = params.toString();
    return query ? `/?${query}` : '/';
  }, [projectScopeKey, projectScopeMode]);
  const activeScope = useMemo(
    () => projectScopeOptions.find((option) => option.key === projectScopeKey) ?? projectScopeOptions[0] ?? null,
    [projectScopeKey, projectScopeOptions],
  );

  // --- Derived data: epics ---
  const epics = useMemo(
    () =>
      issues
        .filter((issue) => issue.issue_type === 'epic')
        .sort((a, b) => {
          // Push closed epics to the end
          if (a.status === 'closed' && b.status !== 'closed') return 1;
          if (b.status === 'closed' && a.status !== 'closed') return -1;
          return a.id.localeCompare(b.id);
        }),
    [issues],
  );

  // --- Derived data: tasks grouped by parent epic ---
  const tasksByEpic = useMemo(() => {
    const map = new Map<string, BeadIssue[]>();
    // Initialize empty arrays for each epic
    for (const epic of epics) {
      map.set(epic.id, []);
    }

    // Assign each non-epic issue to its parent epic
    for (const issue of issues) {
      if (issue.issue_type === 'epic') continue;
      const parentDep = issue.dependencies.find((dep) => dep.type === 'parent');
      const candidateEpicId = parentDep?.target ?? (issue.id.includes('.') ? issue.id.split('.')[0] : null);
      if (candidateEpicId && map.has(candidateEpicId)) {
        map.get(candidateEpicId)?.push(issue);
      }
    }

    // Sort tasks within each epic: filter by closed status, then by priority
    for (const [epicId, children] of map.entries()) {
      map.set(
        epicId,
        children
          .filter((x) => (!hideClosed ? true : x.status !== 'closed'))
          .sort((a, b) => {
            const priorityDiff = a.priority - b.priority;
            if (priorityDiff !== 0) return priorityDiff;
            return a.id.localeCompare(b.id);
          }),
      );
    }
    return map;
  }, [epics, hideClosed, issues]);

  const beadCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const epic of epics) {
      counts.set(epic.id, tasksByEpic.get(epic.id)?.length ?? 0);
    }
    return counts;
  }, [epics, tasksByEpic]);

  // --- Derived: Map task ID to its Epic (for easy lookup) ---
  const epicByTaskId = useMemo(() => {
    const map = new Map<string, BeadIssue>();
    // Iterate tasksByEpic map
    for (const [epicId, tasks] of tasksByEpic.entries()) {
      const epic = epics.find((e) => e.id === epicId);
      if (!epic) continue;
      for (const t of tasks) {
        map.set(t.id, epic);
      }
    }
    return map;
  }, [epics, tasksByEpic]);

  // --- Auto-select first epic if none selected ---
  useEffect(() => {
    if (epics.length === 0) {
      if (selectedEpicId !== null) {
        setSelectedEpicId(null);
      }
      return;
    }

    const hasSelectedEpic = selectedEpicId ? epics.some((epic) => epic.id === selectedEpicId) : false;
    if (!hasSelectedEpic) {
      setSelectedEpicId(epics[0].id);
    }
  }, [epics, selectedEpicId]);

  useEffect(() => {
    if (requestedTab === 'tasks' || requestedTab === 'dependencies') {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (!requestedEpicId) return;
    if (!epics.some((epic) => epic.id === requestedEpicId)) return;
    setSelectedEpicId(requestedEpicId);
  }, [epics, requestedEpicId]);

  useEffect(() => {
    if (!requestedTaskId) {
      return;
    }
    if (!issues.some((issue) => issue.id === requestedTaskId)) {
      return;
    }
    setSelectedId(requestedTaskId);
  }, [issues, requestedTaskId]);

  // If project scope changes and the selected task no longer exists, reset selection.
  useEffect(() => {
    if (!selectedId) {
      return;
    }
    if (!issues.some((issue) => issue.id === selectedId)) {
      setSelectedId(null);
    }
  }, [issues, selectedId]);

  // --- Derived: selected epic and its tasks ---
  const selectedEpic = useMemo(() => epics.find((epic) => epic.id === selectedEpicId) ?? null, [epics, selectedEpicId]);
  const projectLevelTasks = useMemo(
    () =>
      issues
        .filter((issue) => issue.issue_type !== 'epic')
        .filter((issue) => (!hideClosed ? true : issue.status !== 'closed'))
        .sort((a, b) => {
          const priorityDiff = a.priority - b.priority;
          if (priorityDiff !== 0) {
            return priorityDiff;
          }
          return a.id.localeCompare(b.id);
        }),
    [hideClosed, issues],
  );

  const selectedEpicTasks = useMemo(() => {
    const epicChildren = selectedEpic ? tasksByEpic.get(selectedEpic.id) ?? [] : [];
    if (epicChildren.length > 0) {
      return epicChildren;
    }

    // Fallback: some projects have tasks but weak/missing parent links.
    // Keep the page usable by showing project-level tasks instead of a blank view.
    if (projectLevelTasks.length > 0) {
      return projectLevelTasks;
    }

    // Last-resort fallback: if there are only epics, render epics as selectable items.
    return epics.filter((epic) => (!hideClosed ? true : epic.status !== 'closed'));
  }, [epics, hideClosed, projectLevelTasks, selectedEpic, tasksByEpic]);

  const selectedEpicHasChildren = useMemo(() => {
    if (selectedEpic) {
      return (tasksByEpic.get(selectedEpic.id) ?? []).length > 0;
    }
    return false;
  }, [selectedEpic, tasksByEpic]);

  // --- Auto-select best task when epic changes ---
  useEffect(() => {
    // Keep current selection if it remains visible in the current scope.
    if (selectedId && selectedEpicTasks.some((task) => task.id === selectedId)) {
      return;
    }
    const best = selectedEpicTasks.find((task) => task.status !== 'closed') ?? selectedEpicTasks[0] ?? null;
    if (best?.id !== selectedId) {
      setSelectedId(best?.id ?? null);
    }
  }, [selectedEpic, selectedEpicTasks, selectedId]);

  // --- Graph model ---
  const graphModel = useMemo(() => buildGraphModel(issues, { projectKey: projectRoot }), [issues, projectRoot]);

  // --- Signal map: blocker/blocks counts per issue ---
  const signalById = useMemo(() => {
    const map = new Map<string, { blockedBy: number; blocks: number }>();
    for (const issue of issues) {
      const adjacency = graphModel.adjacency[issue.id];
      map.set(issue.id, {
        blockedBy: adjacency?.incoming.length ?? 0,
        blocks: adjacency?.outgoing.length ?? 0,
      });
    }
    return map;
  }, [graphModel.adjacency, issues]);



  // --- Blocker chain analysis for selected node ---
  const blockerAnalysis = useMemo(() => {
    if (!selectedId) return null;
    return analyzeBlockedChain(graphModel, { focusId: selectedId });
  }, [graphModel, selectedId]);

  // --- Cycle detection across the entire graph ---
  const cycleAnalysis = useMemo(() => {
    return detectDependencyCycles(graphModel);
  }, [graphModel]);
  const cycleNodeIdSet = useMemo(() => new Set(cycleAnalysis.cycleNodeIds), [cycleAnalysis]);

  // --- Path workspace: blockers and dependents for the selected node ---
  const workspace = useMemo(
    () =>
      buildPathWorkspace(graphModel, {
        focusId: selectedId,
        depth,
        hideClosed,
      }),
    [depth, graphModel, hideClosed, selectedId],
  );

  // --- Currently selected issue object ---
  const selectedIssue = useMemo(() => issues.find((issue) => issue.id === selectedId) ?? null, [issues, selectedId]);

  // --- Compute which node IDs are in the selected dependency chain (for dimming) ---
  const chainNodeIds = useMemo(() => {
    if (!selectedId || !blockerAnalysis) return new Set<string>();
    const ids = new Set<string>([selectedId, ...blockerAnalysis.blockerNodeIds]);
    // Also include dependents
    for (const node of workspace.dependents.flat()) {
      ids.add(node.id);
    }
    return ids;
  }, [selectedId, blockerAnalysis, workspace.dependents]);

  // --- Compute actionable (unblocked) status for each node ---
  const actionableNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const issue of issues) {
      if (issue.status === 'closed') continue;
      const adjacency = graphModel.adjacency[issue.id];
      if (!adjacency) continue;
      // A node is actionable if none of its incoming "blocks" edges come from non-closed nodes
      const hasOpenBlocker = adjacency.incoming.some((edge) => {
        if (edge.type !== 'blocks') return false;
        const sourceNode = issues.find((i) => i.id === edge.source);
        return sourceNode ? sourceNode.status !== 'closed' : false;
      });
      if (!hasOpenBlocker) {
        ids.add(issue.id);
      }
    }
    return ids;
  }, [graphModel.adjacency, issues]);

  // --- Sorted epic tasks: optionally sort ready/actionable tasks first ---
  const sortedEpicTasks = useMemo(() => {
    if (!sortReadyFirst) return selectedEpicTasks;
    // Partition: ready (actionable + open) first, then in-progress, then blocked, then closed
    return [...selectedEpicTasks].sort((a, b) => {
      const aReady = actionableNodeIds.has(a.id) && a.status !== 'closed';
      const bReady = actionableNodeIds.has(b.id) && b.status !== 'closed';
      // Ready tasks bubble to the top
      if (aReady && !bReady) return -1;
      if (!aReady && bReady) return 1;
      // Within same readiness group, keep original priority order
      return 0;
    });
  }, [selectedEpicTasks, actionableNodeIds, sortReadyFirst]);

  // --- Build blocker tooltip data per node ---
  const blockerTooltipMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const issue of issues) {
      const adjacency = graphModel.adjacency[issue.id];
      if (!adjacency) continue;
      const lines: string[] = [];
      for (const edge of adjacency.incoming) {
        if (edge.type !== 'blocks') continue;
        const source = issues.find((i) => i.id === edge.source);
        if (source && source.status !== 'closed') {
          lines.push(`${source.id} (${source.status}) - "${source.title}"`);
        }
      }
      map.set(issue.id, lines);
    }
    return map;
  }, [graphModel.adjacency, issues]);

  // --- Detailed blocker info for task cards ---
  const blockerDetailsMap = useMemo(() => {
    const map = new Map<string, BlockerDetail[]>();
    for (const task of selectedEpicTasks) {
      const adjacency = graphModel.adjacency[task.id];
      if (!adjacency) continue;
      const details: BlockerDetail[] = [];
      for (const edge of adjacency.incoming) {
        if (edge.type !== 'blocks') continue;
        const source = issues.find((i) => i.id === edge.source);
        if (source && source.status !== 'closed') {
          const sourceEpic = epicByTaskId.get(source.id);
          details.push({
            id: source.id,
            title: source.title,
            status: source.status,
            priority: source.priority,
            epicTitle: sourceEpic?.title,
          });
        }
      }
      if (details.length > 0) map.set(task.id, details);
    }
    return map;
  }, [graphModel.adjacency, issues, selectedEpicTasks, epicByTaskId]);

  // --- External blocker names for each task (shown inline on nodes) ---
  const externalBlockerNames = useMemo(() => {
    const epicTaskIds = new Set(selectedEpicTasks.map((t) => t.id));
    const map = new Map<string, string[]>();

    for (const task of selectedEpicTasks) {
      const adjacency = graphModel.adjacency[task.id];
      if (!adjacency) continue;
      const externalNames: string[] = [];
      for (const edge of adjacency.incoming) {
        if (edge.type !== 'blocks') continue;
        // Only include blockers from OUTSIDE this epic
        if (!epicTaskIds.has(edge.source) && edge.source !== selectedEpicId) {
          const source = issues.find((i) => i.id === edge.source);
          if (source && source.status !== 'closed') {
            externalNames.push(`${source.id}: ${source.title}`);
          }
        }
      }
      if (externalNames.length > 0) map.set(task.id, externalNames);
    }
    return map;
  }, [graphModel.adjacency, issues, selectedEpicId, selectedEpicTasks]);

  // --- Detailed downstream blocking info for task cards ---
  const blocksDetailsMap = useMemo(() => {
    const map = new Map<string, BlockerDetail[]>();
    for (const task of selectedEpicTasks) {
      const adjacency = graphModel.adjacency[task.id];
      if (!adjacency) continue;
      const details: BlockerDetail[] = [];
      for (const edge of adjacency.outgoing) {
        if (edge.type !== 'blocks') continue;
        const target = issues.find((i) => i.id === edge.target);
        if (target && target.status !== 'closed') {
          const targetEpic = epicByTaskId.get(target.id);
          details.push({
            id: target.id,
            title: target.title,
            status: target.status,
            priority: target.priority,
            epicTitle: targetEpic?.title,
          });
        }
      }
      if (details.length > 0) map.set(task.id, details);
    }
    return map;
  }, [graphModel.adjacency, issues, selectedEpicTasks, epicByTaskId]);

  // --- ReactFlow model: ONLY this epic's tasks in status lanes ---
  const flowModel = useMemo(() => {
    if (selectedEpicTasks.length === 0) {
      return { nodes: [] as Node<GraphNodeData>[], edges: [] as Edge[] };
    }

    // SCOPED: Only the epic's own child tasks (no cross-epic workspace nodes)
    const visibleTasks = selectedEpicTasks
      .filter((issue) => (!hideClosed ? true : issue.status !== 'closed'));

    // Build ReactFlow nodes with our custom GraphNodeData
    const baseNodes: Node<GraphNodeData>[] = visibleTasks
      .map((issue) => ({
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
          blockerTooltipLines: externalBlockerNames.get(issue.id) ?? blockerTooltipMap.get(issue.id) ?? [],
        },
        position: { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        type: 'flowNode',
      }));

    const visibleIds = new Set(baseNodes.map((node) => node.id));
    const graphEdges: Edge[] = [];

    // Search ALL issues for blocking edges between visible nodes.
    // Dependencies may be stored on issues outside visibleTasks but
    // still connect two nodes that are both visible in the graph.
    for (const issue of issues) {
      for (const dep of issue.dependencies) {
        // Both endpoints must be visible in the graph
        if (!visibleIds.has(issue.id) && !visibleIds.has(dep.target)) continue;
        if (!visibleIds.has(issue.id) || !visibleIds.has(dep.target)) continue;
        // Only show blocking edges (skip parent, relates_to, etc.)
        if (dep.type !== 'blocks') continue;
        // Avoid self-loops
        if (issue.id === dep.target) continue;
        const edgeId = `${issue.id}:blocks:${dep.target}`;

        const linkedToSelection = selectedId ? issue.id === selectedId || dep.target === selectedId : false;

        graphEdges.push({
          id: edgeId,
          source: issue.id,
          target: dep.target,
          className: linkedToSelection ? 'workflow-edge-selected' : 'workflow-edge-muted',
          animated: linkedToSelection,
          style: {
            stroke: linkedToSelection ? '#7dd3fc' : '#fbbf24',
            strokeWidth: linkedToSelection ? 2.5 : 1.8,
            opacity: linkedToSelection ? 1 : 0.55,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: linkedToSelection ? '#7dd3fc' : '#fbbf24', width: 14, height: 14 },
        });
      }
    }

    return {
      nodes: layoutDagre(baseNodes, graphEdges),
      edges: graphEdges,
    };
  }, [
    hideClosed, issues, selectedEpicTasks, selectedId,
    signalById, actionableNodeIds, cycleNodeIdSet,
    chainNodeIds, blockerTooltipMap, externalBlockerNames,
  ]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flowNode: GraphNodeCard as any,
    }),
    [],
  );

  // --- Handle node click in the graph (also opens detail drawer) ---
  const handleFlowNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedId(node.id);
    setDrawerOpen(true);
  }, []);

  // --- Default edge rendering options ---
  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      zIndex: 40,
      interactionWidth: 24,
    }),
    [],
  );

  // --- Handle task selection (opens drawer on Tasks tab) ---
  // If the target is in another epic or IS an epic, switch to that epic first.
  const handleTaskSelect = useCallback((id: string, shouldOpenDrawer = true) => {
    // 1. If task is already visible in current epic view, just select it
    if (selectedEpicTasks.some((t) => t.id === id)) {
      setSelectedId(id);
      if (shouldOpenDrawer) setDrawerOpen(true);
      return;
    }

    // 2. If the target IS an epic itself, switch to that epic
    const targetIsEpic = epics.some((e) => e.id === id);
    if (targetIsEpic) {
      setSelectedEpicId(id);
      // Select the epic itself so the drawer shows its details
      setSelectedId(id);
      if (shouldOpenDrawer) setDrawerOpen(true);
      return;
    }

    // 3. Target is a task in another epic -- find which epic owns it
    const targetIssue = issues.find((i) => i.id === id);
    if (targetIssue) {
      // Determine parent epic: explicit parent dependency, or convention (id prefix before first dot)
      const parentDep = targetIssue.dependencies.find((dep) => dep.type === 'parent');
      const epicId = parentDep?.target ?? (targetIssue.id.includes('.') ? targetIssue.id.split('.')[0] : null);

      if (epicId && epicId !== selectedEpicId) {
        const epicExists = epics.some((e) => e.id === epicId);
        if (epicExists) {
          // If the target is closed and we are hiding closed tasks, unhide so we can see it
          if (targetIssue.status === 'closed' && hideClosed) {
            setHideClosed(false);
          }

          setSelectedEpicId(epicId);
          setSelectedId(id);
          if (shouldOpenDrawer) setDrawerOpen(true);
          return;
        }
      }
    }

    // 4. Fallback: select the id directly (might be orphan)
    setSelectedId(id);
    if (shouldOpenDrawer) setDrawerOpen(true);
  }, [selectedEpicTasks, selectedEpicId, issues, epics, hideClosed]);

  // --- Handle drawer close ---
  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <main className="mx-auto max-w-[1880px] px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
      {/* Page header */}
      <header className="mb-6 rounded-3xl border border-white/5 bg-[radial-gradient(circle_at_2%_2%,rgba(56,189,248,0.12),transparent_40%),linear-gradient(170deg,rgba(15,23,42,0.92),rgba(11,12,16,0.95))] px-5 py-5 sm:px-8 sm:py-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky-400/70 font-bold">BeadBoard Workspace</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-text-strong sm:text-4xl">Workflow Explorer</h1>
            <Link href={kanbanHref} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-text-body transition-all hover:bg-white/10 hover:border-white/20 sm:px-4 sm:text-xs">
              &larr; Kanban
            </Link>
          </div>
          <p className="hidden max-w-md text-sm leading-relaxed text-text-muted/90 sm:block">
            Epic-driven dependency visualization. Drill into task relationships, triage blockers, and understand downstream impact at a glance.
          </p>
        </div>
        {activeScope ? (
          <p className="mt-3 text-xs text-text-muted/90">
            Scope:{' '}
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-text-body">
              {activeScope.source === 'local' ? 'local workspace' : activeScope.displayPath}
            </span>
          </p>
        ) : null}
        <div className="mt-3">
          <ProjectScopeControls
            projectScopeKey={projectScopeKey}
            projectScopeMode={projectScopeMode}
            projectScopeOptions={projectScopeOptions}
          />
        </div>
      </header>

      {/* Main content area */}
      <section className="rounded-[2.5rem] border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,255,255,0.005))] shadow-2xl backdrop-blur-sm overflow-hidden">
        {/* Toolbar row: epic chips + tab switcher */}
        <div className="flex flex-wrap items-center gap-4 border-b border-white/5 px-6 py-4 bg-white/[0.02]">
          {/* Epic chip strip - shows titles, not just IDs */}
          <div className="flex-1 min-w-0">
            <EpicChipStrip
              epics={epics}
              selectedEpicId={selectedEpicId}
              beadCounts={beadCounts}
              onSelect={setSelectedEpicId}
            />
          </div>

          {/* Right side: filter toggle + stats + mobile toggle */}
          <div className="flex items-center gap-3">
            {/* Filters toggle - hides power-user controls behind a button */}
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${showFilters
                ? 'border-sky-400/30 bg-sky-400/10 text-sky-300'
                : 'border-white/10 bg-white/5 text-text-muted hover:bg-white/10'
                }`}
            >
              Filters {showFilters ? '▴' : '▾'}
            </button>

            {/* Mobile panel toggle */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setMobilePanel((current) => (current === 'overview' ? 'flow' : 'overview'))}
                className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 text-xs font-bold text-sky-300 transition-all hover:bg-sky-400/20"
              >
                {mobilePanel === 'overview' ? 'Switch to Graph' : 'Back to Selection'}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible filters row - tab-aware: different filters per tab */}
        {showFilters ? (
          <div className="flex flex-wrap items-center gap-4 border-b border-white/5 px-6 py-3 bg-white/[0.01]">
            {/* Shared filter: Hide closed */}
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-text-body transition-all hover:bg-white/5">
              <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-sky-500" checked={hideClosed} onChange={(event) => setHideClosed(event.target.checked)} />
              Hide closed
            </label>

            {/* Tasks-specific filters */}
            {activeTab === 'tasks' ? (
              <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-text-body transition-all hover:bg-white/5">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-sky-500" checked={sortReadyFirst} onChange={(event) => setSortReadyFirst(event.target.checked)} />
                Ready first
              </label>
            ) : null}

            {/* Dependencies-specific filters */}
            {activeTab === 'dependencies' ? (
              <>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted" htmlFor="depth-select">
                    Hop Depth
                  </label>
                  <select
                    id="depth-select"
                    className="ui-field ui-select rounded-xl px-3 py-1.5 text-xs font-medium ring-sky-400/20 focus:ring-2 outline-none transition-all"
                    value={String(depth)}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDepth(value === 'full' ? 'full' : (Number(value) as 1 | 2));
                    }}
                  >
                    {DEPTH_OPTIONS.map((option) => (
                      <option className="ui-option" key={String(option)} value={String(option)}>
                        {option === 'full' ? 'Infinite' : `${option} hop${option === 1 ? '' : 's'}`}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-text-body transition-all hover:bg-white/5">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-sky-500" checked={showBlockingOnly} onChange={(event) => setShowBlockingOnly(event.target.checked)} />
                  Blocking path only
                </label>
              </>
            ) : null}
          </div>
        ) : null}

        {/* Tab switcher row + selected epic context */}
        <div className="hidden md:flex items-center justify-between border-b border-white/5 px-6 py-3 bg-white/[0.01]">
          <WorkflowTabs activeTab={activeTab} onTabChange={setActiveTab} />
          {selectedEpic ? (
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono text-[10px] text-text-muted/50">{selectedEpic.id}</span>
              <span className="font-medium text-text-body truncate max-w-[20rem]">{selectedEpic.title}</span>
              {!selectedEpicHasChildren && projectLevelTasks.length > 0 ? (
                <span className="rounded-md bg-sky-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300/90">
                  project tasks fallback
                </span>
              ) : null}
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-muted/60">
                {selectedEpicTasks.length} tasks
              </span>
            </div>
          ) : null}
        </div>

        {/* ====== MOBILE LAYOUT ====== */}
        {/* Mobile: overview panel (epic selection + task cards + dep flow) */}
        <div className={`${mobilePanel === 'overview' ? 'flex' : 'hidden'} flex-col gap-6 p-6 md:hidden`}>
          <section className="space-y-6 rounded-3xl bg-[rgba(14,20,33,0.88)] p-6 ring-1 ring-white/10 backdrop-blur-xl">
            {/* Epic selector as horizontal scroll */}
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted/70">1) Select Epic</h2>
              <div className="mt-4">
                <EpicChipStrip
                  epics={epics}
                  selectedEpicId={selectedEpicId}
                  beadCounts={beadCounts}
                  onSelect={setSelectedEpicId}
                />
              </div>
            </div>

            {/* Selected epic info */}
            <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/5">
              <h3 className="text-base font-bold text-text-strong">{selectedEpic?.title ?? 'No epic selected'}</h3>
              <p className="mt-1 text-xs font-medium text-text-muted/80">
                {selectedEpicTasks.length} tasks &bull; <span className="uppercase">{selectedEpic?.status ?? 'unknown'}</span>
              </p>
            </section>

            {/* Task cards */}
            <section className="rounded-2xl bg-white/[0.02] p-5 ring-1 ring-white/5">
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted/70">2) Pick Task</h3>
              <div className="max-h-[30vh] overflow-y-auto overscroll-contain custom-scrollbar">
                <TaskCardGrid
                  tasks={sortedEpicTasks}
                  selectedId={selectedId}
                  signalById={signalById}
                  blockerDetailsMap={blockerDetailsMap}
                  blocksDetailsMap={blocksDetailsMap}
                  actionableIds={actionableNodeIds}
                  onSelect={handleTaskSelect}
                />
              </div>
            </section>

          </section>
        </div>

        {/* ====== DESKTOP LAYOUT ====== */}
        {/* Desktop: Tasks tab content - use conditional rendering, not Tailwind dynamic classes */}
        {activeTab === 'tasks' ? (
          <div className="hidden md:block p-6">
            <TaskCardGrid
              tasks={sortedEpicTasks}
              selectedId={selectedId}
              signalById={signalById}
              blockerDetailsMap={blockerDetailsMap}
              blocksDetailsMap={blocksDetailsMap}
              actionableIds={actionableNodeIds}
              onSelect={handleTaskSelect}
            />
          </div>
        ) : null}

        {/* Desktop: Dependencies tab content (graph only, no flow strip) */}
        {activeTab === 'dependencies' ? (
          <div className="hidden md:flex min-h-0 flex-col p-6">
            {/* Dependency Flow Strip - above graph */}
            <div className="mb-6">
              <DependencyFlowStrip
                workspace={workspace}
                selectedId={selectedId}
                signalById={signalById}
                onSelect={setSelectedId}
              />
            </div>

            <ReactFlowProvider>
              <GraphSection
                nodes={flowModel.nodes}
                edges={flowModel.edges}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                onNodeClick={handleFlowNodeClick}
                blockerAnalysis={blockerAnalysis}
                hideClosed={hideClosed}
              />
            </ReactFlowProvider>
          </div>
        ) : null}

        {/* Mobile: graph panel */}
        <section className={`${mobilePanel === 'flow' ? 'flex' : 'hidden'} min-h-0 flex-col border-t border-white/10 bg-[rgba(8,12,20,0.9)] p-6 backdrop-blur-xl md:hidden`}>
          <ReactFlowProvider>
            <GraphSection
              nodes={flowModel.nodes}
              edges={flowModel.edges}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              onNodeClick={handleFlowNodeClick}
              blockerAnalysis={blockerAnalysis}
              hideClosed={hideClosed}
            />
          </ReactFlowProvider>
        </section>
      </section>

      {/* Task details drawer - slides in from right on task selection */}
      <TaskDetailsDrawer
        issue={selectedIssue}
        open={drawerOpen}
        onClose={handleDrawerClose}
        projectRoot={projectRoot}
        editable={projectScopeMode === 'single'}
        onIssueUpdated={() => router.refresh()}
        blockedTree={selectedIssue ? buildBlockedByTree(issues, selectedIssue.id) : undefined}
        outgoingBlocks={selectedId ? blocksDetailsMap.get(selectedId) ?? [] : []}
        onSelectBlockedIssue={handleTaskSelect}
      />
    </main>
  );
}
