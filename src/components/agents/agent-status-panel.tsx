'use client';

import { useEffect, useState } from 'react';
import type { AgentInstance, AgentStatus } from '../../lib/agent-instance';
import { Activity, CheckCircle, XCircle, Loader2, Users } from 'lucide-react';

interface AgentStatusPanelProps {
  projectRoot: string;
}

export function AgentStatusPanel({ projectRoot }: AgentStatusPanelProps) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [history, setHistory] = useState<AgentInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Poll for agent status updates
    const poll = async () => {
      try {
        const [statusRes, historyRes] = await Promise.all([
          fetch(`/api/runtime/agents?projectRoot=${encodeURIComponent(projectRoot)}`),
          fetch(`/api/runtime/agents/history?projectRoot=${encodeURIComponent(projectRoot)}`),
        ]);
        const statusData = await statusRes.json();
        const historyData = await historyRes.json();
        
        if (statusData.ok) setStatus(statusData.status);
        if (historyData.ok) setHistory(historyData.instances);
      } catch (error) {
        console.error('Failed to fetch agent status:', error);
      } finally {
        setLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [projectRoot]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Agents Section */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Active Agents ({status?.totalActive || 0})
        </h3>
        
        {!status || status.instances.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] italic py-2">
            No active agents. Spawn an agent to work on a task.
          </p>
        ) : (
          <div className="space-y-2">
            {status.instances.map(instance => (
              <AgentInstanceCard key={instance.id} instance={instance} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Completions Section */}
      {history.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Recent Completions
          </h3>
          <div className="space-y-1 max-h-40 overflow-auto">
            {history.slice(0, 10).map(instance => (
              <AgentHistoryItem key={instance.id} instance={instance} />
            ))}
          </div>
        </div>
      )}

      {/* Summary by Type */}
      {status && Object.keys(status.byType).length > 0 && (
        <div className="pt-3 border-t border-[var(--border-subtle)]">
          <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            By Type
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(status.byType).map(([type, count]) => (
              <div
                key={type}
                className="px-2 py-1 rounded bg-[var(--surface-quaternary)] text-xs"
              >
                <span className="font-medium capitalize">{type}</span>
                <span className="text-[var(--text-tertiary)] ml-1">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentInstanceCard({ instance }: { instance: AgentInstance }) {
  const statusConfig = {
    spawning: { color: 'bg-yellow-500', icon: Loader2, animate: true },
    working: { color: 'bg-cyan-500', icon: Activity, animate: false },
    idle: { color: 'bg-gray-500', icon: Activity, animate: false },
    completed: { color: 'bg-green-500', icon: CheckCircle, animate: false },
    failed: { color: 'bg-red-500', icon: XCircle, animate: false },
  };

  const config = statusConfig[instance.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-2 rounded bg-[var(--surface-quaternary)] border border-[var(--border-subtle)]">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{instance.displayName}</span>
          <span className="text-[10px] text-[var(--text-tertiary)] uppercase">
            {instance.status}
          </span>
        </div>
        {instance.currentBeadId && (
          <div className="text-xs text-[var(--text-tertiary)] truncate">
            → {instance.currentBeadId}
          </div>
        )}
      </div>
      <Icon className={`w-4 h-4 text-[var(--text-tertiary)] ${config.animate ? 'animate-spin' : ''}`} />
    </div>
  );
}

function AgentHistoryItem({ instance }: { instance: AgentInstance }) {
  const isSuccess = instance.status === 'completed';
  
  return (
    <div className="flex items-center gap-2 text-xs p-1.5 rounded bg-[var(--surface-tertiary)]">
      {isSuccess ? (
        <CheckCircle className="w-3 h-3 text-green-400" />
      ) : (
        <XCircle className="w-3 h-3 text-red-400" />
      )}
      <span className="font-medium">{instance.displayName}</span>
      {instance.currentBeadId && (
        <span className="text-[var(--text-tertiary)]">→ {instance.currentBeadId}</span>
      )}
    </div>
  );
}
