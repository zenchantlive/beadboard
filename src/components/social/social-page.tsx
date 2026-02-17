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
    <div className="flex flex-col h-full bg-earthy-gradient">
      {/* Feed Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
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

      {/* Bottom Console (Conversation Deck) - Placeholder for future chat integration */}
      <div className="flex-none h-16 border-t border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-center">
        <p className="text-xs font-medium text-text-muted/60 tracking-wide uppercase">
          Select a task to view conversation
        </p>
      </div>
    </div>
  );
}