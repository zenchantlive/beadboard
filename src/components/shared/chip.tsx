import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  tone?: 'default' | 'status' | 'priority';
}

const CHIP_TONE_CLASS: Record<NonNullable<ChipProps['tone']>, string> = {
  default:
    'border border-border-soft bg-gradient-to-b from-surface-muted/60 to-surface-muted/85 text-text-body shadow-[0_1px_2px_rgba(0,0,0,0.15)]',
  status: 'border border-border-soft/80 bg-gradient-to-b from-zinc-500/15 to-zinc-500/25 text-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
  priority:
    'border border-amber-300/25 bg-gradient-to-b from-amber-500/15 to-amber-500/25 text-amber-50 shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
};

export function Chip({ children, tone = 'default' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-semibold tracking-wide ${CHIP_TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
