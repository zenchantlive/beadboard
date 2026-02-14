'use client';

import { useMemo } from 'react';
import type { EpicBucket } from '../../lib/agent-sessions';
import { SessionFeedCard } from './session-feed-card';

interface SessionTaskFeedProps {
  feed: EpicBucket[];
  selectedEpicId: string | null;
  onSelectTask: (id: string) => void;
  highlightTaskId?: string | null;
}

export function SessionTaskFeed({ feed, selectedEpicId, onSelectTask, highlightTaskId }: SessionTaskFeedProps) {
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
            {bucket.tasks.map(task => (
              <SessionFeedCard 
                key={task.id} 
                card={task} 
                onSelect={onSelectTask} 
                isHighlighted={highlightTaskId === task.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}