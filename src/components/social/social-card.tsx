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

function DependencyPill({ id, type }: { id: string; type: 'blocked-by' | 'blocking' }) {
  // Soft, friendly pills. Rose for "blocked by", Amber for "blocking".
  const styles = type === 'blocked-by' 
    ? 'bg-rose-500/10 text-rose-200 hover:bg-rose-500/20' 
    : 'bg-amber-500/10 text-amber-200 hover:bg-amber-500/20';

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors cursor-default",
      styles
    )}>
      {type === 'blocked-by' ? 'Waiting on ' : 'Blocks '}
      <span className="font-mono ml-1 opacity-80">{id}</span>
    </span>
  );
}

function ActionButton({
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
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
      title={label}
    >
      {icon}
    </button>
  );
}

function GraphIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"></circle>
      <circle cx="6" cy="12" r="3"></circle>
      <circle cx="18" cy="19" r="3"></circle>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    ready: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    in_progress: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    blocked: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }[status as keyof typeof styles] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      styles
    )}>
      {status.replace('_', ' ')}
    </span>
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
  const hasBlocks = data.blocks.length > 0;
  const hasUnblocks = data.unblocks.length > 0;

  return (
    <BaseCard
      // "Post" Styling: hover lift, soft shadow handled by BaseCard update
      className={cn('flex flex-col gap-4 p-5 min-h-[180px]', className)}
      selected={selected}
      status={data.status}
      onClick={onClick}
    >
      {/* Header: ID & Status */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-medium text-teal-400/80">
          {data.id}
        </span>
        <StatusBadge status={data.status} />
      </div>

      {/* Hero: Title */}
      <h3 className="text-lg font-bold text-text-primary leading-tight">
        {data.title}
      </h3>

      {/* Content: Dependencies (Pill Cloud) */}
      {(hasBlocks || hasUnblocks) && (
        <div className="flex flex-wrap gap-2 mt-auto pt-2">
          {/* Unblocks = Blocked By me? No. 
              data.unblocks = tasks blocking THIS task (upstream) -> "Waiting on"
              data.blocks = tasks THIS task blocks (downstream) -> "Blocks" 
          */}
          {data.unblocks.slice(0, 3).map((id) => (
            <DependencyPill key={id} id={id} type="blocked-by" />
          ))}
          {data.blocks.slice(0, 3).map((id) => (
            <DependencyPill key={id} id={id} type="blocking" />
          ))}
          {(data.unblocks.length + data.blocks.length > 6) && (
            <span className="px-2 py-1 text-[10px] text-text-muted/60 italic">
              +{data.unblocks.length + data.blocks.length - 6} more
            </span>
          )}
        </div>
      )}

      {/* Footer: Agents & Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
        {/* Crew */}
        <div className="flex items-center -space-x-2 pl-1">
          {data.agents.map((agent) => (
            <div key={agent.name} className="relative z-0 hover:z-10 transition-transform hover:scale-110">
              <AgentAvatar
                name={agent.name}
                status={agent.status as AgentStatus}
                role={agent.role}
                size="sm"
              />
            </div>
          ))}
          {data.agents.length === 0 && (
            <span className="text-xs text-text-muted/40 italic">Unassigned</span>
          )}
        </div>

        {/* Actions (Share/View) */}
        <div className="flex items-center gap-1">
          <ActionButton
            icon={<GraphIcon />}
            label="View Graph"
            onClick={() => onJumpToGraph?.(data.id)}
          />
          <ActionButton
            icon={<KanbanIcon />}
            label="View Kanban"
            onClick={() => onJumpToKanban?.(data.id)}
          />
        </div>
      </div>
    </BaseCard>
  );
}