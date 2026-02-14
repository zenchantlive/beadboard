'use client';

import { motion } from 'framer-motion';
import type { SessionTaskCard, Incursion } from '../../lib/agent-sessions';
import { statusBorder, statusDotColor, statusGradient, sessionStateGlow } from '../shared/status-utils';

interface SessionFeedCardProps {
  card: SessionTaskCard;
  onSelect: (id: string) => void;
  isHighlighted?: boolean;
  incursion?: Incursion;
}

export function SessionFeedCard({ card, onSelect, isHighlighted, incursion }: SessionFeedCardProps) {
  return (
    <motion.article
      layout
      onClick={() => onSelect(card.id)}
      className={`relative w-full cursor-pointer rounded-[1.25rem] border p-[1rem] text-left transition-all duration-200 ${
        isHighlighted 
          ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/50 scale-[1.02] shadow-[0_0_20px_rgba(56,189,248,0.15)]' 
          : `${statusBorder(card.status)} ${statusGradient(card.status)} hover:bg-white/[0.04]`
      } ${sessionStateGlow(card.sessionState)} ${incursion ? 'ring-1 ring-rose-500/30' : ''}`}
    >
      {incursion && (
        <div className="absolute -top-2 right-4 z-10">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.1em] border shadow-lg animate-pulse ${
            incursion.severity === 'exact' 
              ? 'bg-rose-500 text-white border-rose-400 shadow-rose-500/20' 
              : 'bg-amber-500 text-black border-amber-400 shadow-amber-500/20'
          }`}>
            Conflict
          </span>
        </div>
      )}
      
      <div className="flex gap-[0.75rem]">
        {/* Compact Avatar */}
        <div className="flex-none">
          <div className="h-[2.5rem] w-[2.5rem] rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center border border-white/5 shadow-inner">
            <span className="ui-text text-[0.75rem] font-black text-zinc-400">
              {card.owner?.slice(0, 2).toUpperCase() || '??'}
            </span>
          </div>
        </div>

        {/* Dense Headline Content */}
        <div className="flex-1 min-w-0">
          <header className="flex items-center justify-between gap-[0.5rem]">
            <div className="flex flex-wrap items-center gap-[0.4rem]">
              <span className="ui-text text-[0.8rem] font-black text-text-strong tracking-tight">{card.owner || 'Unassigned'}</span>
              <span className="ui-text text-[0.7rem] text-text-muted/50">pulled</span>
              <span className="system-data text-[0.7rem] font-black text-sky-400/80 uppercase tracking-widest">{card.id}</span>
            </div>
            <time className="system-data text-[0.65rem] text-text-muted/30 whitespace-nowrap">
              {new Date(card.lastActivityAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </header>

          <div className="mt-[0.25rem]">
            <h3 className="ui-text text-[0.85rem] font-bold leading-tight text-text-body/90 line-clamp-2 group-hover:text-text-strong">
              {card.title}
            </h3>
          </div>

          {card.communication.latestSnippet && (
            <div className="mt-[0.75rem] relative rounded-xl bg-black/40 p-[0.75rem] border border-white/5 shadow-inner">
              <p className="ui-text text-[0.75rem] italic leading-snug text-text-muted/80 line-clamp-2">
                &quot;{card.communication.latestSnippet}&quot;
              </p>
            </div>
          )}

          <footer className="mt-[0.75rem] flex items-center justify-between">
            <div className="flex items-center gap-[0.5rem]">
              <span className={`h-[0.35rem] w-[0.35rem] rounded-full ${statusDotColor(card.status)} shadow-[0_0_6px_currentColor]`} />
              <span className="system-data text-[0.6rem] font-black text-text-muted/40 uppercase tracking-widest">
                {card.status}
              </span>
            </div>
            
            <div className="flex gap-[0.4rem]">
               <span className="ui-text text-[0.65rem] font-bold text-sky-400/60 uppercase tracking-tighter px-[0.4rem] py-[0.1rem] rounded-md bg-white/5 border border-white/5">
                  {card.sessionState}
               </span>
            </div>
          </footer>
        </div>
      </div>
    </motion.article>
  );
}
