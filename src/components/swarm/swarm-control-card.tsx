'use client';

import type { SwarmCardData } from '../../lib/swarm-api';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '../../lib/utils';
import { CheckCircle2, PlayCircle, Clock, AlertCircle, UserPlus, UserMinus, Activity } from 'lucide-react';
import { AgentAvatar } from '../shared/agent-avatar';
import { useAgentPool } from '../../hooks/use-agent-pool';

interface SwarmControlCardProps {
  card: SwarmCardData;
  projectRoot: string;
  onJoin?: () => void;
  onLeave?: () => void;
  isJoining?: boolean;
}

function MiniGraph({ progress }: { progress: number }) {
  // A simple visual indicator of progress complexity (mocked for now, but implies graph structure)
  return (
    <div className="flex h-8 items-end gap-0.5 opacity-50">
       {[...Array(10)].map((_, i) => {
         const height = Math.max(20, Math.random() * 80);
         const active = (i * 10) < progress;
         return (
           <div 
            key={i} 
            className={cn("w-1 rounded-t-sm transition-all", active ? "bg-emerald-500" : "bg-slate-700")}
            style={{ height: `${active ? height : 20}%` }}
           />
         )
       })}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  open: 'text-emerald-400 border-emerald-400/30',
  closed: 'text-slate-400 border-slate-400/30',
  in_progress: 'text-amber-400 border-amber-400/30',
};

export function SwarmControlCard({ card, projectRoot, onJoin, onLeave, isJoining }: SwarmControlCardProps) {
  const { getAgentsBySwarm } = useAgentPool(projectRoot);
  const agents = getAgentsBySwarm(card.swarmId);

  return (
    <Card className="group relative overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-card)] p-0 shadow-lg transition-all hover:border-[var(--ui-accent-info)] hover:shadow-xl">
       {/* Background Decoration */}
       <div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full bg-emerald-500/5 blur-3xl transition-opacity group-hover:opacity-20" />

      <div className="flex flex-col h-full p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-500">
                {card.swarmId}
              </span>
              <Badge
                variant="outline"
                className={cn('text-[9px] px-1.5 py-0 uppercase', STATUS_COLORS[card.status] ?? 'text-slate-400 border-slate-400/30')}
              >
                {card.status}
              </Badge>
            </div>
            <h4 className="text-sm font-semibold text-slate-200 line-clamp-1 group-hover:text-white transition-colors">
              {card.title}
            </h4>
          </div>
          <Activity className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
        </div>

        {/* Visualizer */}
        <div className="rounded-lg bg-black/20 p-2">
           <div className="flex justify-between items-end mb-1">
             <span className="text-[10px] text-slate-500 font-mono">ACTIVITY</span>
             <span className="text-[10px] text-emerald-400 font-mono">{card.progressPercent}%</span>
           </div>
           <MiniGraph progress={card.progressPercent} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-xs border-t border-white/5 pt-3">
          <div className="flex flex-col items-center gap-1 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px]">{card.completedIssues}</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-amber-400">
            <PlayCircle className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px]">{card.activeIssues}</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-blue-400">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px]">{card.readyIssues}</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-rose-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px]">{card.blockedIssues}</span>
          </div>
        </div>

        {/* Agent Roster & Actions */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex -space-x-2">
            {agents.slice(0, 3).map(agent => (
              <div key={agent.agent_id} className="ring-2 ring-[var(--ui-bg-card)] rounded-full z-10">
                <AgentAvatar 
                  name={agent.display_name} 
                  status={agent.status as any} 
                  size="sm" 
                />
              </div>
            ))}
            {agents.length > 3 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 ring-2 ring-[var(--ui-bg-card)] z-0">
                +{agents.length - 3}
              </div>
            )}
            {agents.length === 0 && (
               <span className="text-[10px] text-slate-500 italic pl-1">No agents</span>
            )}
          </div>

          <div className="flex gap-2">
             <Button 
               size="sm" 
               variant="outline" 
               className="h-7 px-2 text-[10px] gap-1 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-400"
               onClick={(e) => {
                 e.stopPropagation();
                 onJoin?.();
               }}
               disabled={isJoining}
             >
               <UserPlus className="h-3 w-3" />
               Join
             </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
