'use client';

import { ChevronRight } from 'lucide-react';
import type { BeadIssue } from '../../lib/types';

interface TelemetryStripProps {
  issues: BeadIssue[];
  onMaximize: () => void;
}

interface Dot {
  color: string;
  glow: string;
  count: number;
  label: string;
}

export function TelemetryStrip({ issues, onMaximize }: TelemetryStripProps) {
  const tasks = issues.filter((i) => i.issue_type !== 'epic');
  const blocked = tasks.filter((i) => i.status === 'blocked').length;
  const active = tasks.filter((i) => i.status === 'in_progress').length;
  const ready = tasks.filter((i) => i.status === 'open').length;
  const done = tasks.filter((i) => i.status === 'closed').length;

  const dots: Dot[] = [
    { color: 'var(--accent-danger)', glow: 'rgba(255,76,114,0.4)', count: blocked, label: 'blocked' },
    { color: 'var(--accent-warning)', glow: 'rgba(255,178,74,0.4)', count: active, label: 'active' },
    { color: 'var(--accent-success)', glow: 'rgba(53,217,143,0.4)', count: ready, label: 'ready' },
    { color: 'var(--text-tertiary)', glow: 'transparent', count: done, label: 'done' },
  ];

  return (
    <div className="flex h-full w-9 flex-shrink-0 flex-col items-center border-l border-[var(--border-subtle)] bg-[var(--surface-primary)] py-2">
      <button
        type="button"
        onClick={onMaximize}
        className="mb-3 rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)]"
        title="Restore live feed"
        aria-label="Restore live feed"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-col items-center gap-3">
        {dots.map((dot) => (
          <div key={dot.label} className="flex flex-col items-center gap-0.5" title={`${dot.count} ${dot.label}`}>
            <span
              className="h-2.5 w-2.5 rounded-full transition-all"
              style={{
                backgroundColor: dot.color,
                boxShadow: dot.count > 0 ? `0 0 6px 1px ${dot.glow}` : 'none',
                opacity: dot.count > 0 ? 1 : 0.25,
              }}
            />
            <span className="font-mono text-[8px] text-[var(--text-tertiary)]">{dot.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
