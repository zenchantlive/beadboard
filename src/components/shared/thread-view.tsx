'use client';

import { ArrowRight, Ban, CheckCircle2, MessageSquare, UserMinus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type ThreadItemType = 'comment' | 'status_change' | 'protocol_event';

export interface ThreadItem {
  id: string;
  type: ThreadItemType;
  author?: string;
  content?: string;
  from?: string;
  to?: string;
  event?: string;
  timestamp: Date;
}

interface ThreadViewProps {
  items: ThreadItem[];
  variant?: 'stack' | 'chat';
  currentUser?: string;
  onAddComment?: (text: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getProtocolIcon(event?: string) {
  switch (event?.toUpperCase()) {
    case 'HANDOFF':
      return <UserMinus className="w-4 h-4 text-amber-400" />;
    case 'BLOCKED':
      return <Ban className="w-4 h-4 text-rose-400" />;
    case 'CLOSED':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    default:
      return <MessageSquare className="w-4 h-4 text-text-muted" />;
  }
}

function getProtocolLabel(event?: string): string {
  switch (event?.toUpperCase()) {
    case 'HANDOFF':
      return 'Handoff';
    case 'BLOCKED':
      return 'Blocked';
    case 'CLOSED':
      return 'Closed';
    default:
      return 'Event';
  }
}

function CommentItem({ item, isSelf }: { item: ThreadItem; isSelf: boolean }) {
  return (
    <div className={cn('flex gap-3 py-3', isSelf && 'justify-end')}>
      {!isSelf ? (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={undefined} alt={item.author} />
          <AvatarFallback className="bg-surface-muted text-text-body text-xs font-semibold">
            {item.author ? getInitials(item.author) : '??'}
          </AvatarFallback>
        </Avatar>
      ) : null}
      <div className={cn('min-w-0 max-w-[80%]', isSelf && 'items-end')}>
        <div className={cn('mb-1 flex items-center gap-2', isSelf && 'justify-end')}>
          <span className="text-text-primary text-sm font-semibold">{item.author || 'Unknown'}</span>
          <span className="font-mono text-[11px] text-text-muted">{formatRelativeTime(item.timestamp)}</span>
        </div>
        <p
          className={cn(
            'whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-base leading-relaxed',
            isSelf
              ? 'bg-[color-mix(in_srgb,var(--ui-accent-ready)_24%,var(--ui-bg-panel))] text-[var(--ui-text-primary)]'
              : 'bg-[color-mix(in_srgb,var(--ui-bg-panel)_88%,black)] text-text-secondary',
          )}
        >
          {item.content}
        </p>
      </div>
      {isSelf ? (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-[color-mix(in_srgb,var(--ui-accent-ready)_40%,var(--ui-bg-panel))] text-text-body text-xs font-semibold">
            {item.author ? getInitials(item.author) : 'ME'}
          </AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

function StatusChangeItem({ item }: { item: ThreadItem }) {
  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
      <span className="text-text-muted">
        Status: <span className="text-text-primary font-medium">{item.from || 'unknown'}</span>
        <ArrowRight className="w-3 h-3 inline mx-1 text-text-muted" />
        <span className="text-text-primary font-medium">{item.to || 'unknown'}</span>
      </span>
      <span className="text-text-muted text-xs ml-auto">
        {formatRelativeTime(item.timestamp)}
      </span>
    </div>
  );
}

function ProtocolEventItem({ item }: { item: ThreadItem }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-shrink-0">{getProtocolIcon(item.event)}</div>
      <div className="flex-1 min-w-0">
        <span className="text-text-primary text-sm font-medium">
          {getProtocolLabel(item.event)}
        </span>
        {item.content && (
          <span className="text-text-secondary text-sm ml-2">{item.content}</span>
        )}
      </div>
      <span className="text-text-muted text-xs">
        {formatRelativeTime(item.timestamp)}
      </span>
    </div>
  );
}

export function ThreadView({ items, variant = 'stack', currentUser = 'you', onAddComment }: ThreadViewProps) {
  void onAddComment;

  return (
    <div className="space-y-1">
      {items.length === 0 ? (
        <p className="text-text-muted text-sm italic py-4">No activity yet</p>
      ) : (
        <div className="divide-y divide-white/5">
          {items.map((item) => {
            switch (item.type) {
              case 'comment':
                return (
                  <CommentItem
                    key={item.id}
                    item={item}
                    isSelf={variant === 'chat' && (item.author ?? '').trim().toLowerCase() === currentUser.toLowerCase()}
                  />
                );
              case 'status_change':
                return <StatusChangeItem key={item.id} item={item} />;
              case 'protocol_event':
                return <ProtocolEventItem key={item.id} item={item} />;
              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
