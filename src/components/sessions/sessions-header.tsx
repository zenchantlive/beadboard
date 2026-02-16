'use client';

import type { AgentRecord, AgentLiveness } from '../../lib/agent-registry';
import { ProjectScopeControls } from '../shared/project-scope-controls';
import type { ProjectScopeOption } from '../../lib/project-scope';
import { AgentStation } from './agent-station';
import { getSwarmHealth } from './sessions-header-logic';

export interface SwarmGroup {
  swarmId: string;
  swarmLabel: string;
  members: AgentRecord[];
}

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
  livenessMap?: Record<string, string>;
  swarmGroups?: SwarmGroup[];
  unassignedAgents?: AgentRecord[];
  missionCounts?: Record<string, number>;
}

export function SessionsHeader({
  agents,
  activeAgentId,
  onSelectAgent,
  projectScopeKey,
  projectScopeMode,
  projectScopeOptions,
  stats,
  livenessMap = {},
  swarmGroups = [],
  unassignedAgents = [],
  missionCounts = {},
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
          {swarmGroups.length > 0 || unassignedAgents.length > 0 ? (
            <div className="flex items-center gap-4">
              {swarmGroups.map((group) => {
                const health = getSwarmHealth(group.members, livenessMap);
                return (
                  <div key={group.swarmId} className="swarm-container flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="ui-text text-[0.55rem] font-black uppercase tracking-[0.15em] text-sky-400/50 whitespace-nowrap">
                        {group.swarmLabel}
                      </span>
                      <span className={`ui-text text-[0.45rem] font-bold uppercase tracking-wider ${health.color} flex items-center gap-0.5`}>
                        <span className="text-xs">●</span>
                        {health.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {group.members.map((agent) => (
                        <AgentStation 
                          key={agent.agent_id} 
                          agent={agent} 
                          isSelected={activeAgentId === agent.agent_id}
                          onSelect={onSelectAgent}
                          liveness={(livenessMap[agent.agent_id] as AgentLiveness) || 'active'}
                          missionCount={missionCounts[agent.agent_id]}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {unassignedAgents.length > 0 && (
                <div className="swarm-container flex items-center gap-2">
                  <span className="ui-text text-[0.55rem] font-black uppercase tracking-[0.15em] text-zinc-500/40 whitespace-nowrap">
                    No Swarm
                  </span>
                  <div className="flex items-center gap-1">
                    {unassignedAgents.map((agent) => (
                      <AgentStation 
                        key={agent.agent_id} 
                        agent={agent} 
                        isSelected={activeAgentId === agent.agent_id}
                        onSelect={onSelectAgent}
                        liveness={(livenessMap[agent.agent_id] as AgentLiveness) || 'active'}
                        missionCount={missionCounts[agent.agent_id]}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            agents.map((agent) => (
              <AgentStation 
                key={agent.agent_id} 
                agent={agent} 
                isSelected={activeAgentId === agent.agent_id}
                onSelect={onSelectAgent}
                liveness={(livenessMap[agent.agent_id] as AgentLiveness) || 'active'}
                missionCount={missionCounts[agent.agent_id]}
              />
            ))
          )}
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

function StatPill({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/5 bg-white/5 px-1.5 py-0.5">
      <span className={`h-1 w-1 rounded-full ${color}`} />
      <span className="system-data text-[8px] font-bold text-text-muted/60 uppercase tracking-tight">{label}</span>
      <span className="system-data text-[8px] font-black text-text-strong">{value}</span>
    </div>
  );
}
