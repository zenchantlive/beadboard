'use client';

import type { SocialCard as SocialCardData, AgentStatus } from '../../lib/social-cards';
import { StatusBadge } from '../shared/status-badge';
import { AgentAvatar } from '../shared/agent-avatar';
import { Plus } from 'lucide-react';

interface SocialDetailProps {
  data: SocialCardData;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function SocialDetail({ data }: SocialDetailProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-teal-400 font-mono text-sm font-medium">
          {data.id}
        </span>
        <h2 className="text-text-primary font-semibold text-base leading-tight">
          {data.title}
        </h2>
        <StatusBadge status={data.status} size="sm" />
      </div>

      <div className="space-y-1">
        <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider">
          Thread
        </h3>
        <p className="text-text-muted text-sm italic">
          Thread placeholder (bb-ui2.13)
        </p>
      </div>

      {data.blocks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-amber-400 text-xs font-semibold uppercase tracking-wider">
            Blocks
          </h3>
          <ul className="space-y-1">
            {data.blocks.map((id) => (
              <li key={id} className="text-text-secondary text-sm font-mono">
                {id}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.unlocks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            Unlocks
          </h3>
          <ul className="space-y-1">
            {data.unlocks.map((id) => (
              <li key={id} className="text-text-secondary text-sm font-mono">
                {id}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider">
          Assigned
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {data.agents.length > 0 ? (
            data.agents.map((agent) => (
              <AgentAvatar
                key={agent.name}
                name={agent.name}
                status={agent.status as AgentStatus}
                size="sm"
              />
            ))
          ) : (
            <span className="text-text-muted text-sm">No agents</span>
          )}
          <button
            type="button"
            className="p-1.5 rounded-md border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors"
            aria-label="Add agent"
          >
            <Plus size={14} className="text-text-muted" />
          </button>
        </div>
      </div>

      <div className="space-y-1 pt-2 border-t border-white/10">
        <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider">
          Last Activity
        </h3>
        <p className="text-text-secondary text-sm">
          {formatRelativeTime(data.lastActivity)}
        </p>
      </div>
    </div>
  );
}
