'use client';

import { useMemo } from 'react';
import type { EpicBucket, Incursion } from '../../lib/agent-sessions';
import { SessionFeedCard } from './session-feed-card';

interface SessionTaskFeedProps {
  feed: EpicBucket[];
  incursions?: Incursion[];
  selectedEpicId: string | null;
  onSelectTask: (id: string) => void;
  highlightTaskId?: string | null;
  highlightingAgentId?: string | null;
}

export function IncursionTicker({ incursions }: { incursions: Incursion[] }) {
  return (
    <div className="flex flex-col gap-2">
      {incursions.map((inc, i) => (
        <div 
          key={i} 
          className={`flex items-center gap-3 px-4 py-2 rounded-xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md animate-in slide-in-from-top-4 duration-500`}
        >
          <div className="flex-none">
            <span className={`flex h-2 w-2 rounded-full ${inc.severity === 'exact' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
          </div>
          <p className="ui-text text-[0.7rem] font-bold text-rose-200/80">
            <span className="uppercase tracking-widest mr-2 opacity-50">Conflict Detected:</span>
            <span className="text-white mr-2">{inc.agents.join(' & ')}</span>
            <span className="opacity-40 font-medium">overlapping in</span>
            <span className="ml-2 font-mono text-rose-300/90">{inc.scope}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

export function SessionTaskFeed({ feed, incursions = [], selectedEpicId, onSelectTask, highlightTaskId, highlightingAgentId }: SessionTaskFeedProps) {
  const filteredFeed = useMemo(() => {
    if (!selectedEpicId) return feed;
    return feed.filter(b => b.epic.id === selectedEpicId);
  }, [feed, selectedEpicId]);

  if (filteredFeed.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
        <p className="ui-text text-sm font-bold text-text-muted">No sessions found</p>
        <p className="ui-text text-xs text-text-muted/50 text-center max-w-xs px-6">
          Try selecting a different epic bucket or check if any tasks are active.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-24">
      {incursions.length > 0 && (
        <div className="mb-8">
          <IncursionTicker incursions={incursions} />
        </div>
      )}
      
      {filteredFeed.map(bucket => (
        <section key={bucket.epic.id} className="space-y-[1.5rem]">
          <header className="flex items-center gap-[1rem] px-[0.5rem] group">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="ui-text text-[0.65rem] font-black uppercase tracking-[0.2em] text-sky-400/40">EPIC</span>
                <h2 className="ui-text text-[0.9rem] font-black uppercase tracking-tight text-text-strong group-hover:text-sky-300 transition-colors">
                  {bucket.epic.title}
                </h2>
              </div>
              <span className="system-data text-[0.65rem] font-bold text-text-muted/30 tracking-widest">{bucket.epic.id}</span>
            </div>
            
            <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
            
            <div className="flex items-center gap-3">
              <span className="system-data rounded-full border border-white/5 bg-white/[0.02] px-[0.6rem] py-[0.2rem] text-[0.7rem] font-black text-text-muted/60 shadow-inner">
                {bucket.tasks.length} MISSION{bucket.tasks.length === 1 ? '' : 'S'}
              </span>
            </div>
          </header>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-[1.5rem]">
            {bucket.tasks.map(task => {
              const taskIncursion = incursions.find(inc => 
                task.owner && inc.agents.includes(task.owner)
              );
              
              const isAgentMission = highlightingAgentId ? task.owner === highlightingAgentId : false;
              return (
                <SessionFeedCard 
                  key={task.id} 
                  card={task} 
                  onSelect={onSelectTask} 
                  isHighlighted={highlightTaskId === task.id || isAgentMission}
                  incursion={taskIncursion}
                  highlightSource={isAgentMission ? 'agent' : undefined}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
