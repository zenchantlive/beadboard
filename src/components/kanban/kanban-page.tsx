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
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const filteredIssues = useMemo(() => filterKanbanIssues(issues, filters), [issues, filters]);
  const columns = useMemo(() => buildKanbanColumns(filteredIssues), [filteredIssues]);
  const stats = useMemo(() => buildKanbanStats(filteredIssues), [filteredIssues]);

  const selectedIssue = useMemo(
    () => filteredIssues.find((issue) => issue.id === selectedIssueId) ?? filteredIssues[0] ?? null,
    [filteredIssues, selectedIssueId],
  );

  return (
    <main className="mx-auto min-h-screen max-w-[1800px] px-4 py-4 sm:px-6 sm:py-6">
      <header className="mb-4 rounded-2xl border border-border-soft bg-surface/90 px-4 py-4 shadow-card backdrop-blur md:px-5">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-100/80">BeadBoard</p>
        <h1 className="mt-1 text-2xl font-semibold text-text-strong sm:text-3xl">Kanban Dashboard</h1>
        <p className="mt-2 text-sm text-text-muted">Tracer Bullet 1 from live `.beads/issues.jsonl` on Windows-native paths.</p>
      </header>
      <KanbanControls filters={filters} stats={stats} onFiltersChange={setFilters} />
      <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]">
        <motion.div layout className="overflow-x-auto rounded-2xl border border-border-soft bg-surface/80 p-2.5 shadow-card">
          <KanbanBoard
            columns={columns}
            selectedIssueId={selectedIssue?.id ?? null}
            onSelect={(issue) => {
              setSelectedIssueId(issue.id);
              setMobileDetailOpen(true);
            }}
          />
        </motion.div>
        <div className="hidden lg:sticky lg:top-4 lg:block lg:self-start">
          <KanbanDetail issue={selectedIssue} />
        </div>
      </section>

      {mobileDetailOpen && selectedIssue ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close details"
            onClick={() => setMobileDetailOpen(false)}
          />
          <motion.div
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 36, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-x-3 bottom-3 top-20 overflow-y-auto rounded-2xl border border-border-soft bg-surface/95 p-3 shadow-panel"
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="rounded-lg border border-border-soft bg-surface-muted/70 px-3 py-1 text-xs font-semibold text-text-body"
              >
                Close
              </button>
            </div>
            <KanbanDetail issue={selectedIssue} framed={false} />
          </motion.div>
        </div>
      ) : null}
    </main>
  );
}
