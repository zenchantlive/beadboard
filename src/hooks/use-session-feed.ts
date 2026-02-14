'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EpicBucket } from '../lib/agent-sessions';

export function useSessionFeed(projectRoot: string) {
  const [feed, setFeed] = useState<EpicBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true);
    try {
      const res = await fetch(`/api/sessions?projectRoot=${encodeURIComponent(projectRoot)}&_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch session feed');
      const data = await res.json();
      if (data.ok) {
        setFeed(data.feed);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch session feed');
      }
    } catch (err) {
      if (!options.silent) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, [projectRoot]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { 
    feed, 
    loading, 
    error, 
    refresh: fetchFeed,
    stats: {
      active: feed.reduce((acc, b) => acc + b.tasks.filter(t => t.sessionState === 'active').length, 0),
      needsInput: feed.reduce((acc, b) => acc + b.tasks.filter(t => t.sessionState === 'needs_input').length, 0),
      completed: feed.reduce((acc, b) => acc + b.tasks.filter(t => t.sessionState === 'completed').length, 0),
    }
  };
}
