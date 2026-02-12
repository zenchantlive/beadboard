interface StatPillProps {
  label: string;
  value: number;
}

export function StatPill({ label, value }: StatPillProps) {
  return (
    <div
      style={{
        border: '1px solid #d7dee8',
        borderRadius: 12,
        padding: '0.6rem 0.8rem',
        background: '#ffffff',
        minWidth: 90,
      }}
    >
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5e6b7a' }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f1720' }}>{value}</div>
    </div>
  );
}
