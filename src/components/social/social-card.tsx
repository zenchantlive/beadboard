import type { MouseEventHandler } from 'react';
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
}

type StatusTone = {
  accent: string;
  glow: string;
  badgeClass: string;
  surface: string;
  accentChip: string;
};

const STATUS_TONES: Record<SocialCardData['status'], StatusTone> = {
  ready: {
    accent: '#7CB97A',
    glow: 'rgba(124,185,122,0.26)',
    badgeClass: 'bg-[#7CB97A]/26 text-[#DCEED8] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]',
    surface:
      'radial-gradient(circle at 80% 78%, rgba(124,185,122,0.46), transparent 76%), radial-gradient(circle at 8% 6%, rgba(124,185,122,0.26), transparent 68%), linear-gradient(145deg, rgba(45,78,45,0.99), rgba(35,62,35,0.99))',
    accentChip: 'bg-[#7CB97A]/18 text-[#D2E4CE] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]',
  },
  in_progress: {
    accent: '#D4A574',
    glow: 'rgba(212,165,116,0.28)',
    badgeClass: 'bg-[#D4A574]/28 text-[#EED9C1] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]',
    surface:
      'radial-gradient(circle at 80% 78%, rgba(212,165,116,0.48), transparent 76%), radial-gradient(circle at 8% 6%, rgba(212,165,116,0.28), transparent 68%), linear-gradient(145deg, rgba(86,64,40,0.99), rgba(68,49,30,0.99))',
    accentChip: 'bg-[#D4A574]/20 text-[#E0C6A7] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]',
  },
  blocked: {
    accent: '#C97A7A',
    glow: 'rgba(201,122,122,0.26)',
    badgeClass: 'bg-[#C97A7A]/28 text-[#EDD3D3] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]',
    surface:
      'radial-gradient(circle at 80% 78%, rgba(201,122,122,0.46), transparent 76%), radial-gradient(circle at 8% 6%, rgba(201,122,122,0.27), transparent 68%), linear-gradient(145deg, rgba(76,46,46,0.99), rgba(60,36,36,0.99))',
    accentChip: 'bg-[#C97A7A]/18 text-[#E1C0C0] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]',
  },
  closed: {
    accent: 'var(--status-closed)',
    glow: 'rgba(136,136,136,0.16)',
    badgeClass: 'bg-[#888888]/26 text-[#CECECE] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]',
    surface:
      'radial-gradient(circle at 80% 78%, rgba(136,136,136,0.32), transparent 76%), radial-gradient(circle at 8% 6%, rgba(136,136,136,0.16), transparent 68%), linear-gradient(145deg, rgba(56,56,56,0.99), rgba(44,44,44,0.99))',
    accentChip: 'bg-[#888888]/16 text-[#BEBEBE] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]',
  },
};

function renderDependencyPreview(ids: string[], toneClass: string, label: string) {
  if (ids.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0 rounded-lg bg-black/20 px-2 py-1.5 shadow-[0_10px_18px_-14px_rgba(0,0,0,0.85)]">
      <p className={cn('mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]', toneClass)}>{label}</p>
      <div className="flex flex-wrap gap-1">
        {ids.slice(0, 2).map((id) => (
          <span key={id} className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#DCDCDC] shadow-[0_8px_12px_-12px_rgba(0,0,0,0.88)]">
            {id}
          </span>
        ))}
        {ids.length > 2 ? <span className="text-[10px] text-[#8E8E8E]">+{ids.length - 2}</span> : null}
      </div>
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
}: SocialCardProps) {
  const tone = STATUS_TONES[data.status];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={cn(
        'group relative flex h-full min-h-[18rem] cursor-pointer flex-col rounded-2xl px-4 py-4 text-left transition-all duration-200 ease-out',
        'hover:-translate-y-0.5',
        selected && 'translate-y-[-2px]',
        className,
      )}
      style={{
        background: tone.surface,
        boxShadow: selected
          ? `0 24px 50px -18px ${tone.glow}, 0 10px 24px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.12)`
          : `0 12px 24px -20px ${tone.glow}, 0 6px 14px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[4px]" style={{ backgroundColor: tone.accent }} />
      <div
        className="pointer-events-none absolute right-3 top-3 h-10 w-10 rounded-full blur-xl"
        style={{ backgroundColor: tone.glow }}
      />
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-[11px] text-[#A8D0CB]">{data.id}</span>
          {unreadCount > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E24A3A] px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', tone.badgeClass)}>
            {data.status.replace('_', ' ')}
          </Badge>
          <Badge className="rounded-full bg-black/25 px-2 py-0.5 font-mono text-[10px] text-[#D0D0D0] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]">
            {data.priority}
          </Badge>
        </div>
      </div>

      <h3 className="line-clamp-2 text-[1.7rem] font-semibold leading-[1.1] tracking-[-0.02em] text-white">
        {data.title}
      </h3>

      <p className="mt-2 line-clamp-2 min-h-[2.6rem] text-sm leading-relaxed text-[#B8B8B8]">
        {description || 'No summary provided yet.'}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#D4A574]/28 px-2 py-0.5 text-[10px] font-semibold text-[#F5DFC2] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.82)]">
          {data.blocks.length} blocking
        </span>
        <span className="rounded-full bg-[#E57373]/24 px-2 py-0.5 text-[10px] font-semibold text-[#F3C2C2] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.82)]">
          {data.unblocks.length} blocked by
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {renderDependencyPreview(data.unblocks, 'text-[#D4A574]', 'Blocked By')}
        {renderDependencyPreview(data.blocks, 'text-[#5BA8A0]', 'Unblocks')}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="space-y-1.5 text-xs text-[#9A9A9A]">
          <p className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{updatedLabel}</p>
          <div className="flex items-center gap-3">
            <p className="inline-flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />{dependencyCount ?? data.blocks.length + data.unblocks.length}</p>
            <p className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{commentCount ?? 0}</p>
          </div>
        </div>

        <div className="flex items-center -space-x-2">
          {data.agents.slice(0, 4).map((agent) => (
            <div key={`${data.id}-${agent.name}`} className="rounded-full ring-2 ring-[#2C2C2C]">
              <AgentAvatar
                name={agent.name}
                status={agent.status as AgentStatus}
                role={agent.role}
                size="sm"
              />
            </div>
          ))}
          {data.agents.length === 0 ? <span className="text-xs text-[#808080]">No crew</span> : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 pt-2 shadow-[inset_0_10px_12px_-14px_rgba(0,0,0,0.88)]">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onJumpToGraph?.(data.id);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#5BA8A0]/24 text-[#AFE2DC] shadow-[0_10px_16px_-12px_rgba(0,0,0,0.8)] transition-colors hover:bg-[#5BA8A0]/36"
          title="Jump to graph view"
        >
          <GitBranch className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onJumpToActivity?.(data.id);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#D4A574]/24 text-[#E8D0B3] shadow-[0_10px_16px_-12px_rgba(0,0,0,0.8)] transition-colors hover:bg-[#D4A574]/36"
          title="Jump to activity view"
        >
          <Orbit className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenThread?.();
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#7CB97A]/24 text-[#D2EACF] shadow-[0_10px_16px_-12px_rgba(0,0,0,0.8)] transition-colors hover:bg-[#7CB97A]/36"
          title="Open thread"
        >
          <Activity className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
