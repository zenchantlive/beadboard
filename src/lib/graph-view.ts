import dagre from 'dagre';

import type { GraphEdge, GraphModel, GraphNode } from './graph';

export type GraphHopDepth = 1 | 2 | 'full';

export interface GraphViewOptions {
  focusId: string | null;
  depth: GraphHopDepth;
  hideClosed: boolean;
}

export interface PositionedGraphNode extends GraphNode {
  position: { x: number; y: number };
}

export interface GraphViewModel {
  nodes: PositionedGraphNode[];
  edges: GraphEdge[];
}

export interface PathWorkspace {
  focus: GraphNode | null;
  blockers: GraphNode[][];
  dependents: GraphNode[][];
}

const NODE_WIDTH = 340;
const NODE_HEIGHT = 132;

function sortEdges(a: GraphEdge, b: GraphEdge): number {
  if (a.source !== b.source) {
    return a.source.localeCompare(b.source);
  }
  if (a.type !== b.type) {
    return a.type.localeCompare(b.type);
  }
  return a.target.localeCompare(b.target);
}

function sortNodes(a: GraphNode, b: GraphNode): number {
  return a.id.localeCompare(b.id);
}

function collectIdsWithDepth(model: GraphModel, focusId: string, depth: Exclude<GraphHopDepth, 'full'>): Set<string> {
  const visited = new Set<string>([focusId]);
  let frontier = new Set<string>([focusId]);

  for (let step = 0; step < depth; step += 1) {
    const next = new Set<string>();
    for (const nodeId of frontier) {
      const adjacency = model.adjacency[nodeId];
      if (!adjacency) {
        continue;
      }

      for (const edge of adjacency.outgoing) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          next.add(edge.target);
        }
      }
      for (const edge of adjacency.incoming) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          next.add(edge.source);
        }
      }
    }
    frontier = next;
    if (frontier.size === 0) {
      break;
    }
  }

  return visited;
}

function applyFocusWorkspaceLayout(nodes: GraphNode[], edges: GraphEdge[], focusId: string): PositionedGraphNode[] {
  const incomingDepth = new Map<string, number>([[focusId, 0]]);
  const outgoingDepth = new Map<string, number>([[focusId, 0]]);

  let incomingFrontier = new Set<string>([focusId]);
  let outgoingFrontier = new Set<string>([focusId]);
  let incomingStep = 0;
  let outgoingStep = 0;

  while (incomingFrontier.size > 0) {
    incomingStep += 1;
    const next = new Set<string>();
    for (const nodeId of incomingFrontier) {
      for (const edge of edges) {
        if (edge.target !== nodeId) {
          continue;
        }
        if (!incomingDepth.has(edge.source)) {
          incomingDepth.set(edge.source, incomingStep);
          next.add(edge.source);
        }
      }
    }
    incomingFrontier = next;
  }

  while (outgoingFrontier.size > 0) {
    outgoingStep += 1;
    const next = new Set<string>();
    for (const nodeId of outgoingFrontier) {
      for (const edge of edges) {
        if (edge.source !== nodeId) {
          continue;
        }
        if (!outgoingDepth.has(edge.target)) {
          outgoingDepth.set(edge.target, outgoingStep);
          next.add(edge.target);
        }
      }
    }
    outgoingFrontier = next;
  }

  const columns = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    let column = 0;
    if (node.id !== focusId) {
      const inDepth = incomingDepth.get(node.id);
      const outDepth = outgoingDepth.get(node.id);
      if (inDepth && outDepth) {
        column = inDepth <= outDepth ? -inDepth : outDepth;
      } else if (inDepth) {
        column = -inDepth;
      } else if (outDepth) {
        column = outDepth;
      }
    }

    const bucket = columns.get(column) ?? [];
    bucket.push(node);
    columns.set(column, bucket);
  }

  const columnKeys = [...columns.keys()].sort((a, b) => a - b);
  const positioned: PositionedGraphNode[] = [];

  for (const columnKey of columnKeys) {
    const columnNodes = (columns.get(columnKey) ?? []).sort((a, b) => a.id.localeCompare(b.id));
    columnNodes.forEach((node, rowIndex) => {
      positioned.push({
        ...node,
        position: {
          x: (columnKey + 3) * (NODE_WIDTH + 60),
          y: rowIndex * (NODE_HEIGHT + 26),
        },
      });
    });
  }

  return positioned.sort((a, b) => {
    if (a.id === focusId) {
      return -1;
    }
    if (b.id === focusId) {
      return 1;
    }
    return a.id.localeCompare(b.id);
  });
}

function applyLayout(nodes: GraphNode[], edges: GraphEdge[], focusId: string | null): PositionedGraphNode[] {
  if (focusId) {
    return applyFocusWorkspaceLayout(nodes, edges, focusId);
  }

  if (edges.length === 0) {
    const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    return nodes.map((node, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        ...node,
        position: {
          x: col * (NODE_WIDTH + 36),
          y: row * (NODE_HEIGHT + 28),
        },
      };
    });
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'LR',
    ranksep: 110,
    nodesep: 36,
  });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const positioned = nodes
    .map((node) => {
      const point = graph.node(node.id);
      return {
        ...node,
        position: {
          x: Math.round((point?.x ?? 0) - NODE_WIDTH / 2),
          y: Math.round((point?.y ?? 0) - NODE_HEIGHT / 2),
        },
      };
    })
    .sort((a, b) => {
      if (focusId && a.id === focusId) {
        return -1;
      }
      if (focusId && b.id === focusId) {
        return 1;
      }
      return a.id.localeCompare(b.id);
    });

  return positioned;
}

export function buildGraphViewModel(model: GraphModel, options: GraphViewOptions): GraphViewModel {
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));

  const baseVisibleIds = options.focusId
    ? options.depth === 'full'
      ? new Set(model.nodes.map((node) => node.id))
      : collectIdsWithDepth(model, options.focusId, options.depth)
    : new Set(model.nodes.map((node) => node.id));

  const filteredIds = new Set(
    [...baseVisibleIds].filter((id) => {
      const node = nodeById.get(id);
      if (!node) {
        return false;
      }
      if (!options.hideClosed) {
        return true;
      }
      if (id === options.focusId) {
        return true;
      }
      return node.status !== 'closed';
    }),
  );

  const nodes = model.nodes.filter((node) => filteredIds.has(node.id)).sort(sortNodes);
  const edges = model.edges
    .filter((edge) => filteredIds.has(edge.source) && filteredIds.has(edge.target))
    .sort(sortEdges);

  return {
    nodes: applyLayout(nodes, edges, options.focusId),
    edges,
  };
}

function includeByClosedFilter(node: GraphNode, hideClosed: boolean, forceInclude: boolean): boolean {
  if (forceInclude) {
    return true;
  }
  if (!hideClosed) {
    return true;
  }
  return node.status !== 'closed';
}

export function buildPathWorkspace(model: GraphModel, options: GraphViewOptions): PathWorkspace {
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const focusId = options.focusId;
  const focusNode = focusId ? nodeById.get(focusId) ?? null : null;

  if (!focusNode || !focusId) {
    return { focus: null, blockers: [], dependents: [] };
  }

  const maxDepth = options.depth === 'full' ? Number.POSITIVE_INFINITY : options.depth;

  const blockers: GraphNode[][] = [];
  const dependents: GraphNode[][] = [];

  const blockerSeen = new Set<string>([focusId]);
  const dependentSeen = new Set<string>([focusId]);

  let blockerFrontier = new Set<string>([focusId]);
  let dependentFrontier = new Set<string>([focusId]);

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const nextBlockerFrontier = new Set<string>();
    const nextDependentFrontier = new Set<string>();
    const blockerLevel: GraphNode[] = [];
    const dependentLevel: GraphNode[] = [];

    for (const nodeId of blockerFrontier) {
      const adjacency = model.adjacency[nodeId];
      if (!adjacency) {
        continue;
      }
      for (const edge of adjacency.incoming) {
        if (blockerSeen.has(edge.source)) {
          continue;
        }
        blockerSeen.add(edge.source);
        nextBlockerFrontier.add(edge.source);
        const node = nodeById.get(edge.source);
        if (node && includeByClosedFilter(node, options.hideClosed, false)) {
          blockerLevel.push(node);
        }
      }
    }

    for (const nodeId of dependentFrontier) {
      const adjacency = model.adjacency[nodeId];
      if (!adjacency) {
        continue;
      }
      for (const edge of adjacency.outgoing) {
        if (dependentSeen.has(edge.target)) {
          continue;
        }
        dependentSeen.add(edge.target);
        nextDependentFrontier.add(edge.target);
        const node = nodeById.get(edge.target);
        if (node && includeByClosedFilter(node, options.hideClosed, false)) {
          dependentLevel.push(node);
        }
      }
    }

    blockerLevel.sort(sortNodes);
    dependentLevel.sort(sortNodes);

    if (blockerLevel.length > 0) {
      blockers.push(blockerLevel);
    }
    if (dependentLevel.length > 0) {
      dependents.push(dependentLevel);
    }

    blockerFrontier = nextBlockerFrontier;
    dependentFrontier = nextDependentFrontier;

    if (blockerFrontier.size === 0 && dependentFrontier.size === 0) {
      break;
    }
  }

  return { focus: focusNode, blockers, dependents };
}

export interface BlockedChainAnalysis {
  blockerNodeIds: string[];
  openBlockerCount: number;
  inProgressBlockerCount: number;
  firstActionableBlockerId: string | null;
  chainEdgeIds: string[];
}

export function analyzeBlockedChain(model: GraphModel, options: { focusId: string }): BlockedChainAnalysis {
  const focusId = options.focusId;
  const visited = new Set<string>([focusId]);
  let queue = [focusId];
  const chainEdgeIds: string[] = [];
  const blockerNodeIds: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const adjacency = model.adjacency[nodeId];
    if (!adjacency) continue;

    for (const edge of adjacency.incoming) {
      if (edge.type !== 'blocks') continue;
      chainEdgeIds.push(`${edge.source}:${edge.type}:${edge.target}`);
      if (!visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
        blockerNodeIds.push(edge.source);
      }
    }
  }

  const blockers = blockerNodeIds.map(id => model.nodes.find(n => n.id === id)).filter(Boolean) as GraphNode[];
  const nodeById = new Map(model.nodes.map((n) => [n.id, n]));
  const blockers = blockerNodeIds.map(id => nodeById.get(id)).filter(Boolean) as GraphNode[];
  const openBlockers = blockers.filter((b) => b.status !== 'closed');
  const inProgress = openBlockers.filter((b) => b.status === 'in_progress');

  const firstActionable = openBlockers.find((b) => {
    const adj = model.adjacency[b.id];
    if (!adj) return true;
    return !adj.incoming.some(e => {
      if (e.type !== 'blocks') return false;
      const sourceNode = nodeById.get(e.source);
      return sourceNode?.status !== 'closed';
    });
  });

  return {
    blockerNodeIds: blockerNodeIds.sort(),
    openBlockerCount: openBlockers.length,
    inProgressBlockerCount: inProgress.length,
    firstActionableBlockerId: firstActionable?.id ?? null,
    chainEdgeIds: chainEdgeIds.sort(),
  };
}

export interface CycleAnomaly {
  cycles: string[][];
  cycleNodeIds: string[];
  cycleEdgeIds: string[];
}

export function detectDependencyCycles(model: GraphModel): CycleAnomaly {
  const cycleNodeIdsSet = new Set<string>();
  const cycleEdgeIdsSet = new Set<string>();
  const cycleKeys = new Set<string>();
  const cycles: string[][] = [];

  const relevantEdges = model.edges.filter((e) => e.type === 'blocks');
  const adj = new Map<string, string[]>();
  for (const node of model.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of relevantEdges) {
    const list = adj.get(edge.source) ?? [];
    list.push(edge.target);
    adj.set(edge.source, list);
  }
  for (const [nodeId, neighbors] of adj.entries()) {
    adj.set(
      nodeId,
      [...neighbors].sort((a, b) => a.localeCompare(b)),
    );
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function walk(nodeId: string): void {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adj.get(nodeId) ?? [];
    for (const nextId of neighbors) {
      if (!visited.has(nextId)) {
        walk(nextId);
      } else if (recStack.has(nextId)) {
        const cycleStartIndex = path.indexOf(nextId);
        if (cycleStartIndex >= 0) {
          const cycleNodes = path.slice(cycleStartIndex);
          const canonical = [...cycleNodes].sort((a, b) => a.localeCompare(b));
          const cycleKey = canonical.join('|');
          if (!cycleKeys.has(cycleKey)) {
            cycleKeys.add(cycleKey);
            cycles.push(canonical);
          }
          canonical.forEach((id) => cycleNodeIdsSet.add(id));
          for (let i = 0; i < cycleNodes.length; i += 1) {
            const s = cycleNodes[i];
            const t = cycleNodes[(i + 1) % cycleNodes.length];
            cycleEdgeIdsSet.add(`${s}:blocks:${t}`);
          }
        }
      }
    }

    recStack.delete(nodeId);
    path.pop();
  }

  for (const node of model.nodes) {
    if (!visited.has(node.id)) {
      walk(node.id);
    }
  }

  cycles.sort((a, b) => a.join('|').localeCompare(b.join('|')));
  return {
    cycles,
    cycleNodeIds: [...cycleNodeIdsSet].sort(),
    cycleEdgeIds: [...cycleEdgeIdsSet].sort(),
  };
}
