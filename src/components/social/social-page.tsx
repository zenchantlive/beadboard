'use client';

import { useMemo } from 'react';
import type { BeadIssue } from '../../lib/types';
import { buildSocialCards } from '../../lib/social-cards';
import { SocialCard } from './social-card';
import { cn } from '@/lib/utils';

interface SocialPageProps {
  issues: BeadIssue[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function SocialPage({ issues, selectedId, onSelect }: SocialPageProps) {
  const cards = useMemo(() => buildSocialCards(issues), [issues]);
  
  const selectedTask = useMemo(() => 
    cards.find(c => c.id === selectedId) || null, 
  [cards, selectedId]);

  const otherCards = useMemo(() => 
    cards.filter(c => c.id !== selectedId), 
  [cards, selectedId]);

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-earthy-gradient opacity-20 pointer-events-none" />
      
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <div className="max-w-[1400px] mx-auto p-8 space-y-12">
          
          {/* STAGE: Featured / Selected Task (Media Player "Now Playing") */}
          <section className="relative min-h-[400px] flex flex-col justify-center">
            {selectedTask ? (
              <div className="animate-in fade-in zoom-in-95 duration-700 ease-out">
                <div className="mb-8 flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-teal-500/20 to-transparent" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-teal-500/60 mb-1">Module Active</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_12px_#14b8a6]" />
                  </div>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-teal-500/20 to-transparent" />
                </div>
                <div className="flex justify-center relative">
                   <div className="absolute inset-0 bg-teal-500/5 blur-[100px] rounded-full scale-150" />
                   <SocialCard 
                     data={selectedTask} 
                     selected={true} 
                     className="w-full max-w-3xl scale-110 shadow-soft-xl border-teal-500/20 ring-1 ring-teal-500/30 relative z-10"
                   />
                </div>
              </div>
            ) : (
              <div className="group relative py-24 rounded-[4rem] bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 overflow-hidden flex flex-col items-center justify-center transition-all duration-1000">
                {/* Holographic Ring Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-teal-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] border border-dashed border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-6 ring-1 ring-white/10 group-hover:ring-teal-500/30 transition-all duration-500">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-muted/40 group-hover:text-teal-500/60 transition-colors">
                      <path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10M12 2a10 10 0 0 0-10 10M12 22a10 10 0 0 0 10-10M12 22a10 10 0 0 1-10-10"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white/20 tracking-widest uppercase mb-2">Initialize Focus</h2>
                  <p className="text-sm text-text-muted/20 font-mono">STANDBY_MODE // AWAITING_INPUT</p>
                </div>
              </div>
            )}
          </section>

          {/* LIBRARY: The Feed (Masonry Grid) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-text-muted/60">Module Library</h3>
              <div className="text-[10px] text-text-muted/40 font-mono">{otherCards.length} Units Available</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
              {otherCards.map((card) => (
                <SocialCard
                  key={card.id}
                  data={card}
                  selected={false}
                  onClick={() => onSelect(card.id)}
                  className="hover:scale-[1.02] active:scale-[0.98]"
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}