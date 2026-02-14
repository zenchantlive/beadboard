import type { ReactNode } from 'react';

interface WorkspaceHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  scope?: ReactNode;
  controls?: ReactNode;
  className?: string;
}

export function WorkspaceHero({
  eyebrow,
  title,
  description,
  action,
  scope,
  controls,
  className = '',
}: WorkspaceHeroProps) {
  return (
    <header
      className={`mb-6 rounded-3xl border border-white/5 bg-[radial-gradient(circle_at_2%_2%,rgba(56,189,248,0.12),transparent_40%),linear-gradient(170deg,rgba(15,23,42,0.92),rgba(11,12,16,0.95))] px-5 py-5 sm:px-8 sm:py-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-2xl ${className}`}
    >
      <p className="system-data text-[10px] uppercase tracking-[0.2em] text-sky-400/70 font-bold">{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="ui-text text-2xl font-bold tracking-tight text-text-strong sm:text-4xl">{title}</h1>
          {action}
        </div>
        <p className="ui-text hidden max-w-md text-sm leading-relaxed text-text-muted/90 sm:block">{description}</p>
      </div>
      {scope ? <div className="mt-3">{scope}</div> : null}
      {controls ? <div className="mt-3">{controls}</div> : null}
    </header>
  );
}

