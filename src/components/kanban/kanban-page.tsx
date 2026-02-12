'use client';

import { useMemo, useState } from 'react';

import type { KanbanFilterOptions } from '../../lib/kanban';
import { buildKanbanColumns, buildKanbanStats, filterKanbanIssues } from '../../lib/kanban';
import type { BeadIssue } from '../../lib/types';

import { KanbanBoard } from './kanban-board';
import { KanbanControls } from './kanban-controls';
import { KanbanDetail } from './kanban-detail';

interface KanbanPageProps {
  issues: BeadIssue[];
}

export function KanbanPage({ issues }: KanbanPageProps) {
  const [filters, setFilters] = useState<KanbanFilterOptions>({
    query: '',
    type: '',
    priority: '',
    showClosed: false,
  });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(issues[0]?.id ?? null);

  const filteredIssues = useMemo(() => filterKanbanIssues(issues, filters), [issues, filters]);
  const columns = useMemo(() => buildKanbanColumns(filteredIssues), [filteredIssues]);
  const stats = useMemo(() => buildKanbanStats(filteredIssues), [filteredIssues]);

  const selectedIssue = useMemo(
    () => filteredIssues.find((issue) => issue.id === selectedIssueId) ?? filteredIssues[0] ?? null,
    [filteredIssues, selectedIssueId],
  );

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '1.2rem',
        background: 'linear-gradient(140deg, #f8fafc, #edf3f7 50%, #f8fbf9)',
        color: '#0f1720',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
      }}
    >
      <header style={{ marginBottom: '0.9rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.9rem' }}>BeadBoard Kanban</h1>
        <p style={{ margin: '0.35rem 0 0', color: '#475569' }}>Tracer Bullet 1 baseline from live `.beads/issues.jsonl`</p>
      </header>
      <KanbanControls filters={filters} stats={stats} onFiltersChange={setFilters} />
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '0.9rem', marginTop: '0.9rem' }}>
        <KanbanBoard
          columns={columns}
          selectedIssueId={selectedIssue?.id ?? null}
          onSelect={(issue) => setSelectedIssueId(issue.id)}
        />
        <KanbanDetail issue={selectedIssue} />
      </section>
    </main>
  );
}
