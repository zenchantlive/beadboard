import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
}

export function Chip({ children }: ChipProps) {
  return (
    <span
      style={{
        border: '1px solid #d7dee8',
        borderRadius: 999,
        padding: '0.2rem 0.55rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#1f2a38',
        background: '#f7fafc',
      }}
    >
      {children}
    </span>
  );
}
