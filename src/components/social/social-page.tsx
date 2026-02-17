'use client';

import { useMemo } from 'react';
import type { BeadIssue } from '../../lib/types';
import type { ProjectScopeOption } from '../../lib/project-scope';
import { buildSocialCards } from '../../lib/social-cards';
import { SocialCard } from './social-card';
import { cn } from '@/lib/utils';

interface SocialPageProps {
  issues: BeadIssue[];
  selectedId?: string;
  onSelect: (id: string) => void;
  projectScopeOptions?: ProjectScopeOption[];
}

export function SocialPage({ issues, selectedId, onSelect, projectScopeOptions = [] }: SocialPageProps) {
  const cards = useMemo(() => buildSocialCards(issues), [issues]);
  
  const selectedTask = useMemo(() => 
    cards.find(c => c.id === selectedId) || null, 
  [cards, selectedId]);

  const otherCards = useMemo(() => 
    cards.filter(c => c.id !== selectedId), 
  [cards, selectedId]);

  // Dashboard Metrics
  const metrics = useMemo(() => {
    return {
      blocked: issues.filter(i => i.status === 'blocked'),
      p0: issues.filter(i => i.priority === 0 && i.status !== 'closed'),
      active: issues.filter(i => i.status === 'in_progress'),
      ready: issues.filter(i => i.status === 'open' || i.status === 'ready'),
    };
  }, [issues]);

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] overflow-hidden">
      <div className="absolute inset-0 bg-earthy-gradient opacity-20 pointer-events-none" />
      
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <div className="max-w-[1400px] mx-auto p-8 space-y-12">
          
          {/* STAGE AREA */}
          <section className="relative min-h-[350px] flex flex-col justify-center">
            {selectedTask ? (
              // FOCUSED TASK MODE
              <div className="animate-in fade-in zoom-in-95 duration-500 ease-out">
                <div className="mb-6 flex items-center gap-4 opacity-60">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-teal-400">Active Module</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
                </div>
                <div className="flex justify-center">
                   <SocialCard 
                     data={selectedTask} 
                     selected={true} 
                     className="w-full max-w-3xl scale-105 shadow-soft-2xl ring-1 ring-teal-500/20"
                   />
                </div>
              </div>
            ) : (
              // DASHBOARD MODE (System Overview)
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Projects Overview */}
                <div className="md:col-span-2 p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 backdrop-blur-md relative overflow-hidden group hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">System Overview</h2>
                      <p className="text-sm text-text-muted/60 mt-1">Multi-project command scope</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/5 text-xs font-mono text-text-muted border border-white/5">
                      v2.0
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {projectScopeOptions.slice(0, 5).map(p => (
                      <div key={p.key} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/20 border border-white/5 hover:border-teal-500/30 transition-colors cursor-pointer group/pill">
                        <div className="w-2 h-2 rounded-full bg-teal-500/50 group-hover/pill:bg-teal-400" />
                        <span className="text-sm font-medium text-text-secondary group-hover/pill:text-white">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Critical Alerts */}
                <div className="p-8 rounded-[2rem] bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 backdrop-blur-md flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-20">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-rose-500"><path d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"/></svg>
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-rose-400 mb-4">Critical Attention</h3>
                  <div className="space-y-3 flex-1">
                    {metrics.blocked.length > 0 ? (
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-bold text-white">{metrics.blocked.length}</span>
                        <span className="text-sm text-rose-200/80 leading-tight">Blocked<br/>Modules</span>
                      </div>
                    ) : (
                      <div className="text-emerald-400 font-medium">All systems nominal</div>
                    )}
                    {metrics.p0.length > 0 && (
                      <div className="text-xs text-rose-300/60 font-mono mt-2">
                        {metrics.p0.length} P0 Priority Items
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* LIBRARY */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-4 pb-2 border-b border-white/5">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted/60 py-2">Module Stream</h3>
              <div className="flex gap-4 text-[10px] font-mono text-text-muted/40">
                <span>{metrics.active.length} ACTIVE</span>
                <span>{metrics.ready.length} READY</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
              {otherCards.map((card) => (
                <SocialCard
                  key={card.id}
                  data={card}
                  selected={false}
                  onClick={() => onSelect(card.id)}
                  className="hover:translate-y-[-4px] transition-transform duration-300"
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}