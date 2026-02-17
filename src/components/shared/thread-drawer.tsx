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
  embedded?: boolean; // New prop for embedded mode
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

export function ThreadDrawer({ isOpen, onClose, title, id, items = SAMPLE_ITEMS, embedded = false }: ThreadDrawerProps) {
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  return (
    <div
      className="h-full flex flex-col bg-[#1a1a1a]/95 backdrop-blur-2xl"
      style={{
        width: embedded ? '100%' : '26rem',
        borderLeft: embedded ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: embedded ? 'none' : '-10px 0 40px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header: Mission Control Style */}
      <div
        className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]"
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-1 rounded-full bg-teal-500 animate-ping" />
            <span className="text-[10px] font-bold font-mono text-teal-500/70 tracking-[0.2em]">MISSION_{id}</span>
          </div>
          <h2
            className="text-base font-bold text-white truncate leading-tight tracking-tight"
            title={title}
          >
            {title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-text-muted hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Thread Content */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
        <div className="flex flex-col gap-6">
          <ThreadView items={items} />
        </div>
      </div>

      {/* Compose: Technical Input Field */}
      <div
        className="p-5 border-t border-white/5 bg-black/20"
      >
        <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-[#252525] border border-white/5 shadow-inner group focus-within:border-teal-500/30 transition-all">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Transmit message..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-text-muted/30 outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && comment.trim()) {
                setComment('');
              }
            }}
          />
          <button
            className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all active:scale-95 flex-shrink-0"
            aria-label="Send comment"
          >
            <Send size={16} fill="currentColor" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-[8px] font-mono text-text-muted/30 uppercase tracking-[0.2em]">Encrypted Channel_Active</span>
          <div className="flex gap-2">
             <div className="w-1 h-1 rounded-full bg-white/10" />
             <div className="w-1 h-1 rounded-full bg-white/10" />
             <div className="w-1 h-1 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}