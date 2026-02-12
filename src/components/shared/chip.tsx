import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  tone?: 'default' | 'status' | 'priority';
}

const CHIP_TONE_CLASS: Record<NonNullable<ChipProps['tone']>, string> = {
  default: 'border-border-soft bg-surface-muted/70 text-text-body',
  status: 'border-cyan-300/25 bg-cyan-400/15 text-cyan-100',
  priority: 'border-amber-300/25 bg-amber-400/15 text-amber-100',
};

export function Chip({ children, tone = 'default' }: ChipProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${CHIP_TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}
