'use client';

import { useResponsive } from '../../hooks/use-responsive';
import { useUrlState, ViewType } from '../../hooks/use-url-state';

const tabs: { id: ViewType; label: string; icon: string }[] = [
  { id: 'social', label: 'Social', icon: '≡' },
  { id: 'graph', label: 'Graph', icon: '◊' },
  { id: 'swarm', label: 'Swarm', icon: '≋' },
];

export function MobileNav() {
  const { view, setView } = useUrlState();
  const { isMobile, isTablet } = useResponsive();

  if (!isMobile && !isTablet) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-14 flex items-center justify-around border-t"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-soft)',
        zIndex: 50,
      }}
      role="tablist"
      data-testid="mobile-nav"
    >
      {tabs.map((tab) => {
        const isActive = view === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            role="tab"
            aria-selected={isActive}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
            style={{
              color: isActive ? 'var(--color-accent-green)' : 'var(--color-text-secondary)',
            }}
            data-testid={`mobile-tab-${tab.id}`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileNav;
