interface StatPillProps {
  label: string;
  value: number;
  tone?: 'default' | 'critical';
}

export function StatPill({ label, value, tone = 'default' }: StatPillProps) {
  const valueToneClass = tone === 'critical' ? 'text-rose-300' : 'text-text-strong';

  return (
    <div className="min-w-[5.25rem] rounded-xl border border-border-soft bg-gradient-to-b from-surface-muted/55 to-surface-muted/75 px-3 py-2 shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
      <div className="ui-text text-[10px] uppercase tracking-[0.16em] text-text-muted">{label}</div>
      <div className={`system-data mt-0.5 text-lg font-semibold ${valueToneClass}`}>{value}</div>
    </div>
  );
}
