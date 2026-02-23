'use client';

import { useEffect, useState } from 'react';
import type { SwarmStatusFromApi } from '../../lib/swarm-api';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, PlayCircle, Clock, AlertCircle, Loader2, Users } from 'lucide-react';
import { AgentAvatar } from '../shared/agent-avatar';
import { useAgentPool } from '../../hooks/use-agent-pool';

interface SwarmInspectorProps {
  swarmId: string;
  projectRoot: string;
  onClose?: () => void;
}

function ProgressBar({ progress }: { progress: number }) {
  const filled = Math.round(progress / 10);
  const empty = 10 - filled;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Progress</span>
        <span className="font-mono text-slate-300">{progress}%</span>
      </div>
      <div className="flex items-center gap-1 font-mono text-xs text-slate-300 tracking-widest">
        <span className="text-emerald-400">{'█'.repeat(filled)}</span>
        <span className="text-slate-700">{'░'.repeat(empty)}</span>
      </div>
    </div>
  );
}

export function SwarmInspector({ swarmId, projectRoot }: SwarmInspectorProps) {
  const [status, setStatus] = useState<SwarmStatusFromApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAgentsBySwarm } = useAgentPool(projectRoot);

  useEffect(() => {
    async function fetchStatus() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/swarm/status?projectRoot=${encodeURIComponent(projectRoot)}&epic=${encodeURIComponent(swarmId)}`
        );
        const payload = await response.json();
        if (payload.ok && payload.data) {
          setStatus(payload.data);
        } else {
          setError(payload.error?.message || 'Failed to load swarm status');
        }
      } catch {
        setError('Failed to fetch swarm status');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStatus();
  }, [swarmId, projectRoot]);

  const assignedAgents = getAgentsBySwarm(swarmId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="p-4 text-center text-rose-400">
        {error || 'No data found'}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#08111d] text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-[var(--ui-border-soft)] bg-[#0d1621]">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-400/30 px-1.5">
            {swarmId}
          </Badge>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Active Operation</span>
        </div>
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-3">
          {status.epic_title}
        </h3>
        <ProgressBar progress={status.progress_percent} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Agent Roster */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Users className="h-3 w-3" />
              Assigned Agents
            </h4>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
              {assignedAgents.length}
            </span>
          </div>

          {assignedAgents.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-3 border border-dashed border-slate-800 rounded-lg text-center">
              No agents currently assigned.
              <br />
              <span className="text-[10px]">Use &quot;Join&quot; on the main card.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedAgents.map(agent => (
                <div key={agent.agent_id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                  <AgentAvatar
                    name={agent.display_name}
                    status={agent.status as any}
                    size="sm"
                  />
                  <div>
                    <p className="text-xs font-medium text-slate-300">{agent.display_name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{agent.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Task Stats */}
        <section className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-[#0f1824] border border-slate-800">
            <div className="flex items-center gap-2 mb-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase">Done</span>
            </div>
            <span className="text-lg font-mono">{status.completed.length}</span>
          </div>
          <div className="p-2 rounded bg-[#0f1824] border border-slate-800">
            <div className="flex items-center gap-2 mb-1 text-amber-400">
              <PlayCircle className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase">Active</span>
            </div>
            <span className="text-lg font-mono">{status.active_count}</span>
          </div>
          <div className="p-2 rounded bg-[#0f1824] border border-slate-800">
            <div className="flex items-center gap-2 mb-1 text-blue-400">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase">Ready</span>
            </div>
            <span className="text-lg font-mono">{status.ready_count}</span>
          </div>
          <div className="p-2 rounded bg-[#0f1824] border border-slate-800">
            <div className="flex items-center gap-2 mb-1 text-rose-400">
              <AlertCircle className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase">Blocked</span>
            </div>
            <span className="text-lg font-mono">{status.blocked_count}</span>
          </div>
        </section>

        {/* Active Tasks List */}
        {status.active.length > 0 && (
          <section>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Currently Executing
            </h4>
            <div className="space-y-2">
              {status.active.map((task) => (
                <div key={task.id} className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-amber-500">{task.id}</span>
                    <Badge variant="outline" className="text-[9px] h-4 border-amber-800 text-amber-500">IN PROGRESS</Badge>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">{task.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
