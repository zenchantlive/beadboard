interface StatPillProps {
  label: string;
  value: number;
  tone?: 'default' | 'critical';
}

export function StatPill({ label, value, tone = 'default' }: StatPillProps) {
  const valueToneClass = tone === 'critical' ? 'text-rose-300' : 'text-text-strong';

  return (
    <div className="min-w-[5.25rem] rounded-xl border border-border-soft bg-surface-muted/72 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${valueToneClass}`}>{value}</div>
    </div>
  );
}
