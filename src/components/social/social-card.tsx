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

function RelationshipItem({ id, color }: { id: string; color: 'unlocks' | 'blocks' }) {
  const dotColor = color === 'unlocks' ? 'bg-rose-400' : 'bg-amber-400';
  const borderColor = color === 'unlocks' ? 'border-rose-500/20' : 'border-amber-500/20';
  const hoverBorder = color === 'unlocks' ? 'group-hover:border-rose-500/40' : 'group-hover:border-amber-500/40';

  return (
    <div className={cn(
      "group flex items-center gap-2 rounded border bg-white/5 px-2.5 py-2 transition-colors",
      borderColor,
      hoverBorder,
      "hover:bg-white/10"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      <span className="font-mono text-[10px] text-text-muted">{id}</span>
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
  // NEW semantic: blocks = what I block (amber), unblocks = what blocks me (rose)
  const hasBlocks = data.blocks.length > 0;
  const hasUnblocks = data.unblocks.length > 0;

  return (
    <BaseCard
      className={cn('min-w-[220px] max-w-[320px]', className)}
      selected={selected}
      status={data.status}
      onClick={onClick}
    >
      <div className="space-y-3">
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

        {(hasBlocks || hasUnblocks) && (
          <div className="space-y-2 pt-1">
            {/* BLOCKED BY: tasks blocking THIS task (rose) */}
            {hasUnblocks && (
              <div className="rounded-lg bg-black/20 p-2 border border-white/5">
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-rose-400/80 pl-0.5">Blocked By</p>
                <div className="flex flex-col gap-1.5">
                  {data.unblocks.map((id) => (
                    <RelationshipItem key={id} id={id} color="unlocks" />
                  ))}
                </div>
              </div>
            )}
            
            {/* BLOCKING: tasks THIS task blocks (amber) */}
            {hasBlocks && (
              <div className="rounded-lg bg-black/20 p-2 border border-white/5">
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-amber-400/80 pl-0.5">Blocking</p>
                <div className="flex flex-col gap-1.5">
                  {data.blocks.map((id) => (
                    <RelationshipItem key={id} id={id} color="blocks" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-1">
            {data.agents.slice(0, 3).map((agent) => (
              <AgentAvatar
                key={agent.name}
                name={agent.name}
                status={agent.status as AgentStatus}
                role={agent.role}
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
