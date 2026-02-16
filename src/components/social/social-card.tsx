import type { ReactNode, MouseEventHandler } from 'react';
import { cn } from '../../lib/utils';
import type { SocialCard as SocialCardData, AgentStatus } from '../../lib/social-cards';
import { AgentAvatar } from '../shared/agent-avatar';
import { BaseCard } from '../shared/base-card';

interface SocialCardProps {
  data: SocialCardData;
  className?: string;
  selected?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onJumpToGraph?: (id: string) => void;
  onJumpToKanban?: (id: string) => void;
}

const RELATIONSHIP_COLORS = {
  unlocks: 'text-emerald-400',
  blocks: 'text-amber-400',
};

const DOT_COLORS = {
  unlocks: 'bg-emerald-400',
  blocks: 'bg-amber-400',
};

function Dot({ color }: { color: 'unlocks' | 'blocks' }) {
  return (
    <span
      className={cn(
        'inline-block h-1.5 w-1.5 rounded-full mr-1.5',
        DOT_COLORS[color]
      )}
    />
  );
}

function RelationshipSection({
  label,
  items,
  color,
}: {
  label: string;
  items: string[];
  color: 'unlocks' | 'blocks';
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-1 text-[11px]">
      <span className={cn('font-medium', RELATIONSHIP_COLORS[color])}>
        {label}:
      </span>
      <div className="flex flex-wrap gap-x-2">
        {items.slice(0, 3).map((id) => (
          <span key={id} className="text-text-muted flex items-center">
            <Dot color={color} />
            {id}
          </span>
        ))}
        {items.length > 3 && (
          <span className="text-text-muted">+{items.length - 3}</span>
        )}
      </div>
    </div>
  );
}

function ViewJumpIcon({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="p-1 text-text-muted hover:text-text-body transition-colors rounded hover:bg-white/5"
    >
      {icon}
    </button>
  );
}

function GraphIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="8" cy="12" r="2" />
      <line x1="5.5" y1="5.5" x2="7" y2="10" />
      <line x1="10.5" y1="5.5" x2="9" y2="10" />
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2" y="2" width="4" height="12" rx="1" />
      <rect x="6" y="2" width="4" height="8" rx="1" />
      <rect x="10" y="2" width="4" height="6" rx="1" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="6" cy="6" r="4" />
      <line x1="9" y1="9" x2="12.5" y2="12.5" />
    </svg>
  );
}

export function SocialCard({
  data,
  className,
  selected = false,
  onClick,
  onJumpToGraph,
  onJumpToKanban,
}: SocialCardProps) {
  const hasUnlocks = data.unlocks.length > 0;
  const hasBlocks = data.blocks.length > 0;

  return (
    <BaseCard
      className={cn('min-w-[220px] max-w-[320px]', className)}
      selected={selected}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-teal-400 font-mono text-sm font-medium">
            {data.id}
          </span>
          <button
            type="button"
            aria-label="Expand"
            className="p-1 text-text-muted hover:text-text-body transition-colors rounded hover:bg-white/5"
          >
            <ExpandIcon />
          </button>
        </div>

        <h3 className="text-text-strong font-semibold text-sm leading-tight line-clamp-2">
          {data.title}
        </h3>

        {(hasUnlocks || hasBlocks) && (
          <div className="space-y-1">
            <RelationshipSection label="UNLOCKS" items={data.unlocks} color="unlocks" />
            <RelationshipSection label="BLOCKS" items={data.blocks} color="blocks" />
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            {data.agents.slice(0, 3).map((agent) => (
              <AgentAvatar
                key={agent.name}
                name={agent.name}
                status={agent.status as AgentStatus}
                size="sm"
              />
            ))}
            {data.agents.length > 3 && (
              <span className="text-text-muted text-xs ml-1">
                +{data.agents.length - 3}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <ViewJumpIcon
              icon={<GraphIcon />}
              label="View in Graph"
              onClick={() => onJumpToGraph?.(data.id)}
            />
            <ViewJumpIcon
              icon={<KanbanIcon />}
              label="View in Kanban"
              onClick={() => onJumpToKanban?.(data.id)}
            />
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
