'use client';

import { motion } from 'framer-motion';
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
    <main className="mx-auto min-h-screen max-w-[1680px] px-4 py-4 sm:px-6 sm:py-6">
      <header className="mb-4 rounded-2xl border border-border-soft bg-surface/70 px-4 py-4 backdrop-blur md:px-5">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-200/80">BeadBoard</p>
        <h1 className="mt-1 text-2xl font-semibold text-text-strong sm:text-3xl">Kanban Dashboard</h1>
        <p className="mt-2 text-sm text-text-muted">Tracer Bullet 1 from live `.beads/issues.jsonl` on Windows-native paths.</p>
      </header>
      <KanbanControls filters={filters} stats={stats} onFiltersChange={setFilters} />
      <section className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <motion.div layout className="overflow-x-auto rounded-2xl border border-border-soft bg-surface/55 p-2">
          <KanbanBoard
            columns={columns}
            selectedIssueId={selectedIssue?.id ?? null}
            onSelect={(issue) => setSelectedIssueId(issue.id)}
          />
        </motion.div>
        <div className="xl:sticky xl:top-4 xl:self-start">
          <KanbanDetail issue={selectedIssue} />
        </div>
      </section>
    </main>
  );
}
