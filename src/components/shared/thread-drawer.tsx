'use client';

import { X, Send } from 'lucide-react';
import { ThreadView, type ThreadItem } from './thread-view';
import { useState } from 'react';

interface ThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  id: string;
  items?: ThreadItem[];
}

// Sample data for demo
const SAMPLE_ITEMS: ThreadItem[] = [
  {
    id: '1',
    type: 'status_change',
    from: 'backlog',
    to: 'in_progress',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    type: 'comment',
    author: 'zenchantlive',
    content: 'Started working on this task.',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: '3',
    type: 'protocol_event',
    event: 'HANDOFF',
    content: 'Handed off to agent',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
  },
];

export function ThreadDrawer({ isOpen, onClose, title, id, items = SAMPLE_ITEMS }: ThreadDrawerProps) {
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  return (
    <div
      className="h-full w-[24rem] overflow-hidden flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <div className="flex-1 min-w-0 mr-4">
          <span className="text-teal-400 font-mono text-sm">
            {id}
          </span>
          <h2
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--color-text-primary)' }}
            title={title}
          >
            {title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X size={18} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* Thread Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <ThreadView items={items} />
      </div>

      {/* Compose */}
      <div
        className="p-4 border-t"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 rounded-md text-sm"
            style={{
              backgroundColor: 'var(--color-bg-input)',
              color: 'var(--color-text-primary)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && comment.trim()) {
                setComment('');
              }
            }}
          />
          <button
            className="p-2 rounded-md"
            style={{
              backgroundColor: 'var(--color-accent-green)',
              color: '#fff',
            }}
            aria-label="Send comment"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
