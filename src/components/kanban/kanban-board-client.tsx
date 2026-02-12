'use client';

import { useMemo, useState } from 'react';

import {
  KANBAN_STATUSES,
  buildKanbanColumns,
  buildKanbanStats,
  filterKanbanIssues,
  type KanbanStatus,
} from '../../lib/kanban';
import type { BeadIssue } from '../../lib/types';

const STATUS_LABELS: Record<KanbanStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  deferred: 'Deferred',
  closed: 'Done',
};

const STATUS_COLORS: Record<KanbanStatus, string> = {
  open: '#3b82f6',
  in_progress: '#f59e0b',
  blocked: '#ef4444',
  deferred: '#6b7280',
  closed: '#22c55e',
};

function formatDate(value: string | null): string {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

export function KanbanBoardClient({ issues, sourcePath }: { issues: BeadIssue[]; sourcePath: string }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [priority, setPriority] = useState('all');
  const [showClosed, setShowClosed] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<BeadIssue | null>(null);

  const filteredIssues = useMemo(
    () => filterKanbanIssues(issues, { query, type, priority, showClosed }),
    [issues, query, type, priority, showClosed],
  );

  const columns = useMemo(() => buildKanbanColumns(filteredIssues), [filteredIssues]);
  const stats = useMemo(() => buildKanbanStats(filteredIssues), [filteredIssues]);
  const visibleStatuses = showClosed ? KANBAN_STATUSES : KANBAN_STATUSES.filter((status) => status !== 'closed');
  const issueTypes = useMemo(
    () => ['all', ...Array.from(new Set(issues.map((issue) => issue.issue_type))).sort()],
    [issues],
  );

  return (
    <main style={{ background: '#0b1020', color: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <header style={{ padding: 16, borderBottom: '1px solid rgba(148,163,184,0.3)', position: 'sticky', top: 0, background: '#0b1020', zIndex: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>BeadBoard</h1>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Source: {sourcePath}</div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search beads" style={{ padding: '6px 8px' }} />
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '6px 8px' }}>
            {issueTypes.map((issueType) => (
              <option key={issueType} value={issueType}>
                {issueType === 'all' ? 'All types' : issueType}
              </option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ padding: '6px 8px' }}>
            <option value="all">All priorities</option>
            <option value="0">P0</option>
            <option value="1">P1</option>
            <option value="2">P2</option>
            <option value="3">P3</option>
            <option value="4">P4</option>
          </select>
          <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            Show closed
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: '#cbd5e1', flexWrap: 'wrap' }}>
          <span>Total {stats.total}</span>
          <span>Open {stats.open}</span>
          <span>Active {stats.active}</span>
          <span>Blocked {stats.blocked}</span>
          <span>Done {stats.done}</span>
          <span>P0 {stats.p0}</span>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleStatuses.length}, minmax(220px, 1fr))`, gap: 8, padding: 12 }}>
        {visibleStatuses.map((status) => (
          <div key={status} style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 8, padding: 8, minHeight: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong style={{ color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</strong>
              <span style={{ fontSize: 12, color: '#cbd5e1' }}>{columns[status].length}</span>
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              {columns[status].map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => setSelectedIssue(issue)}
                  style={{
                    textAlign: 'left',
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid rgba(148,163,184,0.25)',
                    background: 'rgba(15,23,42,0.8)',
                    color: '#f8fafc',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: 'Consolas, monospace', fontSize: 11, color: '#94a3b8' }}>{issue.id}</span>
                    <span style={{ fontSize: 11 }}>P{issue.priority}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>{issue.title}</div>
                  <div style={{ marginTop: 6, fontSize: 11, color: '#cbd5e1' }}>
                    {issue.issue_type}
                    {issue.assignee ? ` · ${issue.assignee}` : ''}
                    {issue.dependencies.length ? ` · ${issue.dependencies.length} dep` : ''}
                  </div>
                  {issue.labels.length > 0 ? (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#7dd3fc' }}>{issue.labels.join(', ')}</div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {selectedIssue ? (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)' }} onClick={() => setSelectedIssue(null)} />
          <aside style={{ position: 'fixed', top: 0, right: 0, width: 420, maxWidth: '100%', height: '100%', background: '#0f172a', borderLeft: '1px solid rgba(148,163,184,0.35)', padding: 16, overflowY: 'auto', zIndex: 30 }}>
            <button type="button" onClick={() => setSelectedIssue(null)} style={{ float: 'right' }}>
              Close
            </button>
            <h2 style={{ marginTop: 0 }}>{selectedIssue.title}</h2>
            <p style={{ fontFamily: 'Consolas, monospace', color: '#94a3b8' }}>{selectedIssue.id}</p>
            <p>Status: {selectedIssue.status}</p>
            <p>Priority: P{selectedIssue.priority}</p>
            <p>Type: {selectedIssue.issue_type}</p>
            <p>Assignee: {selectedIssue.assignee ?? 'Unassigned'}</p>
            <p>Created: {formatDate(selectedIssue.created_at)}</p>
            <p>Updated: {formatDate(selectedIssue.updated_at)}</p>
            <p>Closed: {formatDate(selectedIssue.closed_at)}</p>
            <p>Description: {selectedIssue.description ?? 'None'}</p>
            <p>Labels: {selectedIssue.labels.join(', ') || 'None'}</p>
            <p>Dependencies:</p>
            <ul>
              {selectedIssue.dependencies.length === 0 ? <li>None</li> : null}
              {selectedIssue.dependencies.map((dep) => (
                <li key={`${dep.type}:${dep.target}`}>
                  {dep.type} - {dep.target}
                </li>
              ))}
            </ul>
          </aside>
        </>
      ) : null}
    </main>
  );
}
