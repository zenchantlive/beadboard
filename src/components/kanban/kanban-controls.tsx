'use client';

import type { KanbanFilterOptions, KanbanStats } from '../../lib/kanban';

import { StatPill } from '../shared/stat-pill';

interface KanbanControlsProps {
  filters: KanbanFilterOptions;
  stats: KanbanStats;
  onFiltersChange: (filters: KanbanFilterOptions) => void;
}

export function KanbanControls({ filters, stats, onFiltersChange }: KanbanControlsProps) {
  return (
    <section style={{ display: 'grid', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
        <input
          type="search"
          value={filters.query ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          placeholder="Search by id/title/labels"
          style={{ flex: 1, minWidth: 260, borderRadius: 10, border: '1px solid #cbd5e1', padding: '0.5rem 0.6rem' }}
        />
        <input
          type="text"
          value={filters.type ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, type: event.target.value })}
          placeholder="Type (task/bug/feature)"
          style={{ width: 190, borderRadius: 10, border: '1px solid #cbd5e1', padding: '0.5rem 0.6rem' }}
        />
        <input
          type="number"
          min={0}
          max={4}
          value={filters.priority ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, priority: event.target.value })}
          placeholder="Priority"
          style={{ width: 110, borderRadius: 10, border: '1px solid #cbd5e1', padding: '0.5rem 0.6rem' }}
        />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: '#334155', fontSize: '0.9rem' }}>
          <input
            type="checkbox"
            checked={filters.showClosed ?? false}
            onChange={(event) => onFiltersChange({ ...filters, showClosed: event.target.checked })}
          />
          Show closed
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
        <StatPill label="Total" value={stats.total} />
        <StatPill label="Open" value={stats.open} />
        <StatPill label="Active" value={stats.active} />
        <StatPill label="Blocked" value={stats.blocked} />
        <StatPill label="Done" value={stats.done} />
        <StatPill label="P0" value={stats.p0} />
      </div>
    </section>
  );
}
