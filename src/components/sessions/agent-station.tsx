'use client';

import { useEffect, useState } from 'react';
import type { AgentRecord, AgentLiveness } from '../../lib/agent-registry';
import { getAgentRoleColor } from './agent-station-logic';

function useTimeAgo(isoTimestamp: string) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const update = () => {
      const seconds = Math.floor((new Date().getTime() - new Date(isoTimestamp).getTime()) / 1000);
      if (seconds < 60) setTimeAgo(`${seconds}s`);
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)}m`);
      else setTimeAgo(`${Math.floor(seconds / 3600)}h`);
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [isoTimestamp]);

  return timeAgo;
}

interface AgentStationProps { 
  agent: AgentRecord;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  liveness: AgentLiveness;
  missionCount?: number;
}

export function AgentStation({ 
  agent, 
  isSelected, 
  onSelect,
  liveness,
  missionCount = 0
}: AgentStationProps) {
  const timeAgo = useTimeAgo(agent.last_seen_at);
  const roleColor = getAgentRoleColor(agent.role);
  
  const statusStyles = {
    active: { 
      dot: 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]',
      label: 'On Mission',
      color: 'text-emerald-400/60'
    },
    stale: {
      dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      label: 'Lease Expiring',
      color: 'text-amber-400/60'
    },
    evicted: {
      dot: 'bg-rose-500/50 shadow-none',
      label: 'Disconnected',
      color: 'text-rose-400/40'
    },
    idle: {
      dot: 'bg-zinc-700 shadow-none',
      label: 'Idle',
      color: 'text-zinc-500/30'
    }
  }[liveness];

  return (
    <button
      onClick={() => onSelect(isSelected ? null : agent.agent_id)}
      className={`flex-none group flex w-[10rem] items-center gap-2 rounded-lg border px-2 py-1.5 transition-all duration-300 ${
        isSelected 
          ? 'border-sky-500/50 bg-sky-500/10 shadow-[0_0_10px_rgba(14,165,233,0.1)]' 
          : 'border-white/5 bg-white/[0.01] hover:bg-white/5'
      } ${liveness === 'idle' ? 'opacity-40 grayscale-[0.5]' : ''}`}
    >
      <div className="relative flex-none">
        <div className={`h-7 w-7 rounded-md bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center border-2 ${roleColor} shadow-inner transition-transform duration-300 ${isSelected ? 'scale-90' : 'group-hover:scale-105'}`}>
          <span className="ui-text text-[0.6rem] font-black text-white/80">
            {agent.agent_id.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#0b0c10] ${statusStyles.dot}`} />
      </div>

      <div className="flex flex-col items-start min-w-0 text-left">
        <div className="flex items-center gap-1 w-full justify-between pr-1">
          <span className={`ui-text text-[0.65rem] font-black truncate transition-colors ${isSelected ? 'text-sky-300' : 'text-text-body'}`}>
            {agent.agent_id}
          </span>
          <span className="system-data text-[0.5rem] font-bold text-text-muted/40">
            {timeAgo}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`system-data text-[0.5rem] font-bold uppercase tracking-tighter ${statusStyles.color}`}>
            {statusStyles.label}
          </span>
          {missionCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1rem] h-[0.9rem] px-1 rounded-full bg-sky-500/20 text-sky-400 text-[0.45rem] font-black">
              {missionCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
