'use client';

import { ReactNode } from 'react';
import { useUrlState, ViewType } from '../../hooks/use-url-state';
import { useResponsive } from '../../hooks/use-responsive';

export interface TopBarProps {
  children?: ReactNode;
}

export function TopBar({ children }: TopBarProps) {
  const { view, setView, togglePanel } = useUrlState();
  const { isDesktop } = useResponsive();

  const tabs: { id: ViewType; label: string }[] = [
    { id: 'social', label: 'Social' },
    { id: 'graph', label: 'Graph' },
    { id: 'swarm', label: 'Swarm' },
  ];

  const showHamburger = !isDesktop;

  return (
    <header
      className="h-12 flex items-center justify-between px-4"
      style={{
        background:
          'radial-gradient(circle_at_10%_50%,rgba(212,165,116,0.14),transparent_30%),radial-gradient(circle_at_90%_40%,rgba(91,168,160,0.14),transparent_30%),var(--color-bg-card)',
        boxShadow: '0 14px 22px -20px rgba(0,0,0,0.85)',
      }}
      data-testid="top-bar"
    >
      <div className="flex items-center gap-2">
        {showHamburger && (
          <button
            onClick={togglePanel}
            className="p-2 transition-colors hover:text-[var(--color-text-primary)]"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Open menu"
            data-testid="hamburger-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <nav className="flex items-center gap-1" role="tablist">
          {tabs.map((tab) => {
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                role="tab"
                aria-selected={isActive}
                className={`px-4 py-2 text-sm transition-colors rounded-md ${
                  isActive
                    ? 'font-bold shadow-[inset_0_-2px_0_var(--color-accent-green),0_10px_18px_-14px_rgba(0,0,0,0.8)] bg-white/[0.03]'
                    : 'font-normal hover:text-[var(--color-text-primary)]'
                }`}
                style={{
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                }}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {children || (
          <>
            <input
              type="text"
              placeholder="Filter..."
              className="px-3 py-1.5 text-sm rounded focus:outline-none"
              style={{
                backgroundColor: 'var(--color-bg-input)',
                color: 'var(--color-text-primary)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 14px -12px rgba(0,0,0,0.85)',
              }}
              data-testid="filter-input"
            />
            <button
              className="p-2 transition-colors hover:text-[var(--color-text-primary)]"
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label="Settings"
              data-testid="settings-button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default TopBar;
