'use client';

import type { BeadIssue } from '../../lib/types';

import { Chip } from '../shared/chip';

interface KanbanCardProps {
  issue: BeadIssue;
  selected: boolean;
  onSelect: (issue: BeadIssue) => void;
}

export function KanbanCard({ issue, selected, onSelect }: KanbanCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(issue)}
      style={{
        width: '100%',
        textAlign: 'left',
        border: selected ? '2px solid #0f766e' : '1px solid #d7dee8',
        borderRadius: 12,
        padding: '0.7rem',
        background: '#ffffff',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: '0.74rem', color: '#5e6b7a' }}>{issue.id}</div>
      <div style={{ fontWeight: 700, color: '#0f1720', margin: '0.15rem 0 0.5rem' }}>{issue.title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.45rem' }}>
        <Chip>P{issue.priority}</Chip>
        <Chip>{issue.issue_type}</Chip>
        <Chip>deps {issue.dependencies.length}</Chip>
      </div>
      <div style={{ fontSize: '0.8rem', color: '#314152' }}>
        {issue.assignee ? `@${issue.assignee}` : 'unassigned'}
      </div>
      {issue.labels.length > 0 ? (
        <div style={{ marginTop: '0.45rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {issue.labels.slice(0, 3).map((label) => (
            <Chip key={`${issue.id}-${label}`}>#{label}</Chip>
          ))}
        </div>
      ) : null}
    </button>
  );
}
