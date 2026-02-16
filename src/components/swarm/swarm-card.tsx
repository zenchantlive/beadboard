'use client';

import type { SwarmCard as SwarmCardType, AgentRoster } from '../../lib/swarm-cards';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { AgentAvatar } from '../shared/agent-avatar';
import { cn } from '../../lib/utils';
import { Plus, Menu, Diamond, Waves, AlertTriangle } from 'lucide-react';

interface SwarmCardProps {
  card: SwarmCardType;
  onExpand?: () => void;
  onMenu?: () => void;
  onGraph?: () => void;
  onTimeline?: () => void;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'just now';
}

const HEALTH_COLORS: Record<string, string> = {
  active: 'text-emerald-400',
  stale: 'text-amber-400',
  stuck: 'text-rose-400',
  dead: 'text-red-500',
};

function AgentRosterRow({ agent }: { agent: AgentRoster }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className="font-mono text-slate-500">{agent.name}:</span>
      <span className="truncate">{agent.currentTask || 'idle'}</span>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const filled = Math.round(progress / 10);
  const empty = 10 - filled;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 font-mono text-xs">
        {'█'.repeat(filled)}
        {'░'.repeat(empty)}
      </div>
      <span className="text-xs text-slate-400">{progress}% done</span>
    </div>
  );
}

function AttentionList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
        ATTENTION:
      </span>
      {items.slice(0, 3).map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-amber-200/80">
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          <span className="truncate">{item}</span>
        </div>
      ))}
    </div>
  );
}

export function SwarmCard({ card, onExpand, onMenu, onGraph, onTimeline }: SwarmCardProps) {
  const activeAgents = card.agents.filter((a) => a.status === 'active');
  const otherAgents = card.agents.filter((a) => a.status !== 'active');

  return (
    <Card className="rounded-xl border border-white/[0.06] bg-[#363636] px-3.5 py-3 shadow-[0_18px_38px_-18px_rgba(0,0,0,0.82),0_6px_18px_-10px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-200 hover:shadow-[0_24px_52px_-16px_rgba(0,0,0,0.9),0_10px_26px_-10px_rgba(0,0,0,0.78)]">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-slate-200">
                {card.swarmId}
              </span>
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0 border-slate-600', HEALTH_COLORS[card.health])}
              >
                {card.health}
              </Badge>
            </div>
            <span className="text-sm text-slate-400 line-clamp-1">{card.title}</span>
          </div>
          <button
            onClick={onExpand}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            aria-label="Expand"
          >
            <Plus className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            AGENTS:
          </span>
          <div className="flex items-center gap-1 -space-x-1">
            {activeAgents.slice(0, 4).map((agent) => (
              <AgentAvatar key={agent.name} name={agent.name} status={agent.status} size="sm" />
            ))}
            {otherAgents.slice(0, 2).map((agent) => (
              <AgentAvatar key={agent.name} name={agent.name} status={agent.status} size="sm" />
            ))}
            {card.agents.length > 6 && (
              <span className="text-xs text-slate-500 ml-2">+{card.agents.length - 6}</span>
            )}
          </div>
        </div>

        {card.agents.filter((a) => a.currentTask).slice(0, 2).map((agent) => (
          <AgentRosterRow key={agent.name} agent={agent} />
        ))}

        <AttentionList items={card.attentionItems} />

        <ProgressBar progress={card.progress} />

        {card.lastActivity && (
          <div className="text-xs text-slate-500 italic truncate">
            Last activity {formatTimeAgo(card.lastActivity)}
          </div>
        )}

        <div className="flex items-center justify-end gap-1 pt-1 border-t border-white/[0.04]">
          <button
            onClick={onMenu}
            className="p-1.5 rounded hover:bg-white/5 transition-colors"
            aria-label="Menu"
          >
            <Menu className="h-3.5 w-3.5 text-slate-500" />
          </button>
          <button
            onClick={onGraph}
            className="p-1.5 rounded hover:bg-white/5 transition-colors"
            aria-label="Graph view"
          >
            <Diamond className="h-3.5 w-3.5 text-slate-500" />
          </button>
          <button
            onClick={onTimeline}
            className="p-1.5 rounded hover:bg-white/5 transition-colors"
            aria-label="Timeline view"
          >
            <Waves className="h-3.5 w-3.5 text-slate-500" />
          </button>
        </div>
      </div>
    </Card>
  );
}
