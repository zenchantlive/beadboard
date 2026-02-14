'use client';

import { useEffect } from 'react';
import { TimelineFeed } from '../../components/timeline/timeline-feed';
import { useTimelineStore } from '../../components/timeline/timeline-store';

export default function TimelinePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-strong">Activity Timeline</h1>
        <p className="text-text-muted">Real-time stream of project mutations.</p>
      </header>
      
      <TimelineControls />
      <TimelineSubscription />
      <TimelineFeed />
    </div>
  );
}

function TimelineControls() {
    return (
      <div className="mb-6 flex gap-2">
        {/* Placeholder for future filters */}
        <div className="text-sm text-text-muted">Showing all activity</div>
      </div>
    );
}

function TimelineSubscription() {
  const { addEvent, setHistory } = useTimelineStore();

  useEffect(() => {
    // 1. Fetch history
    fetch('/api/activity')
      .then(res => {
        if (!res.ok) throw new Error('History fetch failed');
        return res.json();
      })
      .then(data => setHistory(data))
      .catch(err => console.error('Failed to load history', err));

    // 2. Subscribe to SSE
    const es = new EventSource('/api/events'); 

    es.addEventListener('activity', (e) => {
      try {
        const event = JSON.parse(e.data);
        addEvent(event);
      } catch (err) {
        console.error('Failed to parse activity event', err);
      }
    });
    
    return () => es.close();
  }, [setHistory, addEvent]);

  return null;
}