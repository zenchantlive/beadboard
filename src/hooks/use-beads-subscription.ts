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
  options: { onUpdate?: (kind: 'issues' | 'telemetry' | 'activity') => void } = {}
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
      onUpdate?.('issues');
    } catch (error) {
      if (!options.silent) {
        console.error('[BeadsSubscription] Refresh failed:', error);
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [projectRoot, onUpdate]);

  useEffect(() => {
    const source = new EventSource(`/api/events?projectRoot=${encodeURIComponent(projectRoot)}`);
    
    source.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
    };
    const onIssues = (event: MessageEvent) => {
      console.log('🚨 SSE ISSUES RECEIVED:', event.data);
      onUpdate?.('issues');
      void refresh({ silent: true });
    };

    const onTelemetry = (event: MessageEvent) => {
      console.log('📡 SSE TELEMETRY RECEIVED (Silent):', event.data);
      // We don't trigger a full refresh or parent update for heartbeats
      // This prevents the page from flickering/clearing state while typing.
      onUpdate?.('telemetry');
    };

    const onActivity = (event: MessageEvent) => {
      console.log('📝 SSE ACTIVITY RECEIVED:', event.data);
      onUpdate?.('activity');
    };

    source.addEventListener('issues', onIssues as EventListener);
    source.addEventListener('telemetry', onTelemetry as EventListener);
    source.addEventListener('activity', onActivity as EventListener);

    return () => {
      source.removeEventListener('issues', onIssues as EventListener);
      source.removeEventListener('telemetry', onTelemetry as EventListener);
      source.removeEventListener('activity', onActivity as EventListener);
      source.close();
    };
    
    // onUpdate is intentionally excluded from deps to avoid re-subscribing on parent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectRoot, refresh]);

  return { issues, refresh, updateLocal };
}
