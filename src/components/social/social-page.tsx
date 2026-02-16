'use client';

import { useMemo, useState } from 'react';
import type { BeadIssue } from '../../lib/types';
import { buildSocialCards } from '../../lib/social-cards';
import { SocialCard } from './social-card';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const INITIAL_LIMIT = 16; // 4x4 grid

interface SocialPageProps {
  issues: BeadIssue[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function SocialPage({ issues, selectedId, onSelect }: SocialPageProps) {
  const [expanded, setExpanded] = useState(false);
  const cards = useMemo(() => buildSocialCards(issues), [issues]);
  const visibleCards = expanded ? cards : cards.slice(0, INITIAL_LIMIT);
  const hasMore = cards.length > INITIAL_LIMIT;

  return (
    <div className="p-4">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {visibleCards.map((card) => (
          <SocialCard
            key={card.id}
            data={card}
            selected={selectedId === card.id}
            onClick={() => onSelect(card.id)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => setExpanded(true)}
            className="gap-2 border-white/10 bg-white/5 hover:bg-white/10"
          >
            Show {cards.length - INITIAL_LIMIT} more
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {cards.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          No tasks found.
        </div>
      )}
    </div>
  );
}
