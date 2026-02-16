'use client';

import { useMemo, useState } from 'react';
import type { BeadIssue } from '../../lib/types';
import type { SwarmCard as SwarmCardType } from '../../lib/swarm-cards';
import { buildSwarmCards } from '../../lib/swarm-cards';
import { SwarmCard } from './swarm-card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ChevronDown } from 'lucide-react';

type SortOption = 'health' | 'activity' | 'progress' | 'name';

const SORT_LABELS: Record<SortOption, string> = {
  health: 'Health',
  activity: 'Activity',
  progress: 'Progress',
  name: 'Name',
};

const INITIAL_LIMIT = 16; // 4x4 grid

const HEALTH_ORDER: Record<string, number> = {
  stuck: 0,
  stale: 1,
  dead: 2,
  active: 3,
};

function sortCards(cards: SwarmCardType[], sortBy: SortOption): SwarmCardType[] {
  const sorted = [...cards];

  switch (sortBy) {
    case 'health':
      return sorted.sort((a, b) => {
        const orderA = HEALTH_ORDER[a.health] ?? 4;
        const orderB = HEALTH_ORDER[b.health] ?? 4;
        return orderA - orderB;
      });
    case 'activity':
      return sorted.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    case 'progress':
      return sorted.sort((a, b) => b.progress - a.progress);
    case 'name':
      return sorted.sort((a, b) => a.swarmId.localeCompare(b.swarmId));
    default:
      return sorted;
  }
}

interface SwarmPageProps {
  issues: BeadIssue[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function SwarmPage({ issues, selectedId, onSelect }: SwarmPageProps) {
  const [sortBy, setSortBy] = useState<SortOption>('health');
  const [expanded, setExpanded] = useState(false);

  const cards = useMemo(() => buildSwarmCards(issues), [issues]);
  const sortedCards = useMemo(() => sortCards(cards, sortBy), [cards, sortBy]);
  const visibleCards = expanded ? sortedCards : sortedCards.slice(0, INITIAL_LIMIT);
  const hasMore = sortedCards.length > INITIAL_LIMIT;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Swarm View
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/10 bg-white/5 hover:bg-white/10"
            >
              <ArrowUpDown className="h-4 w-4" />
              {SORT_LABELS[sortBy]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => setSortBy(option)}
                className={sortBy === option ? 'bg-accent/50' : ''}
              >
                {SORT_LABELS[option]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {visibleCards.map((card) => (
          <div
            key={card.swarmId}
            onClick={() => onSelect(card.swarmId)}
            className={`cursor-pointer rounded-xl transition-all ${
              selectedId === card.swarmId
                ? 'ring-2 ring-[var(--color-accent-amber)]'
                : 'hover:ring-1 hover:ring-white/10'
            }`}
          >
            <SwarmCard card={card} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => setExpanded(true)}
            className="gap-2 border-white/10 bg-white/5 hover:bg-white/10"
          >
            Show {sortedCards.length - INITIAL_LIMIT} more
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {sortedCards.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          No swarms found. Add agents with <code className="px-1 py-0.5 rounded bg-white/5">gt:agent</code> and <code className="px-1 py-0.5 rounded bg-white/5">swarm:*</code> labels.
        </div>
      )}
    </div>
  );
}
