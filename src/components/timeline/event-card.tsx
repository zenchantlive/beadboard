'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { ActivityEvent } from '../../lib/activity';
import { Chip } from '../shared/chip';

interface EventCardProps {
  event: ActivityEvent;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
    >
      <div className="flex-none pt-1">
        <StatusIcon kind={event.kind} />
      </div>

      <div className="flex-1 min-w-0">
        <header className="flex items-baseline justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-text-body">
            <span className="font-semibold text-text-strong">{event.actor || 'System'}</span>
            <span className="text-text-muted">{getActionVerb(event.kind)}</span>
            <Link 
              href={`/?focus=${event.beadId}`}
              className="font-medium text-emerald-400 hover:underline hover:text-emerald-300"
            >
              {event.beadTitle}
            </Link>
          </div>
          <time className="system-data text-xs text-text-muted whitespace-nowrap">
            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </header>

        <div className="mt-2 text-sm">
          <EventPayload event={event} />
        </div>
        
        <div className="mt-3 flex items-center gap-2">
           <Chip tone="default">{event.projectName}</Chip>
           <span className="system-data text-xs text-text-muted/50">{event.beadId}</span>
        </div>
      </div>
    </motion.article>
  );
}

function StatusIcon({ kind }: { kind: string }) {
  let color = 'bg-slate-500';
  if (kind === 'created' || kind === 'reopened') color = 'bg-emerald-500';
  if (kind === 'closed') color = 'bg-rose-500';
  if (kind === 'status_changed') color = 'bg-amber-500';
  if (kind.includes('comment')) color = 'bg-blue-500';

  return (
    <div className={`h-2 w-2 rounded-full ${color} shadow-[0_0_8px_currentColor]`} />
  );
}

function getActionVerb(kind: string): string {
  switch (kind) {
    case 'created': return 'created';
    case 'closed': return 'closed';
    case 'reopened': return 'reopened';
    case 'status_changed': return 'moved';
    case 'comment_added': return 'commented on';
    case 'assignee_changed': return 'assigned';
    default: return 'updated';
  }
}

function EventPayload({ event }: { event: ActivityEvent }) {
  const { payload } = event;

  if (event.kind === 'status_changed') {
    return (
      <div className="flex items-center gap-2 text-text-muted">
        <span className="line-through">{payload.from}</span>
        <span>→</span>
        <span className="font-medium text-text-strong">{payload.to}</span>
      </div>
    );
  }

  if (event.kind === 'comment_added') {
    return (
      <div className="rounded-lg bg-white/5 p-3 text-text-body italic">
        &quot;{payload.message}&quot;
      </div>
    );
  }

  if (payload.from !== undefined && payload.to !== undefined) {
     return (
      <div className="text-text-muted">
        Changed {payload.field}: <span className="text-text-body">{String(payload.from)}</span> → <span className="text-text-strong">{String(payload.to)}</span>
      </div>
     );
  }

  if (payload.message) {
      return <div className="text-text-body">{payload.message}</div>;
  }

  return null;
}
