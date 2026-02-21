'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, AlertTriangle, Activity, CheckCircle2, Circle } from 'lucide-react';
import { AgentAvatar } from '../shared/agent-avatar';
import type { AgentRecord } from '../../lib/agent-registry';
import { SwarmGraph } from './swarm-graph';
import { useSwarmTopology } from '../../hooks/use-swarm-topology';

export interface MissionCardProps {
  id: string;
  projectRoot: string;
  title: string;
  description?: string;
  status: 'planning' | 'active' | 'blocked' | 'completed';
  stats: {
    total: number;
    done: number;
    blocked: number;
  };
  agents: AgentRecord[];
  onDeploy: () => void;
  onClick: () => void;
}

const STATUS_CONFIG = {
  planning: { 
    color: 'text-blue-400', 
    border: 'border-blue-500/30', 
    bg: 'bg-blue-500/5', 
    label: 'PLANNING',
    icon: Circle
  },
  active: { 
    color: 'text-emerald-400', 
    border: 'border-emerald-500/30', 
    bg: 'bg-emerald-500/5', 
    label: 'ACTIVE',
    icon: Activity
  },
  blocked: { 
    color: 'text-rose-400', 
    border: 'border-rose-500/30', 
    bg: 'bg-rose-500/5', 
    label: 'BLOCKED',
    icon: AlertTriangle
  },
  completed: { 
    color: 'text-slate-400', 
    border: 'border-slate-500/30', 
    bg: 'bg-slate-500/5', 
    label: 'COMPLETE',
    icon: CheckCircle2
  },
};

export function MissionCard({ id, projectRoot, title, description, status, stats, agents, onDeploy, onClick }: MissionCardProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.planning;
  const StatusIcon = config.icon;
  const { topology, isLoading } = useSwarmTopology(projectRoot, id);
  
  const isUnstaffed = agents.length === 0;
  const isWorking = agents.some(a => a.status === 'working');
  const showPulse = status === 'active' || isWorking;
  
  return (
    <Card 
      onClick={onClick}
      className="group relative flex flex-col h-[320px] cursor-pointer overflow-hidden rounded-2xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-card)] hover:border-[var(--ui-accent-info)] hover:shadow-xl hover:shadow-black/20 transition-all duration-300"
    >
      {/* Decorative Top Glow */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 opacity-50 group-hover:opacity-100 transition-opacity", config.bg.replace('/5', '/40'))} />

      {/* HEADER */}
      <div className="p-5 flex flex-col gap-3 min-h-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-wider text-slate-500">{id}</span>
            <Badge variant="outline" className={cn("text-[9px] px-2 py-0.5 border h-5 flex items-center gap-1.5", config.color, config.border, config.bg)}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
          {showPulse && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-lg text-slate-100 leading-tight group-hover:text-white transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {description || "No mission brief available."}
          </p>
        </div>
      </div>

      {/* GRAPH VISUALIZATION */}
      <div className="px-5 py-2 flex-1 flex flex-col justify-end">
         <SwarmGraph topology={topology} isLoading={isLoading} />
      </div>

      {/* FOOTER: SQUAD */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between bg-[var(--ui-bg-shell)] mt-auto">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {agents.slice(0, 4).map(agent => (
              <div key={agent.agent_id} className="ring-2 ring-[var(--ui-bg-shell)] rounded-full transition-transform hover:scale-110 z-0 hover:z-10 relative" title={`${agent.display_name} (${agent.role})`}>
                <AgentAvatar name={agent.display_name} status={agent.status as any} size="sm" />
              </div>
            ))}
            {agents.length === 0 && (
              <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 border-dashed flex items-center justify-center text-slate-600">
                <Users className="h-3 w-3" />
              </div>
            )}
          </div>
          {agents.length === 0 && (
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Unstaffed</span>
          )}
        </div>

        <Button 
          size="sm" 
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); onDeploy(); }}
          className={cn(
            "h-7 px-3 text-[10px] font-bold uppercase tracking-wider border transition-all",
            isUnstaffed 
              ? "border-blue-500/20 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40" 
              : "border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 hover:border-slate-500"
          )}
        >
          {isUnstaffed ? 'Deploy' : 'Manage'}
        </Button>
      </div>
    </Card>
  );
}
