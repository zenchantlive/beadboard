'use client';

import { KANBAN_STATUSES } from '../../lib/kanban';
import type { BeadIssue } from '../../lib/types';

import { KanbanCard } from './kanban-card';

interface KanbanBoardProps {
  columns: Record<(typeof KANBAN_STATUSES)[number], BeadIssue[]>;
  selectedIssueId: string | null;
  onSelect: (issue: BeadIssue) => void;
}

export function KanbanBoard({ columns, selectedIssueId, onSelect }: KanbanBoardProps) {
  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))',
        gap: '0.8rem',
        overflowX: 'auto',
      }}
    >
      {KANBAN_STATUSES.map((status) => (
        <div key={status} style={{ background: '#edf2f7', borderRadius: 14, padding: '0.65rem', minHeight: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
            <strong style={{ fontSize: '0.85rem', color: '#1f2937' }}>{status}</strong>
            <span style={{ fontSize: '0.8rem', color: '#475569' }}>{columns[status].length}</span>
          </div>
          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {columns[status].map((issue) => (
              <KanbanCard key={issue.id} issue={issue} selected={selectedIssueId === issue.id} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
