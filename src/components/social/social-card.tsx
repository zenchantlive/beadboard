import type { ReactNode, MouseEventHandler } from 'react';
import { cn } from '../../lib/utils';
import type { SocialCard as SocialCardData, AgentStatus } from '../../lib/social-cards';
import { AgentAvatar } from '../shared/agent-avatar';

interface SocialCardProps {
  data: SocialCardData;
  className?: string;
  selected?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onJumpToGraph?: (id: string) => void;
  onJumpToKanban?: (id: string) => void;
}

// "Hard Style" Dependency Item (from TaskCardGrid inspiration)
function DependencyItem({ id, type }: { id: string; type: 'blocked-by' | 'blocking' }) {
  const styles = type === 'blocked-by' 
    ? 'border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/10' 
    : 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10';
  
  const dotColor = type === 'blocked-by' ? 'bg-rose-500' : 'bg-amber-500';

  return (
    <div className={cn(
      "flex items-center gap-2 px-2.5 py-2 rounded-md border bg-white/5 transition-all duration-200 cursor-default",
      styles
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", dotColor)} />
      <span className="font-mono text-[10px] text-text-secondary">{id}</span>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className="group flex items-center justify-center p-2 rounded-full hover:bg-white/10 text-text-muted hover:text-white transition-all active:scale-95"
      title={label}
    >
      {icon}
    </button>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const color = {
    ready: 'bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]',
    in_progress: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]',
    blocked: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]',
    closed: 'bg-slate-500',
  }[status] || 'bg-slate-500';

  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full animate-pulse", color)} />
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/80">
        {status.replace('_', ' ')}
      </span>
    </div>
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
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex flex-col p-6 gap-4 transition-all duration-300 ease-out",
        "rounded-[2rem]", // Elegant roundness
        "bg-[#252525]/90 backdrop-blur-xl", // Glassy dark
        "border border-white/5 hover:border-white/10",
        "shadow-lg hover:shadow-2xl hover:-translate-y-1",
        selected ? "ring-2 ring-amber-500/50 shadow-amber-900/20" : "",
        className
      )}
    >
      {/* Header: Status & ID */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-teal-500/90 tracking-tight">
            {data.id}
          </span>
          <div className="h-3 w-[1px] bg-white/10" />
          <StatusIndicator status={data.status} />
        </div>
        <div className="text-[10px] text-text-muted/40 font-mono">
          {new Date(data.lastActivity).toLocaleDateString()}
        </div>
      </div>

      {/* Hero: Title */}
      <h3 className="text-xl font-bold text-white leading-snug tracking-tight group-hover:text-amber-50 transition-colors">
        {data.title}
      </h3>

      {/* Content: Dependencies (Hard Style List) */}
      {(hasBlocks || hasUnblocks) && (
        <div className="flex flex-col gap-3 mt-2">
          {/* Blocked By */}
          {hasUnblocks && (
            <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-black/20 border border-white/5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-rose-400/70 pl-1">Blocked By</span>
              <div className="flex flex-col gap-1.5">
                {data.unblocks.slice(0, 3).map((id) => (
                  <DependencyItem key={id} id={id} type="blocked-by" />
                ))}
                {data.unblocks.length > 3 && (
                  <div className="px-2 text-[10px] text-rose-400/50 italic">+{data.unblocks.length - 3} more</div>
                )}
              </div>
            </div>
          )}

          {/* Blocking */}
          {hasBlocks && (
            <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-black/20 border border-white/5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70 pl-1">Blocking</span>
              <div className="flex flex-col gap-1.5">
                {data.blocks.slice(0, 3).map((id) => (
                  <DependencyItem key={id} id={id} type="blocking" />
                ))}
                {data.blocks.length > 3 && (
                  <div className="px-2 text-[10px] text-amber-400/50 italic">+{data.blocks.length - 3} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer: Social Actions & Crew */}
      <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
        
        {/* Crew (Left) */}
        <div className="flex items-center -space-x-3 pl-2">
          {data.agents.slice(0, 4).map((agent) => (
            <div key={agent.name} className="relative transition-transform hover:scale-110 hover:z-10 ring-2 ring-[#252525] rounded-full">
              <AgentAvatar
                name={agent.name}
                status={agent.status as AgentStatus}
                role={agent.role}
                size="sm"
              />
            </div>
          ))}
          {data.agents.length === 0 && (
            <span className="text-xs text-text-muted/30 font-medium">No Crew</span>
          )}
        </div>

        {/* Action Dock (Right) */}
        <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-1 border border-white/5">
          <ActionButton
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            }
            label="Graph"
            onClick={() => onJumpToGraph?.(data.id)}
          />
          <div className="w-[1px] h-4 bg-white/10" />
          <ActionButton
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            }
            label="Kanban"
            onClick={() => onJumpToKanban?.(data.id)}
          />
        </div>
      </div>
    </div>
  );
}