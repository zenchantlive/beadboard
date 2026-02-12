import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  tone?: 'default' | 'status' | 'priority';
}

const CHIP_TONE_CLASS: Record<NonNullable<ChipProps['tone']>, string> = {
  default: 'border-border-soft bg-surface-muted/75 text-text-body',
  status: 'border-zinc-300/30 bg-zinc-500/20 text-zinc-100',
  priority: 'border-amber-300/30 bg-amber-500/20 text-amber-50',
};

export function Chip({ children, tone = 'default' }: ChipProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${CHIP_TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}
