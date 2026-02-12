'use client';

import type { BeadIssue } from '../../lib/types';

import { Chip } from '../shared/chip';

interface KanbanDetailProps {
  issue: BeadIssue | null;
}

export function KanbanDetail({ issue }: KanbanDetailProps) {
  if (!issue) {
    return (
      <aside style={{ border: '1px solid #d7dee8', borderRadius: 14, padding: '0.9rem', background: '#ffffff' }}>
        <strong style={{ color: '#0f1720' }}>Details</strong>
        <p style={{ color: '#475569' }}>Select a card to inspect full issue details.</p>
      </aside>
    );
  }

  return (
    <aside style={{ border: '1px solid #d7dee8', borderRadius: 14, padding: '0.9rem', background: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '0.76rem', color: '#475569' }}>{issue.id}</div>
          <h2 style={{ margin: '0.1rem 0 0.3rem', fontSize: '1.2rem', color: '#0f1720' }}>{issue.title}</h2>
        </div>
        <Chip>{issue.status}</Chip>
      </div>
      {issue.description ? <p style={{ color: '#334155' }}>{issue.description}</p> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
        <Chip>priority {issue.priority}</Chip>
        <Chip>{issue.issue_type}</Chip>
        <Chip>{issue.assignee ? `@${issue.assignee}` : 'unassigned'}</Chip>
        <Chip>{issue.dependencies.length} dependencies</Chip>
      </div>
      <div style={{ fontSize: '0.84rem', color: '#334155' }}>
        <div><strong>Created:</strong> {issue.created_at || '-'}</div>
        <div><strong>Updated:</strong> {issue.updated_at || '-'}</div>
      </div>
      {issue.labels.length > 0 ? (
        <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {issue.labels.map((label) => (
            <Chip key={`${issue.id}-${label}`}>#{label}</Chip>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
