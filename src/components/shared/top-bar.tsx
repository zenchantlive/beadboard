'use client';

import { ReactNode, useState } from 'react';
import { AlertTriangle, LayoutGrid, Lock, Plus, Sidebar, SidebarClose } from 'lucide-react';
import { useUrlState } from '../../hooks/use-url-state';
import { useResponsive } from '../../hooks/use-responsive';
import { ThemeToggle } from './theme-toggle';

export interface TopBarProps {
  onCreateTask?: () => Promise<void> | void;
  isCreatingTask?: boolean;
  taskActionMessage?: string;
  children?: ReactNode;
  totalTasks?: number;
  criticalAlerts?: number;
  blockedAgentCount?: number;
  idleCount?: number;
  busyCount?: number;
  actor?: string;
  onActorChange?: (name: string) => void;
  onLaunchSwarm?: () => void;
  onOpenBlockedTriage?: () => void;
  blockedEventCount?: number;
  completedEventCount?: number;
  onCompletedIndicatorClick?: () => void;
  onBlockedIndicatorClick?: () => void;
}

interface MetricTileProps {
  label: string;
  value: number;
  accent?: 'ready' | 'blocked' | 'info' | 'warning';
}

function MetricTile({ label, value, accent = 'info' }: MetricTileProps) {
  const accentColor =
    accent === 'ready'
      ? 'var(--accent-success)'
      : accent === 'blocked'
        ? 'var(--accent-danger)'
        : accent === 'warning'
          ? 'var(--accent-warning)'
          : 'var(--accent-info)';

  return (
    <div className="hidden items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] px-2.5 py-1 text-xs md:inline-flex">
      <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-[var(--text-tertiary)]">{label}</p>
      <p className="font-mono text-sm leading-none text-[var(--text-primary)]">{value}</p>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
    </div>
  );
}

function IdentityChip({ actor, onActorChange }: { actor: string; onActorChange: (name: string) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={actor}
        onChange={e => onActorChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }}
        placeholder="your name"
        className="h-7 w-28 rounded-full border border-[var(--accent-info)] bg-[var(--surface-tertiary)] px-3 text-xs text-[var(--text-primary)] outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Set your operator name"
      className="inline-flex h-7 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] px-3 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-info)] hover:text-[var(--text-primary)]"
    >
      {actor || <span className="text-[var(--text-tertiary)]">your name</span>}
    </button>
  );
}

export function TopBar({
  onCreateTask,
  isCreatingTask = false,
  taskActionMessage,
  children,
  totalTasks = 0,
  criticalAlerts = 0,
  blockedAgentCount = 0,
  idleCount = 0,
  busyCount = 0,
  actor = '',
  onActorChange,
  onLaunchSwarm,
  onOpenBlockedTriage,
  blockedEventCount = 0,
  completedEventCount = 0,
  onCompletedIndicatorClick,
  onBlockedIndicatorClick,
}: TopBarProps) {
  const { leftPanel, toggleLeftPanel, rightPanel, toggleRightPanel, blockedOnly, toggleBlockedOnly } = useUrlState();
  const { isDesktop } = useResponsive();

  return (
    <header className="flex h-[var(--topbar-height)] items-center justify-between border-b border-[var(--border-strong)] bg-[var(--surface-elevated)]" data-testid="top-bar">
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={toggleLeftPanel}
          className="ml-3 mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-info)]"
          aria-label={leftPanel === 'open' ? 'Collapse Sidebar' : 'Expand Sidebar'}
          aria-pressed={leftPanel === 'open'}
          data-testid="hamburger-button"
        >
          {leftPanel === 'open' ? <SidebarClose className="h-4 w-4" aria-hidden="true" /> : <Sidebar className="h-4 w-4" aria-hidden="true" />}
        </button>

        <div className="mr-3 flex min-w-[210px] items-center gap-2 border-r border-[var(--border-subtle)] px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--surface-quaternary)] text-[var(--accent-success)]">
            <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.04em] text-[var(--text-primary)]">Command Grid</p>
            <p className="font-mono text-[10px] text-[var(--text-tertiary)]">v2.4.0-stable</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 pl-2 md:flex">
          <MetricTile label="Total" value={totalTasks} accent="ready" />
          <MetricTile label="Blocked" value={blockedAgentCount} accent="blocked" />
          <MetricTile label="Busy" value={busyCount} accent="warning" />
          <MetricTile label="Idle" value={idleCount} accent="info" />
        </div>
      </div>

      <div className="mr-3 flex items-center gap-2">
        {blockedEventCount > 0 && (
          <button
            type="button"
            onClick={onBlockedIndicatorClick}
            title={`${blockedEventCount} agent${blockedEventCount === 1 ? '' : 's'} blocked — click to view`}
            className="relative inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            data-testid="blocked-event-indicator"
            aria-label={`${blockedEventCount} agent${blockedEventCount === 1 ? '' : 's'} blocked — click to view`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">{blockedEventCount} Blocked</span>
            <span className="sm:hidden">{blockedEventCount}</span>
          </button>
        )}

        {completedEventCount > 0 && (
          <button
            type="button"
            onClick={onCompletedIndicatorClick}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            data-testid="completed-event-indicator"
            aria-label={`${completedEventCount} completed worker${completedEventCount === 1 ? '' : 's'} awaiting review`}
            title={`${completedEventCount} completed worker${completedEventCount === 1 ? '' : 's'} awaiting review`}
          >
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">{completedEventCount} Completed</span>
            <span className="sm:hidden">{completedEventCount}</span>
          </button>
        )}

        {children ?? (
          <>
<button
              type="button"
              onClick={onOpenBlockedTriage}
              aria-pressed={blockedOnly}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.11em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-info)]"
              style={{
                borderColor: blockedOnly
                  ? 'var(--accent-danger)'
                  : 'var(--border-default)',
                backgroundColor: blockedOnly
                  ? 'var(--status-blocked)'
                  : 'var(--surface-tertiary)',
                color: blockedOnly ? '#ffd4dd' : 'var(--text-primary)',
              }}
              data-testid="blocked-items-button"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Blocked Items
              <span className="rounded-full bg-[var(--accent-danger)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-inverse)]">
                {criticalAlerts}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                void onCreateTask?.();
              }}
              disabled={isCreatingTask}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent-success)] bg-[var(--accent-success)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-[var(--text-inverse)] transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-info)] disabled:opacity-60"
              data-testid="new-task-button"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {isCreatingTask ? 'Creating…' : 'New Task'}
            </button>
          </>
        )}

        {onLaunchSwarm ? (
          <button
            type="button"
            onClick={onLaunchSwarm}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-emerald-400 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-info)]"
            aria-label="Launch Swarm"
          >
            Launch Swarm
          </button>
        ) : null}
        {onActorChange ? <IdentityChip actor={actor} onActorChange={onActorChange} /> : null}

        <ThemeToggle />

        {isDesktop ? (
          <button
            type="button"
            onClick={toggleRightPanel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-info)]"
            aria-label={rightPanel === 'open' ? 'Collapse Right Sidebar' : 'Expand Right Sidebar'}
            aria-pressed={rightPanel === 'open'}
            data-testid="settings-button"
          >
            <Sidebar className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        <span className="sr-only" aria-live="polite">
          {taskActionMessage ?? ''}
        </span>
      </div>

    </header>
  );
}

export default TopBar;
