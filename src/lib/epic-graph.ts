import type { BeadIssue } from './types';

export interface WorkflowEdgeDescriptor {
  id: string;
  source: string;
  target: string;
  kind: 'blocks' | 'subtask';
  isUpstreamOfFocus: boolean;
  isDownstreamOfFocus: boolean;
  isDirectlyFocused: boolean;
  isUnrelated: boolean;
  sourceStatus: string;
  targetStatus: string;
}

interface BuildWorkflowEdgesOptions {
  issues: BeadIssue[];
  visibleIds: Set<string>;
  selectedId: string | null;
  includeHierarchy: boolean;
}

export function collectEpicDescendantIds(issues: BeadIssue[], epicId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  const issueById = new Map(issues.map((issue) => [issue.id, issue]));

  for (const issue of issues) {
    for (const dep of issue.dependencies) {
      if (dep.type !== 'parent') continue;
      const list = childrenByParent.get(dep.target) ?? [];
      list.push(issue.id);
      childrenByParent.set(dep.target, list);
    }
  }

  const descendants = new Set<string>();
  const queue = [...(childrenByParent.get(epicId) ?? [])];
  const seen = new Set<string>([epicId]);

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const issue = issueById.get(id);
    if (issue && issue.issue_type !== 'epic') {
      descendants.add(id);
    }

    const children = childrenByParent.get(id) ?? [];
    for (const child of children) {
      if (!seen.has(child)) {
        queue.push(child);
      }
    }
  }

  return descendants;
}

export function buildWorkflowEdges({
  issues,
  visibleIds,
  selectedId,
  includeHierarchy,
}: BuildWorkflowEdgesOptions): WorkflowEdgeDescriptor[] {
  const issueById = new Map(issues.map((issue) => [issue.id, issue]));
  const edgeIds = new Set<string>();
  const edges: WorkflowEdgeDescriptor[] = [];

  const upstreamIds = new Set<string>();
  const downstreamIds = new Set<string>();

  if (selectedId) {
    upstreamIds.add(selectedId);
    downstreamIds.add(selectedId);

    // Build adjacency just for tracing blockers
    const outgoing = new Map<string, string[]>(); // id -> nodes it blocks
    const incoming = new Map<string, string[]>(); // id -> nodes blocking it

    for (const issue of issues) {
      for (const dep of issue.dependencies) {
        if (dep.type === 'blocks') {
          const blocker = dep.target;
          const blocked = issue.id;

          if (!outgoing.has(blocker)) outgoing.set(blocker, []);
          if (!incoming.has(blocked)) incoming.set(blocked, []);

          outgoing.get(blocker)!.push(blocked);
          incoming.get(blocked)!.push(blocker);
        }
      }
    }

    // Trace incoming (upstream blockers)
    let queue = [selectedId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const b of (incoming.get(curr) || [])) {
        if (!upstreamIds.has(b)) {
          upstreamIds.add(b);
          queue.push(b);
        }
      }
    }

    // Trace outgoing (downstream blocked)
    queue = [selectedId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const b of (outgoing.get(curr) || [])) {
        if (!downstreamIds.has(b)) {
          downstreamIds.add(b);
          queue.push(b);
        }
      }
    }
  }

  for (const issue of issues) {
    if (!visibleIds.has(issue.id)) continue;

    for (const dep of issue.dependencies) {
      if (!visibleIds.has(dep.target)) continue;
      if (dep.target === issue.id) continue;

      if (dep.type === 'blocks') {
        const source = dep.target;
        const target = issue.id;
        const id = `${source}:blocks:${target}`;
        if (edgeIds.has(id)) continue;
        edgeIds.add(id);

        const sourceIssue = issueById.get(source);
        const sourceStatus = sourceIssue?.status || 'open';
        const targetStatus = issue.status;

        const isUpstreamOfFocus = selectedId ? upstreamIds.has(source) && upstreamIds.has(target) : false;
        const isDownstreamOfFocus = selectedId ? downstreamIds.has(source) && downstreamIds.has(target) : false;
        const isDirectlyFocused = selectedId ? source === selectedId || target === selectedId : false;

        let isUnrelated = false;
        if (selectedId) {
          isUnrelated = !isUpstreamOfFocus && !isDownstreamOfFocus && !isDirectlyFocused;
        }

        edges.push({
          id,
          source,
          target,
          kind: 'blocks',
          isUpstreamOfFocus,
          isDownstreamOfFocus,
          isDirectlyFocused,
          isUnrelated,
          sourceStatus,
          targetStatus
        });
      }

      if (includeHierarchy && dep.type === 'parent') {
        const source = dep.target;
        const target = issue.id;
        const id = `${source}:subtask:${target}`;
        if (edgeIds.has(id)) continue;
        edgeIds.add(id);

        const sourceIssue = issueById.get(source);
        const sourceStatus = sourceIssue?.status || 'open';
        const targetStatus = issue.status;

        const isUpstreamOfFocus = selectedId ? upstreamIds.has(source) && upstreamIds.has(target) : false;
        const isDownstreamOfFocus = selectedId ? downstreamIds.has(source) && downstreamIds.has(target) : false;
        const isDirectlyFocused = selectedId ? source === selectedId || target === selectedId : false;

        let isUnrelated = false;
        if (selectedId) {
          isUnrelated = !isUpstreamOfFocus && !isDownstreamOfFocus && !isDirectlyFocused;
        }

        edges.push({
          id,
          source,
          target,
          kind: 'subtask',
          isUpstreamOfFocus,
          isDownstreamOfFocus,
          isDirectlyFocused,
          isUnrelated,
          sourceStatus,
          targetStatus
        });
      }
    }
  }

  return edges;
}
