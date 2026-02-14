import type { BeadDependencyType, BeadIssue } from './types';

type SupportedGraphEdgeType = Extract<
  BeadDependencyType,
  'blocks' | 'parent' | 'relates_to' | 'duplicates' | 'supersedes'
>;

const SUPPORTED_EDGE_TYPES = new Set<BeadDependencyType>([
  'blocks',
  'parent',
  'relates_to',
  'duplicates',
  'supersedes',
]);

export interface GraphNode {
  id: string;
  title: string;
  status: BeadIssue['status'];
  priority: number;
  issueType: string;
  assignee: string | null;
  updatedAt: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: SupportedGraphEdgeType;
}

export interface GraphAdjacencyEntry {
  incoming: GraphEdge[];
  outgoing: GraphEdge[];
}

export interface GraphModelDiagnostics {
  missingTargets: number;
  droppedDuplicates: number;
  unsupportedTypes: number;
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: Record<string, GraphAdjacencyEntry>;
  diagnostics: GraphModelDiagnostics;
  projectKey: string | null;
}

export interface BuildGraphModelOptions {
  projectKey?: string;
}

function edgeSort(a: GraphEdge, b: GraphEdge): number {
  if (a.source !== b.source) {
    return a.source.localeCompare(b.source);
  }
  if (a.type !== b.type) {
    return a.type.localeCompare(b.type);
  }
  return a.target.localeCompare(b.target);
}

function isSupportedEdgeType(type: BeadDependencyType): type is SupportedGraphEdgeType {
  return SUPPORTED_EDGE_TYPES.has(type);
}

export function buildGraphModel(issues: BeadIssue[], options: BuildGraphModelOptions = {}): GraphModel {
  const nodes = issues
    .map((issue) => ({
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      issueType: issue.issue_type,
      assignee: issue.assignee,
      updatedAt: issue.updated_at,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeKeys = new Set<string>();
  const edges: GraphEdge[] = [];
  const diagnostics: GraphModelDiagnostics = {
    missingTargets: 0,
    droppedDuplicates: 0,
    unsupportedTypes: 0,
  };

  for (const issue of issues) {
    for (const dependency of issue.dependencies) {
      if (!isSupportedEdgeType(dependency.type)) {
        diagnostics.unsupportedTypes += 1;
        continue;
      }

      if (!nodeIds.has(dependency.target)) {
        diagnostics.missingTargets += 1;
        continue;
      }

      // Beads "blocks" dependency means: issue depends on target, so target blocks issue.
      // Normalize graph direction to blocker -> blocked for all blocker analytics and UI signals.
      const source = dependency.type === 'blocks' ? dependency.target : issue.id;
      const target = dependency.type === 'blocks' ? issue.id : dependency.target;

      const edgeKey = `${source}::${dependency.type}::${target}`;
      if (edgeKeys.has(edgeKey)) {
        diagnostics.droppedDuplicates += 1;
        continue;
      }

      edgeKeys.add(edgeKey);
      edges.push({
        source,
        target,
        type: dependency.type,
      });
    }
  }

  edges.sort(edgeSort);

  const adjacency: Record<string, GraphAdjacencyEntry> = {};
  for (const node of nodes) {
    adjacency[node.id] = { incoming: [], outgoing: [] };
  }

  for (const edge of edges) {
    adjacency[edge.source].outgoing.push(edge);
    adjacency[edge.target].incoming.push(edge);
  }

  return {
    nodes,
    edges,
    adjacency,
    diagnostics,
    projectKey: options.projectKey ?? null,
  };
}
