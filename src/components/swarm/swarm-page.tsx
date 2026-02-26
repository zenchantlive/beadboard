'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useMissionList, type MissionData } from '../../hooks/use-mission-list';
import { MissionCard } from '../mission/mission-card';
import { TeamManagerDialog } from '../mission/team-manager-dialog';
import { MissionInspector } from '../mission/mission-inspector';
import { LaunchSwarmDialog } from './launch-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ChevronDown, Loader2, Rocket, LayoutGrid, Users, Shield } from 'lucide-react';
import { useAgentPool } from '../../hooks/use-agent-pool';

type SortOption = 'health' | 'activity' | 'progress' | 'name';

const SORT_LABELS: Record<SortOption, string> = {
  health: 'Health',
  activity: 'Activity',
  progress: 'Progress',
  name: 'Name',
};

const INITIAL_LIMIT = 16;

function sortMissions(missions: MissionData[], sortBy: SortOption): MissionData[] {
  const sorted = [...missions];
  switch (sortBy) {
    case 'progress':
      return sorted.sort((a, b) => (b.stats.done / (b.stats.total || 1)) - (a.stats.done / (a.stats.total || 1)));
    case 'activity':
      return sorted; // Need last_activity in API to sort real activity
    case 'health':
      return sorted.sort((a, b) => b.stats.blocked - a.stats.blocked); // Most blocked first
    case 'name':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted;
  }
}

interface SwarmPageProps {
  projectRoot: string;
  selectedId?: string;
  onSelect: (id: string) => void;
  setRightPanel?: (content: React.ReactNode | null) => void;
}

export function SwarmPage({ projectRoot, selectedId, onSelect, setRightPanel }: SwarmPageProps) {
  const [sortBy, setSortBy] = useState<SortOption>('health');
  const [expanded, setExpanded] = useState(false);
  const [manageTeamId, setManageTeamId] = useState<string | null>(null);

  // Refs to break dependency loops
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const { missions, isLoading, error, refresh: refreshMissions } = useMissionList(projectRoot);
  const { agents, refresh: refreshAgents } = useAgentPool(projectRoot);
  
  const sortedMissions = useMemo(() => sortMissions(missions, sortBy), [missions, sortBy]);
  const visibleMissions = expanded ? sortedMissions : sortedMissions.slice(0, INITIAL_LIMIT);
  const hasMore = sortedMissions.length > INITIAL_LIMIT;

  const busyAgents = agents.filter(a => a.status === 'working').length;

  // Handle Team Manager Actions
  const handleAssign = useCallback(async (agentId: string, action: 'join' | 'leave') => {
    // If called from inspector, we use selectedId. If called from dialog, we use manageTeamId.
    const targetMissionId = manageTeamId || selectedId;
    if (!targetMissionId) return;

    const endpoint = action === 'join' ? '/api/mission/assign' : '/api/mission/assign';
    
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        projectRoot, 
        missionId: targetMissionId,
        agentId,
        action
      }),
    });
    
    await Promise.all([refreshMissions(), refreshAgents()]);
  }, [manageTeamId, selectedId, projectRoot, refreshMissions, refreshAgents]);

  const activeMissionForInspector = missions.find(m => m.id === selectedId);
  const activeMission = missions.find(m => m.id === manageTeamId);

  // Sync right panel on selectedId change
  useEffect(() => {
    if (selectedId && setRightPanel && activeMissionForInspector) {
      setRightPanel(
        <MissionInspector 
          missionId={selectedId} 
          missionTitle={activeMissionForInspector.title}
          projectRoot={projectRoot} 
          assignedAgents={activeMissionForInspector.agents}
          onClose={() => onSelectRef.current('')} 
          onAssign={(agentId, action) => handleAssign(agentId, action)}
        />
      );
    } else if (!selectedId && setRightPanel) {
      setRightPanel(null);
    }
  }, [selectedId, projectRoot, setRightPanel, activeMissionForInspector, handleAssign]); // Removed onSelect from deps

  return (
    <div className="h-full overflow-y-auto bg-[var(--ui-bg-app)] px-4 py-4 md:px-6 custom-scrollbar">
      {/* Dashboard Stats */}
      <div className="mx-auto mb-6 grid w-full max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-3">
         <div className="flex items-center gap-4 rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-shell)] p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
               <Shield className="h-5 w-5" />
            </div>
            <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Missions</p>
               <p className="text-xl font-mono text-slate-200">{missions.length}</p>
            </div>
         </div>
         <div className="flex items-center gap-4 rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-shell)] p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
               <Users className="h-5 w-5" />
            </div>
            <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Agent Fleet</p>
               <p className="text-xl font-mono text-slate-200">{agents.length}</p>
            </div>
         </div>
         <div className="flex items-center gap-4 rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-shell)] p-4 shadow-sm border-l-4 border-l-emerald-500">
            <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Operational Load</p>
               <div className="flex items-center gap-2">
                  <span className="text-xl font-mono text-slate-200">{busyAgents}/{agents.length}</span>
                  <span className="text-[10px] text-slate-500">engaged</span>
               </div>
            </div>
         </div>
      </div>

      {/* Toolbar */}
      <div className="mx-auto mb-4 flex w-full max-w-[1200px] items-center justify-between gap-3 rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-shell)] px-3 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Command</p>
            <h2 className="text-base font-semibold text-[var(--ui-text-primary)]">
              Mission Control
            </h2>
          </div>
          <div className="h-8 w-px bg-white/5 mx-2" />
          <LaunchSwarmDialog projectRoot={projectRoot} onSuccess={refreshMissions} />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/10 bg-white/5 text-[var(--ui-text-primary)] hover:bg-white/10"
            >
              <ArrowUpDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span className="text-xs uppercase tracking-wider font-bold">{SORT_LABELS[sortBy]}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-[#0d1621] border-slate-800 text-slate-300">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-500">Sort Missions</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => setSortBy(option)}
                className={sortBy === option ? 'bg-indigo-500/10 text-indigo-400' : 'focus:bg-white/5 focus:text-white'}
              >
                {SORT_LABELS[option]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grid */}
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            id={mission.id}
            projectRoot={projectRoot}
            title={mission.title}
            description={mission.description}
            status={mission.status as any}
            stats={mission.stats}
            agents={mission.agents}
            onClick={() => onSelect(mission.id)}
            onDeploy={() => setManageTeamId(mission.id)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center pb-12">
          <Button
            variant="outline"
            onClick={() => setExpanded(true)}
            className="gap-2 border-white/10 bg-white/5 text-[var(--ui-text-primary)] hover:bg-white/10"
          >
            Show All Missions
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="py-24 flex flex-col items-center justify-center text-[var(--color-text-muted)]">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
          <p className="text-sm font-mono uppercase tracking-widest animate-pulse">Establishing Uplink...</p>
        </div>
      )}

      {!isLoading && !error && missions.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-[var(--color-text-muted)]">
          <Rocket className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm mb-4">No active missions. Launch one to begin.</p>
          <LaunchSwarmDialog projectRoot={projectRoot} onSuccess={refreshMissions} />
        </div>
      )}

      {/* Dialogs */}
      {activeMission && (
        <TeamManagerDialog
          isOpen={!!manageTeamId}
          onClose={() => setManageTeamId(null)}
          missionId={activeMission.id}
          missionTitle={activeMission.title}
          projectRoot={projectRoot}
          assignedAgents={activeMission.agents}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
}