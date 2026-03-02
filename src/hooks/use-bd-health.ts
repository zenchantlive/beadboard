'use client';

import { useEffect, useState } from 'react';

interface BdHealthError {
  classification?: string;
  message?: string;
}

interface BdHealthResponse {
  ok: boolean;
  error?: BdHealthError;
  data?: { version?: string };
}

export interface UseBdHealthResult {
  healthy: boolean;
  loading: boolean;
  message: string | null;
  version: string | null;
}

export function useBdHealth(projectRoot: string): UseBdHealthResult {
  const [healthy, setHealthy] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      setLoading(true);
      try {
        const response = await fetch(`/api/bd/health?projectRoot=${encodeURIComponent(projectRoot)}`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as BdHealthResponse;
        if (cancelled) return;

        if (response.ok && payload.ok) {
          setHealthy(true);
          setMessage(null);
          setVersion(payload.data?.version ?? null);
          return;
        }

        setHealthy(false);
        setVersion(null);
        setMessage(payload.error?.message ?? 'bd command not found in PATH. Install @beads/bd.');
      } catch (error) {
        if (cancelled) return;
        setHealthy(false);
        setVersion(null);
        setMessage(error instanceof Error ? error.message : 'Failed to check bd health.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void checkHealth();
    return () => {
      cancelled = true;
    };
  }, [projectRoot]);

  return { healthy, loading, message, version };
}
