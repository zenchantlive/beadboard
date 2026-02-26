'use client';

import { useEffect, useState } from 'react';
import type { SwarmCardData, SwarmStatusFromApi } from '../../lib/swarm-api';
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../lib/utils';
import { CheckCircle2, PlayCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface SwarmDetailProps {
  swarmId: string;
  projectRoot: string;
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
      <div className="flex items-center gap-2">
        <div className="flex-1 font-mono text-xs text-slate-300">
          {'█'.repeat(filled)}
          {'░'.repeat(empty)}
        </div>
      </div>
    </div>
  );
}

export function SwarmDetail({ swarmId, projectRoot }: SwarmDetailProps) {
  const [status, setStatus] = useState<SwarmStatusFromApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (e) {
        setError('Failed to fetch swarm status');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStatus();
  }, [swarmId, projectRoot]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading swarm...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-rose-400">
        {error}
      </div>
    );
  }

  if (!status) {
    return (
      <div className="py-8 text-center text-slate-400">
        No swarm data found
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-slate-200">
            {swarmId}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-400 border-emerald-400/30">
            swarm
          </Badge>
        </div>
        <h3 className="text-sm font-medium text-slate-200 line-clamp-2">
          {status.epic_title}
        </h3>
      </div>

      {/* Progress */}
      <ProgressBar progress={status.progress_percent} />

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>{status.completed.length} done</span>
        </div>
        <div className="flex items-center gap-1 text-amber-400">
          <PlayCircle className="h-3 w-3" />
          <span>{status.active_count} active</span>
        </div>
        <div className="flex items-center gap-1 text-blue-400">
          <Clock className="h-3 w-3" />
          <span>{status.ready_count} ready</span>
        </div>
        <div className="flex items-center gap-1 text-rose-400">
          <AlertCircle className="h-3 w-3" />
          <span>{status.blocked_count} blocked</span>
        </div>
      </div>

      {/* Active Tasks */}
      {status.active.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active ({status.active.length})
          </h4>
          <div className="space-y-1">
            {status.active.map((task) => (
              <div key={task.id} className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                <span className="font-mono text-[10px] text-amber-300">{task.id}</span>
                <p className="text-xs text-slate-300 line-clamp-1">{task.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ready Tasks */}
      {status.ready.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Ready to Pick Up ({status.ready.length})
          </h4>
          <div className="space-y-1">
            {status.ready.map((task) => (
              <div key={task.id} className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
                <span className="font-mono text-[10px] text-blue-300">{task.id}</span>
                <p className="text-xs text-slate-300 line-clamp-1">{task.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocked Tasks */}
      {status.blocked.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Blocked ({status.blocked.length})
          </h4>
          <div className="space-y-1">
            {status.blocked.map((task) => (
              <div key={task.id} className="p-2 rounded-md bg-rose-500/10 border border-rose-500/20">
                <span className="font-mono text-[10px] text-rose-300">{task.id}</span>
                <p className="text-xs text-slate-300 line-clamp-1">{task.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
