import { useMemo } from 'react';

import type { BeadIssue } from '../lib/types';
import { buildGraphModel, type GraphModel } from '../lib/graph';
import {
  analyzeBlockedChain,
  detectDependencyCycles,
  type BlockedChainAnalysis,
  type CycleAnomaly,
} from '../lib/graph-view';

export interface GraphAnalysis {
  graphModel: GraphModel;
  signalById: Map<string, { blockedBy: number; blocks: number }>;
  cycleAnalysis: CycleAnomaly;
  cycleNodeIdSet: Set<string>;
  actionableNodeIds: Set<string>;
  blockerTooltipMap: Map<string, string[]>;
  blockerAnalysis: BlockedChainAnalysis | null;
  chainNodeIds: Set<string>;
}

export function useGraphAnalysis(
  issues: BeadIssue[],
  projectRoot: string,
  selectedId: string | null | undefined,
): GraphAnalysis {
  const graphModel = useMemo(
    () => buildGraphModel(issues, { projectKey: projectRoot }),
    [issues, projectRoot],
  );

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

  const cycleAnalysis = useMemo(() => detectDependencyCycles(graphModel), [graphModel]);

  const cycleNodeIdSet = useMemo(() => new Set(cycleAnalysis.cycleNodeIds), [cycleAnalysis]);

  const actionableNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const issue of issues) {
      if (issue.status === 'closed') continue;
      const adjacency = graphModel.adjacency[issue.id];
      if (!adjacency) continue;
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

  const blockerAnalysis = useMemo(() => {
    if (!selectedId) return null;
    return analyzeBlockedChain(graphModel, { focusId: selectedId });
  }, [graphModel, selectedId]);

  const chainNodeIds = useMemo(() => {
    if (!selectedId || !blockerAnalysis) return new Set<string>();
    const ids = new Set<string>([selectedId, ...blockerAnalysis.blockerNodeIds]);
    return ids;
  }, [selectedId, blockerAnalysis]);

  return {
    graphModel,
    signalById,
    cycleAnalysis,
    cycleNodeIdSet,
    actionableNodeIds,
    blockerTooltipMap,
    blockerAnalysis,
    chainNodeIds,
  };
}
