'use client';

import { useMemo } from 'react';
import { Signal } from 'lucide-react';
import type { BeadIssue } from '../../lib/types';

interface TelemetryStripProps {
  issues: BeadIssue[];
  onMaximize: () => void;
}

function dotColor(status: BeadIssue['status']): { bg: string; glow: string } {
  switch (status) {
    case 'blocked':     return { bg: 'var(--accent-danger)',  glow: 'rgba(255,76,114,0.4)' };
    case 'in_progress': return { bg: 'var(--accent-warning)', glow: 'rgba(255,178,74,0.4)' };
    case 'open':        return { bg: 'var(--accent-success)', glow: 'rgba(53,217,143,0.4)' };
    case 'closed':      return { bg: 'var(--text-tertiary)',  glow: 'transparent' };
    default:            return { bg: 'var(--accent-info)',    glow: 'rgba(125,211,252,0.3)' };
  }
}

export function TelemetryStrip({ issues, onMaximize }: TelemetryStripProps) {
  // Show the 8 most recently updated tasks as live dots
  const recentTasks = useMemo(() => {
    return [...issues]
      .filter((i) => i.issue_type !== 'epic')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8);
  }, [issues]);

  return (
    <div className="flex h-full w-9 flex-shrink-0 flex-col items-center border-l border-[var(--border-subtle)] bg-[var(--surface-primary)] py-2">
      <button
        type="button"
        onClick={onMaximize}
        className="mb-2 rounded p-1 text-[var(--accent-info)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)]"
        title="Restore live feed"
        aria-label="Restore live feed"
      >
        <Signal className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-1 flex-col items-center gap-2 overflow-hidden">
        {recentTasks.map((task) => {
          const { bg, glow } = dotColor(task.status);
          return (
            <div key={task.id} className="flex flex-col items-center" title={`${task.id}: ${task.title} (${task.status})`}>
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: bg,
                  boxShadow: `0 0 5px 1px ${glow}`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
