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
    <div className="flex flex-col h-full">
      {/* Top: Scrollable Grid Container (approx 4x2 visible) */}
      <div className="flex-none h-[60vh] min-h-[400px] overflow-y-auto p-6 border-b border-white/5 custom-scrollbar bg-black/10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1600px] mx-auto">
          {cards.map((card) => (
            <SocialCard
              key={card.id}
              data={card}
              selected={selectedId === card.id}
              onClick={() => onSelect(card.id)}
            />
          ))}
          {cards.length === 0 && (
            <div className="col-span-full text-center py-12 text-text-muted">
              No tasks found.
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Detail Area Placeholder */}
      <div className="flex-1 bg-surface-muted/30 p-6 flex items-center justify-center text-text-muted/50">
        <div className="text-center">
          <p className="text-sm font-medium">Select a task to view details</p>
          <p className="text-xs mt-1 opacity-70">(Chat & Activity stream coming soon)</p>
        </div>
      </div>
    </div>
  );
}
