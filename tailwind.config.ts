import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        ui: ['Segoe UI', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
          raised: 'var(--color-surface-raised)',
        },
        text: {
          strong: 'var(--color-text-strong)',
          body: 'var(--color-text-body)',
          muted: 'var(--color-text-muted)',
        },
        border: {
          soft: 'var(--color-border-soft)',
          strong: 'var(--color-border-strong)',
        },
      },
      boxShadow: {
        card: '0 6px 18px rgba(15, 23, 42, 0.08)',
        panel: '0 18px 42px rgba(15, 23, 42, 0.2)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
};

export default config;
