'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

const MOBILE_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

function getBreakpoint(width: number): ResponsiveState {
  if (width < MOBILE_BREAKPOINT) {
    return {
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      breakpoint: 'mobile',
    };
  }
  if (width < DESKTOP_BREAKPOINT) {
    return {
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      breakpoint: 'tablet',
    };
  }
  return {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'desktop',
  };
}

// Default to desktop on server to match initial SSR render
const DEFAULT_STATE: ResponsiveState = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  breakpoint: 'desktop',
};

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  const handleResize = useCallback(() => {
    if (typeof window !== 'undefined') {
      setState(getBreakpoint(window.innerWidth));
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    setState(getBreakpoint(window.innerWidth));

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Return default state before mount to prevent hydration mismatch
  if (!mounted) {
    return DEFAULT_STATE;
  }

  return state;
}

export default useResponsive;
