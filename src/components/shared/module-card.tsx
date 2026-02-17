import type { ReactNode, MouseEventHandler } from 'react';
import { cn } from '@/lib/utils';
import type { SocialCardStatus } from '../../lib/social-cards';

interface ModuleCardProps {
  children: ReactNode;
  className?: string;
  selected?: boolean;
  status?: SocialCardStatus;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const STATUS_COLORS: Record<SocialCardStatus, string> = {
  ready: 'bg-emerald-500',
  in_progress: 'bg-amber-500',
  blocked: 'bg-rose-500',
  closed: 'bg-slate-500',
};

const STATUS_BORDER_COLORS: Record<SocialCardStatus, string> = {
  ready: 'border-emerald-500/30',
  in_progress: 'border-amber-500/30',
  blocked: 'border-rose-500/30',
  closed: 'border-slate-500/30',
};

export function ModuleCard({ 
  children, 
  className, 
  selected = false, 
  status = 'ready',
  onClick 
}: ModuleCardProps) {
  // "Industrial Sci-Fi" Aesthetic
  // 1. Top status line (LED bar)
  // 2. Chamfered-feel (using borders/shadows)
  // 3. Technical containment

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
        // Base Geometry
        'relative group flex flex-col',
        'bg-[#1e1e1e] overflow-hidden', // Darker, matte background
        // Borders: Tech-styled
        'border border-white/5',
        STATUS_BORDER_COLORS[status],
        
        // Selection State: "Active Signal"
        selected ? 'ring-1 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.15)]' : 'hover:border-white/20',
        
        // Layout
        'transition-all duration-200',
        className
      )}
      style={{
        // Custom clip-path for chamfered corners? 
        // Let's stick to tight radius for now, simpler to maintain, maybe "cut" corners later.
        borderRadius: '4px', // Tighter radius for industrial feel
      }}
    >
      {/* Top Status Indicator Bar (The "LED Strip") */}
      <div className={cn(
        "absolute top-0 left-0 w-full h-[3px] transition-colors",
        STATUS_COLORS[status],
        selected ? 'opacity-100 shadow-[0_0_8px_currentColor]' : 'opacity-70'
      )} />

      {/* Content Container */}
      <div className="p-4 pt-5 flex flex-col gap-3 h-full">
        {children}
      </div>

      {/* Decorative "Rivets" or Tech-marks */}
      <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-white/10" />
      <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border border-white/10 rounded-[1px]" />
    </div>
  );
}
