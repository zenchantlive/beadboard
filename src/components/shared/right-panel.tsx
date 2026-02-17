'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useResponsive } from '../../hooks/use-responsive';
import { useUrlState } from '../../hooks/use-url-state';

export interface RightPanelProps {
  children?: ReactNode;
  rail?: ReactNode;
  isOpen?: boolean;
}

export function RightPanel({ children, rail, isOpen: externalIsOpen }: RightPanelProps) {
  const { isMobile, isDesktop } = useResponsive();
  const { panel, togglePanel } = useUrlState();
  
  const isOpen = externalIsOpen ?? (panel === 'open');
  
  // Calculate width based on content (Standard 17rem vs Chat Mode ~26rem)
  // If rail is present, we are in "Chat Mode" (Wide Panel + Rail)
  // If no rail, we are in "Activity Mode" (Standard Panel)
  const panelWidth = isOpen ? (rail ? '26rem' : '17rem') : '0';

  if (isDesktop) {
    return (
      <div
        className="overflow-hidden transition-all duration-300 flex"
        style={{
          width: panelWidth,
          background:
            'radial-gradient(circle_at_12%_8%,rgba(91,168,160,0.22),transparent_34%),radial-gradient(circle_at_88%_84%,rgba(212,165,116,0.2),transparent_30%),linear-gradient(180deg,rgba(50,50,58,0.98),rgba(40,42,54,0.98))',
          boxShadow: isOpen ? '-24px 0 44px -26px rgba(0,0,0,0.85)' : 'none',
        }}
        data-testid="right-panel-desktop"
      >
        {isOpen && (
          <>
            {/* Main Content (Chat or Activity) */}
            <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                 {/* Remove default padding to allow edge-to-edge chat */}
                 {children || <span>Right Panel</span>}
              </div>
            </div>

            {/* Side Rail (Mini Activity - Only if provided) */}
            {rail && (
              <div className="w-12 h-full flex-shrink-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.24),rgba(0,0,0,0.36))] shadow-[-10px_0_20px_-18px_rgba(0,0,0,0.9)]">
                {rail}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = () => {
    togglePanel();
  };

  const handleCloseClick = () => {
    togglePanel();
  };

  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'var(--color-bg-card)' }}
        data-testid="right-panel-mobile"
      >
        <div className="flex justify-end p-4">
          <button
            onClick={handleCloseClick}
            className="p-2 rounded-md hover:bg-white/10"
            style={{ color: 'var(--color-text-secondary)' }}
            data-testid="right-panel-close"
            aria-label="Close panel"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 4rem)', color: 'var(--color-text-secondary)' }}>
          {children || <span>Right Panel</span>}
        </div>
      </div>
    );
  }

  // Tablet: slide-over
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={handleBackdropClick}
        data-testid="right-panel-backdrop"
      />
      <div
        className="fixed top-0 right-0 h-full z-50 overflow-y-auto"
        style={{
          width: '17rem',
          background:
            'radial-gradient(circle_at_12%_8%,rgba(91,168,160,0.22),transparent_34%),radial-gradient(circle_at_88%_84%,rgba(212,165,116,0.2),transparent_30%),linear-gradient(180deg,rgba(50,50,58,0.98),rgba(40,42,54,0.98))',
          boxShadow: '-24px 0 44px -26px rgba(0,0,0,0.85)',
        }}
        data-testid="right-panel-tablet"
      >
        <div className="flex justify-end p-4">
          <button
            onClick={handleCloseClick}
            className="p-2 rounded-md hover:bg-white/10"
            style={{ color: 'var(--color-text-secondary)' }}
            data-testid="right-panel-close"
            aria-label="Close panel"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-4" style={{ color: 'var(--color-text-secondary)' }}>
          {children || <span>Right Panel</span>}
        </div>
      </div>
    </>
  );
}

export default RightPanel;
