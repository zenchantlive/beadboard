'use client';

import type { SwarmCard as SwarmCardType } from '../../lib/swarm-cards';
import { Badge } from '../../../components/ui/badge';
import { AgentAvatar } from '../shared/agent-avatar';
import { cn } from '../../lib/utils';
import { AlertTriangle, Clock, Users } from 'lucide-react';

interface SwarmDetailProps {
  card: SwarmCardType;
}

const HEALTH_COLORS: Record<string, string> = {
  active: 'border-emerald-500/50 text-emerald-400',
  stale: 'border-amber-500/50 text-amber-400',
  stuck: 'border-rose-500/50 text-rose-400',
  dead: 'border-red-600/50 text-red-500',
};

const STATUS_GLOW: Record<string, string> = {
  active: 'shadow-[0_0_8px_rgba(52,211,153,0.5)]',
  stale: 'shadow-[0_0_8px_rgba(251,191,36,0.4)]',
  stuck: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  dead: 'shadow-[0_0_8px_rgba(220,38,38,0.6)]',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  return 'just now';
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--color-text-muted)' }}>Progress</span>
        <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
          {progress}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-elevated)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor:
              progress >= 80
                ? 'var(--color-success)'
                : progress >= 50
                  ? 'var(--color-warning)'
                  : 'var(--color-error)',
          }}
        />
      </div>
    </div>
  );
}

function AgentRosterSection({ agents }: { agents: SwarmCardType['agents'] }) {
  const active = agents.filter((a) => a.status === 'active').length;
  const stale = agents.filter((a) => a.status === 'stale').length;
  const stuck = agents.filter((a) => a.status === 'stuck').length;
  const dead = agents.filter((a) => a.status === 'dead').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Agents ({agents.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md border',
              STATUS_GLOW[agent.status]
            )}
            style={{ backgroundColor: 'var(--color-bg-elevated)' }}
          >
            <AgentAvatar name={agent.name} status={agent.status} size="sm" />
            <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
              {agent.name}
            </span>
          </div>
        ))}
      </div>
      {(active > 0 || stale > 0 || stuck > 0 || dead > 0) && (
        <div className="flex gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {active > 0 && <span className="text-emerald-400">{active} active</span>}
          {stale > 0 && <span className="text-amber-400">{stale} stale</span>}
          {stuck > 0 && <span className="text-rose-400">{stuck} stuck</span>}
          {dead > 0 && <span className="text-red-500">{dead} dead</span>}
        </div>
      )}
    </div>
  );
}

function AttentionSection({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Attention ({items.length})
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-1.5 p-2 rounded-md"
            style={{ backgroundColor: 'var(--color-bg-elevated)' }}
          >
            <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LastActivitySection({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
      <Clock className="h-3.5 w-3.5" />
      <span>Last activity {formatRelativeTime(date)}</span>
    </div>
  );
}

function ThreadSection() {
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Thread
      </span>
      <p className="text-text-muted text-sm italic">
        Thread drawer coming (bb-ui2.31)
      </p>
    </div>
  );
}

export function SwarmDetail({ card }: SwarmDetailProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {card.swarmId}
          </span>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0', HEALTH_COLORS[card.health])}
          >
            {card.health}
          </Badge>
        </div>
        <h3 className="text-sm font-medium line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
          {card.title}
        </h3>
      </div>

      {/* Progress */}
      <ProgressBar progress={card.progress} />

      {/* Agent Roster */}
      <AgentRosterSection agents={card.agents} />

      {/* Attention Items */}
      <AttentionSection items={card.attentionItems} />

      {/* Last Activity */}
      <LastActivitySection date={card.lastActivity} />

      {/* Thread */}
      <ThreadSection />
    </div>
  );
}
