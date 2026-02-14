'use client';

import type { AgentRecord } from '../../lib/agent-registry';
import { ProjectScopeControls } from '../shared/project-scope-controls';
import type { ProjectScopeOption } from '../../lib/project-scope';

interface SessionsHeaderProps {
  agents: AgentRecord[];
  activeAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  projectScopeKey: string;
  projectScopeMode: 'single' | 'aggregate';
  projectScopeOptions: ProjectScopeOption[];
  stats?: {
    active: number;
    needsInput: number;
    completed: number;
  };
}

export function SessionsHeader({
  agents,
  activeAgentId,
  onSelectAgent,
  projectScopeKey,
  projectScopeMode,
  projectScopeOptions,
  stats,
}: SessionsHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex flex-col border-b border-white/5 bg-[#0b0c10]/60 backdrop-blur-3xl shadow-2xl">
      {/* Row 1: Agent Command Deck */}
      <div className="flex h-14 items-center gap-4 px-6 border-b border-white/[0.03]">
        <div className="flex-none pr-4 border-r border-white/5 mr-2">
           <h1 className="ui-text text-[0.6rem] font-black uppercase tracking-[0.3em] text-text-strong/30">Command</h1>
           <p className="ui-text text-[0.7rem] font-black text-text-strong">OPERATIVES</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {agents.map((agent) => (
            <AgentStation 
              key={agent.agent_id} 
              agent={agent} 
              isSelected={activeAgentId === agent.agent_id}
              onSelect={onSelectAgent}
            />
          ))}
        </div>
      </div>

      {/* Row 2: Management & Meta */}
      <div className="flex h-10 items-center justify-between px-6 bg-white/[0.01]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <span className="ui-text text-[0.6rem] font-black uppercase tracking-[0.2em] text-sky-400/30 whitespace-nowrap">Load Pulse</span>
             {stats && (
               <div className="flex items-center gap-1.5">
                  <StatPill label="Active" value={stats.active} color="bg-emerald-500" />
                  <StatPill label="Blocked" value={stats.needsInput} color="bg-rose-500" />
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-4 scale-75 origin-right opacity-70 hover:opacity-100 transition-opacity">
          <ProjectScopeControls
            projectScopeKey={projectScopeKey}
            projectScopeMode={projectScopeMode}
            projectScopeOptions={projectScopeOptions}
          />
        </div>
      </div>
    </header>
  );
}

function AgentStation({ 
  agent, 
  isSelected, 
  onSelect 
}: { 
  agent: AgentRecord, 
  isSelected: boolean,
  onSelect: (id: string | null) => void
}) {
  const isActive = agent.status !== 'idle';
  
  return (
    <button
      onClick={() => onSelect(isSelected ? null : agent.agent_id)}
      className={`flex-none group flex w-[9.5rem] items-center gap-2 rounded-lg border px-2 py-1.5 transition-all duration-300 ${
        isSelected 
          ? 'border-sky-500/50 bg-sky-500/10 shadow-[0_0_10px_rgba(14,165,233,0.1)]' 
          : 'border-white/5 bg-white/[0.01] hover:bg-white/5'
      }`}
    >
      <div className="relative flex-none">
        <div className={`h-7 w-7 rounded-md bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center border border-white/10 shadow-inner transition-transform duration-300 ${isSelected ? 'scale-90' : 'group-hover:scale-105'}`}>
          <span className="ui-text text-[0.6rem] font-black text-zinc-400">
            {agent.agent_id.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#0b0c10] ${
          isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-zinc-600'
        }`} />
      </div>

      <div className="flex flex-col items-start min-w-0">
        <span className={`ui-text text-[0.65rem] font-black truncate w-full transition-colors ${isSelected ? 'text-sky-300' : 'text-text-body'}`}>
          {agent.agent_id}
        </span>
        <span className="system-data text-[0.5rem] font-bold text-text-muted/30 uppercase tracking-tighter">
          {isActive ? 'On Mission' : 'Standby'}
        </span>
      </div>
    </button>
  );
}

function StatPill({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/5 bg-white/5 px-1.5 py-0.5">
      <span className={`h-1 w-1 rounded-full ${color}`} />
      <span className="system-data text-[8px] font-bold text-text-muted/60 uppercase tracking-tight">{label}</span>
      <span className="system-data text-[8px] font-black text-text-strong">{value}</span>
    </div>
  );
}
