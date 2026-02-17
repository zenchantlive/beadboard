'use client';

import { useMemo } from 'react';
import type { BeadIssue } from '../../lib/types';
import { buildSocialCards } from '../../lib/social-cards';
import { SocialCard } from './social-card';

interface SocialPageProps {
  issues: BeadIssue[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function SocialPage({ issues, selectedId, onSelect }: SocialPageProps) {
  const cards = useMemo(() => buildSocialCards(issues), [issues]);

  return (
    <div className="flex flex-col h-full bg-earthy-gradient overflow-hidden">
      {/* Top: Card Stream (Restricted Height) */}
      <div className="flex-none h-[55vh] min-h-[500px] overflow-y-auto custom-scrollbar border-b border-white/5 bg-black/10 shadow-inner">
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {cards.map((card) => (
              <SocialCard
                key={card.id}
                data={card}
                selected={selectedId === card.id}
                onClick={() => onSelect(card.id)}
              />
            ))}
            {cards.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-text-muted opacity-60">
                <div className="text-4xl mb-4">📭</div>
                <p>No active tasks found in stream.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Conversation Deck (Fills remaining space) */}
      <div className="flex-1 bg-surface-muted/20 backdrop-blur-xl p-6 flex items-center justify-center relative">
        {/* Placeholder for Chat Interface */}
        <div className="text-center space-y-2 max-w-md">
          <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center mb-4 ring-1 ring-white/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-primary">Conversation Deck</h3>
          <p className="text-sm text-text-muted/70">Select a task above to open its secure communication channel and activity log.</p>
        </div>
      </div>
    </div>
  );
}
