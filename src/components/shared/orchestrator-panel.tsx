'use client';

import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import type { RuntimeInstance } from '../../lib/embedded-runtime';
import type { OrchestratorChatMessage } from '../../lib/orchestrator-chat';

export interface OrchestratorPanelProps {
  orchestrator: RuntimeInstance;
  thread: OrchestratorChatMessage[];
  projectRoot?: string;
}

export function OrchestratorPanel({ orchestrator, thread, projectRoot }: OrchestratorPanelProps) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OrchestratorChatMessage[]>([]);

  useEffect(() => {
    setOptimisticMessages((current) =>
      current.filter((pending) => !thread.some((message) => message.role === 'user' && message.text === pending.text))
    );
  }, [thread]);

  const visibleThread = useMemo(() => [...thread, ...optimisticMessages], [thread, optimisticMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || submitting || !projectRoot) return;
    
    setSubmitting(true);
    const text = input.trim();
    setInput('');
    setOptimisticMessages((current) => [
      ...current,
      {
        id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        text,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      await fetch('/api/runtime/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRoot, text })
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="orchestrator-panel">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Main Orchestrator</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{orchestrator.label}</p>
            <p className="text-xs text-[var(--text-secondary)]">Long-lived project control plane for Pi launches</p>
          </div>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-cyan-200">
            {orchestrator.status}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
        <div className="space-y-3">
          {visibleThread.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={message.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-md bg-cyan-500/15 px-3 py-2 text-sm text-cyan-50 border border-cyan-500/25'
                  : 'max-w-[85%] rounded-2xl rounded-bl-md bg-[var(--surface-quaternary)] px-3 py-2 text-sm text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))}
          {visibleThread.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-3 py-4 text-sm text-[var(--text-tertiary)]">
              No orchestrator messages yet.
            </p>
          ) : null}
        </div>
      </div>

      {projectRoot && (
        <div className="border-t border-[var(--border-subtle)] p-3">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the orchestrator..."
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] px-3 py-2 pr-10 text-sm placeholder-[var(--text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={!input.trim() || submitting}
              className="absolute right-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
