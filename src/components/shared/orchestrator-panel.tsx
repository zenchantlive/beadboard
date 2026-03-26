'use client';

import { useEffect, useMemo, useState } from 'react';
import { Construction, Send, RotateCcw } from 'lucide-react';
import type { RuntimeInstance } from '../../lib/embedded-runtime';
import type { ConversationTurn } from '../../lib/orchestrator-chat';

export interface OrchestratorPanelProps {
  orchestrator: RuntimeInstance;
  thread: ConversationTurn[];
  projectRoot?: string;
  onRestarted?: () => void;
}

const SUGGESTED_PROMPTS: { icon: string; label: string; text: string }[] = [
  { icon: '📋', label: 'What needs doing?', text: 'What needs doing?' },
  { icon: '🐛', label: 'Work on the top priority bug', text: 'Work on the top priority bug' },
  { icon: '🤖', label: 'Spawn a feature-dev team', text: 'Spawn a feature-dev team' },
  { icon: '👥', label: 'Show agent status', text: 'Show agent status' },
  { icon: '🗓️', label: 'Help me plan the next sprint', text: 'Help me plan the next sprint' },
];

export function OrchestratorPanel({ orchestrator, thread, projectRoot, onRestarted }: OrchestratorPanelProps) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<ConversationTurn[]>([]);
  const [restarting, setRestarting] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  useEffect(() => {
    setOptimisticMessages((current) =>
      current.filter((pending) => !thread.some((message) => message.role === 'user' && message.text === pending.text))
    );
  }, [thread]);

  const visibleThread = useMemo(() => [...thread, ...optimisticMessages], [thread, optimisticMessages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || submitting || !projectRoot) return;

    setSendError(null);
    setSubmitting(true);
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
      const response = await fetch('/api/runtime/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRoot, text })
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        setSendError(`Send failed (${response.status}): ${errText}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setSendError(`Could not reach the orchestrator: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input.trim());
  };

  const handleRestartClick = () => {
    setConfirmRestart(true);
  };

  const handleConfirmRestart = async () => {
    if (!projectRoot || restarting) return;
    setConfirmRestart(false);
    setRestarting(true);
    setOptimisticMessages([]);

    try {
      await fetch('/api/runtime/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRoot }),
      });
      onRestarted?.();
    } finally {
      setRestarting(false);
    }
  };

  const handleCancelRestart = () => {
    setConfirmRestart(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="orchestrator-panel">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="mb-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <Construction size={14} className="shrink-0 text-amber-400" />
          <p className="text-xs text-amber-200">
            Under construction — orchestrator has known issues being actively fixed.
            <a href="https://github.com/zenchantlive/beadboard" target="_blank" rel="noopener noreferrer" className="ml-1 underline hover:text-amber-100">Track progress</a>
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Main Orchestrator</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{orchestrator.label}</p>
            <p className="text-xs text-[var(--text-secondary)]">Long-lived project control plane for Pi launches</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-cyan-200">
              {orchestrator.status}
            </span>
            {projectRoot && (
              <button
                type="button"
                onClick={handleRestartClick}
                disabled={restarting}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                title="Restart orchestrator — clears the current session"
                aria-label="Restart orchestrator"
              >
                <RotateCcw size={11} aria-hidden="true" className={restarting ? 'animate-spin' : ''} />
                {restarting ? 'Restarting' : 'Restart'}
              </button>
            )}
          </div>
        </div>

        {confirmRestart && (
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
            <p className="mb-2 text-xs text-amber-200">
              Restart orchestrator? This will clear the current session and conversation.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmRestart}
                className="rounded border border-red-500/50 bg-red-500/15 px-2.5 py-1 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-500/25 hover:text-red-200"
              >
                Yes, restart
              </button>
              <button
                type="button"
                onClick={handleCancelRestart}
                className="rounded border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
        {visibleThread.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-2 py-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Ask me anything about your project, or try one of these:
            </p>
            <div className="flex w-full flex-col gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={() => sendMessage(prompt.text)}
                  disabled={submitting || !projectRoot}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="shrink-0 text-base leading-none">{prompt.icon}</span>
                  <span>{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleThread.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={
                    message.status === 'error'
                      ? 'max-w-[85%] rounded-2xl rounded-bl-md bg-red-500/10 px-3 py-2 text-sm text-red-300 border border-red-500/30'
                      : message.role === 'user'
                        ? 'max-w-[85%] rounded-2xl rounded-br-md bg-cyan-500/15 px-3 py-2 text-sm text-cyan-50 border border-cyan-500/25'
                        : 'max-w-[85%] rounded-2xl rounded-bl-md bg-[var(--surface-quaternary)] px-3 py-2 text-sm text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
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
          {sendError && (
            <p className="mt-1.5 text-[11px] text-red-400">{sendError}</p>
          )}
        </div>
      )}
    </div>
  );
}
