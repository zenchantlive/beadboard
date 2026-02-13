import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        ui: ['var(--font-ui)', 'Segoe UI', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Consolas', 'monospace'],
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
        card: '0 14px 36px rgba(4, 8, 17, 0.45)',
        panel: '0 24px 56px rgba(4, 8, 17, 0.58)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
};

export default config;
