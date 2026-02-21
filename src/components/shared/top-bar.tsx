'use client';

import { ReactNode } from 'react';
import { LayoutGrid, Lock, Plus, Sidebar, SidebarClose } from 'lucide-react';
import { useUrlState } from '../../hooks/use-url-state';
import { useResponsive } from '../../hooks/use-responsive';

export interface TopBarProps {
  onCreateTask?: () => Promise<void> | void;
  isCreatingTask?: boolean;
  taskActionMessage?: string;
  children?: ReactNode;
  totalTasks?: number;
  criticalAlerts?: number;
  idleCount?: number;
  busyCount?: number;
}

interface MetricTileProps {
  label: string;
  value: number;
  accent?: 'ready' | 'blocked' | 'info' | 'warning';
}

function MetricTile({ label, value, accent = 'info' }: MetricTileProps) {
  const accentColor =
    accent === 'ready'
      ? 'var(--ui-accent-ready)'
      : accent === 'blocked'
        ? 'var(--ui-accent-blocked)'
        : accent === 'warning'
          ? 'var(--ui-accent-warning)'
          : 'var(--ui-accent-info)';

  return (
    <div className="hidden items-center gap-2 rounded-md border border-[var(--ui-border-soft)] bg-[color-mix(in_srgb,var(--ui-bg-panel)_84%,black)] px-2.5 py-1 text-xs md:inline-flex">
      <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-[var(--ui-text-muted)]">{label}</p>
      <p className="font-mono text-sm leading-none text-[var(--ui-text-primary)]">{value}</p>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
    </div>
  );
}

export function TopBar({
  onCreateTask,
  isCreatingTask = false,
  taskActionMessage,
  children,
  totalTasks = 0,
  criticalAlerts = 0,
  idleCount = 0,
  busyCount = 0,
}: TopBarProps) {
  const { leftPanel, toggleLeftPanel, rightPanel, toggleRightPanel, blockedOnly, toggleBlockedOnly } = useUrlState();
  const { isDesktop } = useResponsive();

  return (
    <header className="ui-shell-topbar flex h-[var(--topbar-height)] items-center justify-between border-b border-[var(--ui-border-soft)]" data-testid="top-bar">
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={toggleLeftPanel}
          className="ml-3 mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ui-text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--ui-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-info)]"
          aria-label={leftPanel === 'open' ? 'Collapse Sidebar' : 'Expand Sidebar'}
          aria-pressed={leftPanel === 'open'}
          data-testid="hamburger-button"
        >
          {leftPanel === 'open' ? <SidebarClose className="h-4 w-4" aria-hidden="true" /> : <Sidebar className="h-4 w-4" aria-hidden="true" />}
        </button>

        <div className="mr-3 flex min-w-[210px] items-center gap-2 border-r border-[var(--ui-border-soft)] px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--ui-accent-ready)_24%,var(--ui-bg-panel))] text-[var(--ui-accent-ready)]">
            <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.04em] text-[var(--ui-text-primary)]">Command Grid</p>
            <p className="font-mono text-[10px] text-[var(--ui-text-muted)]">v2.4.0-stable</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 pl-2 md:flex">
          <MetricTile label="Total" value={totalTasks} accent="ready" />
          <MetricTile label="Blocked" value={criticalAlerts} accent="blocked" />
          <MetricTile label="Busy" value={busyCount} accent="warning" />
          <MetricTile label="Idle" value={idleCount} accent="info" />
        </div>
      </div>

      <div className="mr-3 flex items-center gap-2">
        {children ?? (
          <>
            <button
              type="button"
              onClick={toggleBlockedOnly}
              aria-pressed={blockedOnly}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.11em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-info)]"
              style={{
                borderColor: blockedOnly
                  ? 'color-mix(in srgb, var(--ui-accent-blocked) 78%, transparent)'
                  : 'var(--ui-border-soft)',
                backgroundColor: blockedOnly
                  ? 'color-mix(in srgb, var(--ui-accent-blocked) 20%, var(--ui-bg-panel))'
                  : 'color-mix(in srgb, var(--ui-bg-panel) 88%, black)',
                color: blockedOnly ? '#ffd4dd' : 'var(--ui-text-primary)',
              }}
              data-testid="blocked-items-button"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Blocked Items
              <span className="rounded-full bg-[color-mix(in_srgb,var(--ui-accent-blocked)_84%,black)] px-1.5 py-0.5 font-mono text-[10px] text-[#fff0f3]">
                {criticalAlerts}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                void onCreateTask?.();
              }}
              disabled={isCreatingTask}
              className="inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--ui-accent-ready)_80%,black)] bg-[var(--ui-accent-action-green)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-[#072514] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-accent-action-green)_84%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-info)] disabled:opacity-60"
              data-testid="new-task-button"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {isCreatingTask ? 'Creating…' : 'New Task'}
            </button>
          </>
        )}

        {isDesktop ? (
          <button
            type="button"
            onClick={toggleRightPanel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ui-text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--ui-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-info)]"
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
