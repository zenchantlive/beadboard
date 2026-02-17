import type { ReactNode, MouseEventHandler } from 'react';
import { cn } from '../../lib/utils';
import type { SocialCardStatus } from '../../lib/social-cards';

interface BaseCardProps {
  children: ReactNode;
  className?: string;
  selected?: boolean;
  status?: SocialCardStatus;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const STATUS_BORDERS: Record<SocialCardStatus, string> = {
  ready: 'border-[var(--status-ready)]',
  in_progress: 'border-[var(--status-in-progress)]',
  blocked: 'border-[var(--status-blocked)]',
  closed: 'border-[var(--status-closed)]',
};

export function BaseCard({ 
  children, 
  className, 
  selected = false, 
  status,
  onClick 
}: BaseCardProps) {
  const borderClass = status 
    ? STATUS_BORDERS[status] 
    : 'border-white/[0.06]';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      className={cn(
        'rounded-[var(--radius-card)] border bg-[var(--color-bg-card)] px-3.5 py-3 transition duration-200',
        'shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]',
        borderClass,
        onClick && 'cursor-pointer hover:border-white/[0.10]',
        selected && 'ring-1 ring-amber-500/30 shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}
