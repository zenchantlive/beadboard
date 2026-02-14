'use client';

import { useMemo } from 'react';
import { useTimelineStore } from './timeline-store';
import { EventCard } from './event-card';

export function TimelineFeed() {
  const { events, filterProject, filterActor, filterKind } = useTimelineStore();

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterProject && e.projectId !== filterProject) return false;
      if (filterActor && e.actor !== filterActor) return false;
      if (filterKind && e.kind !== filterKind) return false;
      return true;
    });
  }, [events, filterProject, filterActor, filterKind]);

  const groups = useMemo(() => {
    const grouped: Record<string, typeof events> = {};
    filteredEvents.forEach(e => {
      const date = new Date(e.timestamp).toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(e);
    });
    return grouped;
  }, [filteredEvents]);

  if (filteredEvents.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-text-muted">
        No activity found.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {Object.entries(groups).map(([date, groupEvents]) => (
        <section key={date} className="space-y-4">
          <h3 className="sticky top-0 z-10 bg-bg-base/80 py-2 text-xs font-bold uppercase tracking-wider text-text-muted backdrop-blur-md">
            {date}
          </h3>
          <div className="space-y-3">
            {groupEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
