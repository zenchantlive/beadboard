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
  const { rightPanel, toggleRightPanel } = useUrlState();
  
  const isOpen = externalIsOpen ?? (rightPanel === 'open');

  if (isDesktop) {
    return (
      <div
        className="ui-shell-panel flex overflow-hidden h-full"
        style={{
          boxShadow: isOpen ? '-12px 0 24px -16px rgba(0,0,0,0.5)' : 'none',
        }}
        data-testid="right-panel-desktop"
      >
        {isOpen && (
          <>
            {/* Main Content (Chat or Activity) */}
            <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
              <div className="border-l border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)]">
                <div className="px-3 py-2 border-b border-[var(--ui-border-soft)]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Agent Pool Monitor</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-[var(--ui-bg-shell)]">
                 {/* Remove default padding to allow edge-to-edge chat */}
                 {children || <span>Right Panel</span>}
              </div>
            </div>

            {/* Side Rail (Mini Activity - Only if provided) */}
            {rail && (
              <div
                className="h-full w-10 flex-shrink-0 shadow-[-10px_0_20px_-18px_rgba(0,0,0,0.9)]"
                style={{
                  background: 'var(--ui-bg-shell)',
                  borderLeft: '1px solid var(--ui-border-soft)',
                }}
              >
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
    toggleRightPanel();
  };

  const handleCloseClick = () => {
    toggleRightPanel();
  };

  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50"
        style={{
          backgroundColor: 'var(--ui-bg-panel)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          overscrollBehavior: 'contain',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'rgba(0,0,0,0.08)',
        }}
        data-testid="right-panel-mobile"
      >
        <div className="flex justify-end px-4 py-3">
          <button
            onClick={handleCloseClick}
            className="p-2 rounded-md hover:bg-white/10"
            style={{ color: 'var(--ui-text-muted)' }}
            data-testid="right-panel-close"
            aria-label="Close panel"
          >
            <X size={24} />
          </button>
        </div>
        <div
          className="overflow-y-auto px-4 pb-4"
          style={{
            height: 'calc(100% - 4rem)',
            color: 'var(--ui-text-primary)',
            overscrollBehavior: 'contain',
          }}
        >
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
          background: 'var(--ui-bg-panel)',
          borderLeft: '1px solid var(--ui-border-soft)',
          boxShadow: '-12px 0 24px -16px rgba(0,0,0,0.5)',
        }}
        data-testid="right-panel-tablet"
      >
        <div className="flex justify-end p-4">
          <button
            onClick={handleCloseClick}
            className="p-2 rounded-md hover:bg-white/10"
            style={{ color: 'var(--ui-text-muted)' }}
            data-testid="right-panel-close"
            aria-label="Close panel"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-4" style={{ color: 'var(--ui-text-primary)' }}>
          {children || <span>Right Panel</span>}
        </div>
      </div>
    </>
  );
}

export default RightPanel;
