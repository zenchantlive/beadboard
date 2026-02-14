'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { BeadIssue } from '../lib/types';

interface UseBeadsSubscriptionResult {
  issues: BeadIssue[];
  refresh: () => Promise<void>;
  updateLocal: (issues: BeadIssue[] | ((prev: BeadIssue[]) => BeadIssue[])) => void;
}

interface FetchResponse {
  ok: boolean;
  issues?: BeadIssue[];
  error?: { message?: string };
}

async function fetchIssues(projectRoot: string): Promise<BeadIssue[]> {
  const response = await fetch(`/api/beads/read?projectRoot=${encodeURIComponent(projectRoot)}`, {
    cache: 'no-store',
  });
  const payload = (await response.json()) as FetchResponse;
  if (!response.ok || !payload.ok || !payload.issues) {
    throw new Error(payload.error?.message ?? 'Failed to refresh issues');
  }
  return payload.issues;
}

export function useBeadsSubscription(
  initialIssues: BeadIssue[],
  projectRoot: string,
  options: { onUpdate?: () => void } = {}
): UseBeadsSubscriptionResult {
  const [issues, setIssues] = useState<BeadIssue[]>(initialIssues);
  const refreshInFlightRef = useRef(false);
  const { onUpdate } = options;

  // Allow parent to update local state (e.g. optimistic updates)
  const updateLocal = useCallback((newIssues: BeadIssue[] | ((prev: BeadIssue[]) => BeadIssue[])) => {
    setIssues(newIssues);
  }, []);

  // Update local state when initial props change (e.g. server re-render)
  useEffect(() => {
    setIssues(initialIssues);
  }, [initialIssues]);

  const refresh = useCallback(async (options: { silent?: boolean } = {}) => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    try {
      const reconciled = await fetchIssues(projectRoot);
      setIssues(reconciled);
      onUpdate?.();
    } catch (error) {
      if (!options.silent) {
        console.error('[BeadsSubscription] Refresh failed:', error);
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [projectRoot, onUpdate]);

  useEffect(() => {
    console.log('[SSE] Connecting to event source for:', projectRoot);
    const source = new EventSource(`/api/events?projectRoot=${encodeURIComponent(projectRoot)}`);
    
    source.onopen = () => {
      console.log('[SSE] Connection opened');
    };
    
    source.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
    };
    
    const onIssues = (event: MessageEvent) => {
      console.log('🚨 SSE RECEIVED:', event.data);
      onUpdate?.();
      void refresh({ silent: true });
    };

    source.addEventListener('issues', onIssues as EventListener);

    return () => {
      console.log('[SSE] Closing connection');
      source.removeEventListener('issues', onIssues as EventListener);
      source.close();
    };
  }, [projectRoot, refresh]);

  return { issues, refresh, updateLocal };
}
