import type { ReactNode, MouseEventHandler } from 'react';
import { cn } from '@/lib/utils';

interface BaseCardProps {
  children: ReactNode;
  className?: string;
  selected?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function BaseCard({ children, className, selected = false, onClick }: BaseCardProps) {
  const selectedClass = selected
    ? 'ring-1 ring-amber-200/20 shadow-[0_24px_48px_-18px_rgba(0,0,0,0.88),0_0_26px_rgba(251,191,36,0.14)]'
    : 'shadow-[0_18px_38px_-18px_rgba(0,0,0,0.82),0_6px_18px_-10px_rgba(0,0,0,0.72)] hover:shadow-[0_24px_52px_-16px_rgba(0,0,0,0.9),0_10px_26px_-10px_rgba(0,0,0,0.78)]';

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
        'rounded-xl border border-white/[0.06] bg-[#363636] px-3.5 py-3 transition duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        onClick && 'cursor-pointer hover:border-white/[0.10]',
        selectedClass,
        className
      )}
    >
      {children}
    </div>
  );
}
