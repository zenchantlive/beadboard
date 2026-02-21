'use client';

import type { BeadIssue } from '../../lib/types';
import { WorkflowGraph } from '../shared/workflow-graph';
import type { GraphTabType } from '../../hooks/use-url-state';

interface GraphViewProps {
  beads: BeadIssue[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  graphTab: GraphTabType;
  onGraphTabChange: (tab: GraphTabType) => void;
  hideClosed?: boolean;
}

export function GraphView({
  beads,
  selectedId,
  onSelect,
  graphTab,
  onGraphTabChange,
  hideClosed = false,
}: GraphViewProps) {
  return (
    <div className="flex h-full flex-col bg-[var(--ui-bg-app)]">
      <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] bg-[var(--ui-bg-shell)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">
            Graph View
          </p>
          <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onGraphTabChange('flow')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-bg-shell)] ${
              graphTab === 'flow'
                ? 'bg-sky-400/10 text-sky-200 shadow-[0_2px_8px_rgba(56,189,248,0.1)]'
                : 'text-text-muted/60 hover:text-text-body hover:bg-white/[0.04]'
            }`}
          >
            Flow
          </button>
          <button
            type="button"
            onClick={() => onGraphTabChange('overview')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-bg-shell)] ${
              graphTab === 'overview'
                ? 'bg-sky-400/10 text-sky-200 shadow-[0_2px_8px_rgba(56,189,248,0.1)]'
                : 'text-text-muted/60 hover:text-text-body hover:bg-white/[0.04]'
            }`}
          >
            Overview
          </button>
        </div>
        </div>
        <span className="text-[10px] text-text-muted/50">
          {beads.length} beads
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <WorkflowGraph
          beads={beads}
          selectedId={selectedId}
          onSelect={onSelect}
          hideClosed={graphTab === 'flow' ? hideClosed : false}
          className="h-full"
        />
      </div>
    </div>
  );
}
