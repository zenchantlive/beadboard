'use client';

import { motion } from 'framer-motion';

import type { KanbanFilterOptions, KanbanStats } from '../../lib/kanban';

import { StatPill } from '../shared/stat-pill';

interface KanbanControlsProps {
  filters: KanbanFilterOptions;
  stats: KanbanStats;
  onFiltersChange: (filters: KanbanFilterOptions) => void;
}

export function KanbanControls({ filters, stats, onFiltersChange }: KanbanControlsProps) {
  const inputClass =
    'rounded-xl border border-border-soft bg-surface-muted/65 px-3 py-2 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/25';

  return (
    <section className="grid gap-3">
      <motion.div layout className="flex flex-wrap gap-2.5">
        <input
          type="search"
          value={filters.query ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          placeholder="Search by id/title/labels"
          className={`${inputClass} min-w-60 flex-1`}
        />
        <select
          value={filters.type ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, type: event.target.value })}
          className={`${inputClass} w-40`}
          aria-label="Type filter"
        >
          <option value="">All types</option>
          <option value="task">Task</option>
          <option value="bug">Bug</option>
          <option value="feature">Feature</option>
          <option value="epic">Epic</option>
          <option value="chore">Chore</option>
        </select>
        <select
          value={filters.priority ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, priority: event.target.value })}
          className={`${inputClass} w-32`}
          aria-label="Priority filter"
        >
          <option value="">All priorities</option>
          <option value="0">P0</option>
          <option value="1">P1</option>
          <option value="2">P2</option>
          <option value="3">P3</option>
          <option value="4">P4</option>
        </select>
        <label className="inline-flex items-center gap-2 rounded-xl border border-border-soft bg-surface-muted/60 px-3 py-2 text-sm text-text-body">
          <input
            type="checkbox"
            checked={filters.showClosed ?? false}
            onChange={(event) => onFiltersChange({ ...filters, showClosed: event.target.checked })}
            className="h-4 w-4 accent-cyan-400"
          />
          Show closed
        </label>
      </motion.div>
      <motion.div layout className="flex flex-wrap gap-2">
        <StatPill label="Total" value={stats.total} />
        <StatPill label="Open" value={stats.open} />
        <StatPill label="Active" value={stats.active} />
        <StatPill label="Blocked" value={stats.blocked} />
        <StatPill label="Done" value={stats.done} />
        <StatPill label="P0" value={stats.p0} tone={stats.p0 > 0 ? 'critical' : 'default'} />
      </motion.div>
    </section>
  );
}
