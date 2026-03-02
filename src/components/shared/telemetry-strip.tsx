'use client';

import { useEffect, useState } from 'react';
import { Signal } from 'lucide-react';
import type { ActivityEvent } from '../../lib/activity';
import { getEventTone } from '../activity/activity-panel';
import { cn } from '../../lib/utils';

interface TelemetryStripProps {
  projectRoot: string;
  onMaximize: () => void;
}

export function TelemetryStrip({ projectRoot, onMaximize }: TelemetryStripProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  // Fetch initial activity history
  useEffect(() => {
    async function fetchActivity() {
      try {
        const response = await fetch('/api/activity');
        if (response.ok) {
          const data = await response.json();
          setActivities(data.slice(0, 12));
        }
      } catch { /* ignore */ }
    }
    fetchActivity();
  }, []);

  // Subscribe to real-time activity via SSE
  useEffect(() => {
    const source = new EventSource(`/api/events?projectRoot=${encodeURIComponent(projectRoot)}`);
    const onActivity = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.beadId) {
          setActivities(prev => [data, ...prev].slice(0, 12));
        }
      } catch { /* ignore */ }
    };
    source.addEventListener('activity', onActivity as EventListener);
    return () => { source.removeEventListener('activity', onActivity as EventListener); source.close(); };
  }, [projectRoot]);

  return (
    <div className="flex h-full w-9 flex-shrink-0 flex-col items-center border-l border-[var(--border-subtle)] bg-[var(--surface-primary)] py-2">
      <button
        type="button"
        onClick={onMaximize}
        className="mb-2 rounded p-1 text-[var(--accent-info)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)]"
        title="Restore live feed"
        aria-label="Restore live feed"
      >
        <Signal className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-1 flex-col items-center gap-2 overflow-hidden">
        {activities.map((act) => {
          const tone = getEventTone(act.kind);
          return (
            <div
              key={act.id}
              className="flex flex-col items-center"
              title={`${act.beadId}: ${act.beadTitle} (${tone.label})`}
            >
              <span className={cn('h-2 w-2 rounded-full', tone.dotClass)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
