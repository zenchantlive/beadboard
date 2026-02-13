'use client';

import { motion } from 'framer-motion';

import type { KanbanFilterOptions, KanbanStats } from '../../lib/kanban';
import type { BeadIssue } from '../../lib/types';

import { EpicChipStrip } from '../shared/epic-chip-strip';
import { StatPill } from '../shared/stat-pill';

interface KanbanControlsProps {
  filters: KanbanFilterOptions;
  stats: KanbanStats;
  epics: BeadIssue[];
  onFiltersChange: (filters: KanbanFilterOptions) => void;
  onNextActionable: () => void;
  nextActionableFeedback?: string | null;
}

export function KanbanControls({
  filters,
  stats,
  epics,
  onFiltersChange,
  onNextActionable,
  nextActionableFeedback = null,
}: KanbanControlsProps) {
  const inputClass =
    'ui-field rounded-xl px-3 py-2.5 text-sm outline-none transition';

  // Build bead counts map for EpicChipStrip
  const beadCounts = new Map<string, number>();
  for (const epic of epics) {
    // Count non-epic issues that belong to this epic
    const count = epic.dependencies?.filter(d => d.type === 'parent' && d.target === epic.id).length ?? 0;
    beadCounts.set(epic.id, count);
  }

  return (
    <section className="grid gap-3">
      {/* Epic selector - full width like /graph page */}
      <motion.div layout>
        <EpicChipStrip
          epics={epics.filter((epic) => (filters.showClosed ? true : epic.status !== 'closed'))}
          selectedEpicId={filters.epicId ?? null}
          beadCounts={beadCounts}
          onSelect={(epicId) => onFiltersChange({ ...filters, epicId: epicId || undefined })}
        />
      </motion.div>
      <motion.div layout className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={filters.query ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          placeholder="Search by id/title/labels"
          className={`${inputClass} w-full sm:min-w-[18rem] sm:flex-1`}
        />
        <select
          value={filters.type ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, type: event.target.value })}
          className={`${inputClass} ui-select w-full sm:w-44`}
          aria-label="Type filter"
        >
          <option className="ui-option" value="">All types</option>
          <option className="ui-option" value="task">Task</option>
          <option className="ui-option" value="bug">Bug</option>
          <option className="ui-option" value="feature">Feature</option>
          <option className="ui-option" value="epic">Epic</option>
          <option className="ui-option" value="chore">Chore</option>
        </select>
        <select
          value={filters.priority ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, priority: event.target.value })}
          className={`${inputClass} ui-select w-full sm:w-36`}
          aria-label="Priority filter"
        >
          <option className="ui-option" value="">All priorities</option>
          <option className="ui-option" value="0">P0</option>
          <option className="ui-option" value="1">P1</option>
          <option className="ui-option" value="2">P2</option>
          <option className="ui-option" value="3">P3</option>
          <option className="ui-option" value="4">P4</option>
        </select>
        <label className="ui-text inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-soft bg-gradient-to-b from-surface-muted/50 to-surface-muted/70 px-3 py-2 text-sm text-text-body sm:w-auto sm:justify-start shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          <input
            type="checkbox"
            checked={filters.showClosed ?? false}
            onChange={(event) => onFiltersChange({ ...filters, showClosed: event.target.checked })}
            className="h-4 w-4 accent-amber-400"
          />
          Show closed
        </label>
        <button
          type="button"
          onClick={onNextActionable}
          className="ui-text w-full rounded-xl border border-border-soft bg-gradient-to-b from-surface-muted/60 to-surface-muted/80 px-3 py-2 text-sm font-semibold text-text-body transition hover:from-surface-muted/75 hover:to-surface-muted/90 shadow-[0_1px_3px_rgba(0,0,0,0.1)] sm:w-auto"
        >
          Next Actionable
        </button>
      </motion.div>
      <motion.div layout className="flex flex-wrap gap-2">
        <StatPill label="Total" value={stats.total} />
        <StatPill label="Ready" value={stats.ready} />
        <StatPill label="Active" value={stats.active} />
        <StatPill label="Blocked" value={stats.blocked} />
        <StatPill label="Done" value={stats.done} />
        <StatPill label="P0" value={stats.p0} tone={stats.p0 > 0 ? 'critical' : 'default'} />
      </motion.div>
      {nextActionableFeedback ? <p className="ui-text text-xs text-text-muted">{nextActionableFeedback}</p> : null}
    </section>
  );
}
