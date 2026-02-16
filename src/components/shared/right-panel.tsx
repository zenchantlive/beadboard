'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useResponsive } from '../../hooks/use-responsive';
import { useUrlState } from '../../hooks/use-url-state';

export interface RightPanelProps {
  children?: ReactNode;
  isOpen?: boolean;
}

export function RightPanel({ children, isOpen: externalIsOpen }: RightPanelProps) {
  const { isMobile, isDesktop } = useResponsive();
  const { panel, togglePanel } = useUrlState();
  
  const isOpen = externalIsOpen ?? (panel === 'open');

  if (isDesktop) {
    return (
      <div
        className="overflow-y-auto transition-all duration-300"
        style={{
          width: isOpen ? '17rem' : '0',
          backgroundColor: 'var(--color-bg-card)',
          borderLeft: isOpen ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        }}
        data-testid="right-panel-desktop"
      >
        {isOpen && (
          <div className="p-4" style={{ color: 'var(--color-text-secondary)' }}>
            {children || <span>Right Panel</span>}
          </div>
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
          backgroundColor: 'var(--color-bg-card)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
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
