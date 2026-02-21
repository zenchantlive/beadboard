'use client';

import type { SwarmCardData } from '../../lib/swarm-api';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../lib/utils';
import { CheckCircle2, PlayCircle, Clock, AlertCircle } from 'lucide-react';

interface SwarmCardProps {
  card: SwarmCardData;
}

function ProgressBar({ progress }: { progress: number }) {
  const filled = Math.round(progress / 10);
  const empty = 10 - filled;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 font-mono text-xs text-slate-300">
        {'█'.repeat(filled)}
        {'░'.repeat(empty)}
      </div>
      <span className="text-xs text-slate-400">{progress}%</span>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  open: 'text-emerald-400 border-emerald-400/30',
  closed: 'text-slate-400 border-slate-400/30',
  in_progress: 'text-amber-400 border-amber-400/30',
};

export function SwarmCard({ card }: SwarmCardProps) {
  return (
    <Card className="rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-card)] px-3.5 py-3 shadow-[0_18px_38px_-18px_rgba(0,0,0,0.82),0_6px_18px_-10px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.06)] transition-shadow duration-200 hover:shadow-[0_24px_52px_-16px_rgba(0,0,0,0.9),0_10px_26px_-10px_rgba(0,0,0,0.78)]">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-slate-200">
              {card.swarmId}
            </span>
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', STATUS_COLORS[card.status] ?? 'text-slate-400 border-slate-400/30')}
            >
              {card.status}
            </Badge>
          </div>
          <span className="text-sm text-slate-400 line-clamp-1">{card.title}</span>
        </div>

        <ProgressBar progress={card.progressPercent} />

        <div className="text-xs text-slate-500">
          Epic: <span className="font-mono text-slate-400">{card.epicId}</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>{card.completedIssues}</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <PlayCircle className="h-3 w-3" />
            <span>{card.activeIssues}</span>
          </div>
          <div className="flex items-center gap-1 text-blue-400">
            <Clock className="h-3 w-3" />
            <span>{card.readyIssues}</span>
          </div>
          <div className="flex items-center gap-1 text-rose-400">
            <AlertCircle className="h-3 w-3" />
            <span>{card.blockedIssues}</span>
          </div>
        </div>

        {card.coordinator && (
          <div className="text-xs text-slate-500">
            Coordinator: <span className="text-slate-400">{card.coordinator}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
