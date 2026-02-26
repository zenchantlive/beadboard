import type { KeyboardEvent, MouseEventHandler } from 'react';
import { Activity, Clock3, GitBranch, Link2, MessageCircle, Orbit } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { SocialCard as SocialCardData, AgentStatus } from '../../lib/social-cards';
import { AgentAvatar } from '../shared/agent-avatar';

interface SocialCardProps {
  data: SocialCardData;
  className?: string;
  selected?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onJumpToGraph?: (id: string) => void;
  onJumpToActivity?: (id: string) => void;
  onOpenThread?: () => void;
  description?: string;
  updatedLabel?: string;
  dependencyCount?: number;
  commentCount?: number;
  unreadCount?: number;
  blockedByDetails?: Array<{ id: string; title: string; epic?: string }>;
  unblocksDetails?: Array<{ id: string; title: string; epic?: string }>;
}

function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>, onClick?: MouseEventHandler<HTMLDivElement>) {
  if (!onClick) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onClick(event as unknown as Parameters<MouseEventHandler<HTMLDivElement>>[0]);
}

function statusVisual(status: SocialCardData['status']) {
  if (status === 'blocked') {
    return {
      border: '#ff4c72',
      badgeBg: 'rgba(255, 76, 114, 0.25)',
      badgeText: '#ffd5df',
      chipText: 'Blocked',
    };
  }

  if (status === 'in_progress') {
    return {
      border: '#ffb24a',
      badgeBg: 'rgba(255, 178, 74, 0.25)',
      badgeText: '#ffe5c7',
      chipText: 'Active',
    };
  }

  if (status === 'ready') {
    return {
      border: '#35d98f',
      badgeBg: 'rgba(53, 217, 143, 0.25)',
      badgeText: '#d6ffe7',
      chipText: 'Ready',
    };
  }

  return {
    border: 'var(--ui-border-strong)',
    badgeBg: 'rgba(168, 164, 154, 0.15)',
    badgeText: 'var(--ui-text-muted)',
    chipText: 'Closed',
  };
}

function dependencyPanel(
  title: string,
  color: string,
  details: Array<{ id: string; title: string; epic?: string }>,
) {
  if (details.length === 0) return null;

  return (
    <div className="rounded-md border border-[var(--ui-border-soft)] bg-[color-mix(in_srgb,var(--ui-bg-panel)_82%,black)] px-2.5 py-2">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color }}>
        {title}
      </p>
      <div className="space-y-1.5">
        {details.slice(0, 1).map((item) => (
          <div
            key={`${title}-${item.id}`}
            className="rounded border border-[var(--ui-border-soft)] bg-[color-mix(in_srgb,var(--ui-bg-card)_88%,black)] px-2 py-1.5"
          >
            <div className="mb-0.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent-info)]" />
              <span className="font-mono text-[10px] text-[var(--ui-text-muted)]">{item.id}</span>
            </div>
            <p className="line-clamp-1 text-xs text-[var(--ui-text-primary)]">{item.title}</p>
            {item.epic ? (
              <p className="line-clamp-1 text-[10px] text-[var(--ui-accent-info)]">↳ {item.epic}</p>
            ) : null}
          </div>
        ))}
      </div>
      {details.length > 1 ? <p className="mt-1 text-[11px] text-[var(--ui-text-muted)]">+{details.length - 1} more</p> : null}
    </div>
  );
}

export function SocialCard({
  data,
  className,
  selected = false,
  onClick,
  onJumpToGraph,
  onJumpToActivity,
  onOpenThread,
  description,
  updatedLabel = 'just now',
  dependencyCount,
  commentCount,
  unreadCount = 0,
  blockedByDetails = [],
  unblocksDetails = [],
}: SocialCardProps) {
  const status = statusVisual(data.status);

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => handleCardKeyDown(event, onClick)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${data.title}`}
      className={cn(
        'group relative flex min-h-[290px] cursor-pointer flex-col rounded-[14px] border px-3.5 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-info)]',
        className,
      )}
      style={{
        background: 'var(--ui-bg-card)',
        borderColor: selected ? status.border : 'var(--ui-border-strong)',
        boxShadow: selected
          ? `0 0 0 2px ${status.border}, 0 20px 40px -20px rgba(0,0,0,0.6)`
          : '0 4px 12px -6px rgba(0,0,0,0.4)',
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ backgroundColor: status.badgeBg, color: status.badgeText }}>
            {status.chipText}
          </Badge>
          <span className="font-mono text-[11px] text-[var(--ui-accent-info)]">{data.priority}</span>
          <span className="truncate font-mono text-[11px] text-[var(--ui-text-muted)]">{data.id}</span>
          {unreadCount > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ui-accent-action-red)] px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          ) : null}
        </div>
      </div>

      <h3 className="line-clamp-2 text-[27px] font-semibold leading-[1.13] tracking-[-0.01em] text-[var(--ui-text-primary)]">{data.title}</h3>
      <p className="mt-1.5 line-clamp-3 min-h-[56px] text-[13px] leading-relaxed text-[var(--ui-text-muted)]">
        {description || 'No summary provided yet.'}
      </p>

      <div className="mt-2 flex flex-col gap-2">
        {dependencyPanel('Blocked By', 'var(--ui-accent-blocked)', blockedByDetails)}
        {dependencyPanel('Unblocks', 'var(--ui-accent-ready)', unblocksDetails)}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {data.agents.slice(0, 3).map((agent) => (
          <AgentAvatar
            key={`${data.id}-${agent.name}`}
            name={agent.name}
            status={agent.status as AgentStatus}
            role={agent.role}
            size="sm"
          />
        ))}
        {data.agents.length === 0 ? <span className="text-xs text-[var(--ui-text-muted)]">No crew</span> : null}
      </div>

      <div className="mt-auto border-t border-[var(--ui-border-soft)] pt-1.5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--ui-text-muted)]">
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{updatedLabel}</span>
          <span className="font-mono text-[11px] text-[var(--ui-accent-ready)]">stage active</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[var(--ui-text-muted)]">
            <span className="inline-flex items-center gap-1"><Link2 className="h-3.5 w-3.5" aria-hidden="true" />{dependencyCount ?? data.blocks.length + data.unblocks.length}</span>
            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />{commentCount ?? 0}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onJumpToGraph?.(data.id);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] text-[var(--ui-accent-info)] transition-colors hover:bg-white/5"
              aria-label="Open in graph"
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onJumpToActivity?.(data.id);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] text-[var(--ui-accent-warning)] transition-colors hover:bg-white/5"
              aria-label="Open in activity"
            >
              <Orbit className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenThread?.();
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] text-[var(--ui-accent-ready)] transition-colors hover:bg-white/5"
              aria-label="Open thread"
            >
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
