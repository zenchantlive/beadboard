'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentMessage } from '../../lib/agent-mail';
import type { AgentMetrics } from '../../lib/agent-sessions';
import type { BeadIssue } from '../../lib/types';
import { KanbanDetail } from '../kanban/kanban-detail';

interface ThreadItem {
  type: 'activity' | 'message' | 'interaction';
  id: string;
  timestamp: string;
  data: any;
}

interface ConversationDrawerProps {
  beadId: string | null;
  bead: BeadIssue | null;
  agentId?: string | null;
  open: boolean;
  onClose: () => void;
  projectRoot: string;
  onActivity?: () => void;
  showAgentContext?: boolean;
  onBackToAgent?: () => void;
  embedded?: boolean;
  refreshTrigger?: number;
}

export function ConversationDrawer({
  beadId,
  bead,
  agentId,
  open,
  onClose,
  projectRoot,
  onActivity,
  showAgentContext,
  onBackToAgent,
  embedded = false,
  refreshTrigger = 0
}: ConversationDrawerProps) {
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const fetchConversation = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!beadId) return;
    if (!options.silent) setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${beadId}/conversation?projectRoot=${encodeURIComponent(projectRoot)}&_t=${Date.now()}`);
      const data = await res.json();
      if (data.ok) {
        setThread(data.thread);
      }
    } catch (err) {
      if (!options.silent) console.error('Failed to fetch conversation', err);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, [beadId, projectRoot]);

  const fetchAgentMetrics = useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/${agentId}/stats?projectRoot=${encodeURIComponent(projectRoot)}&_t=${Date.now()}`);
      const data = await res.json();
      if (data.ok) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to fetch agent metrics', err);
    }
  }, [agentId, projectRoot]);

  useEffect(() => {
    if (open) {
      if (beadId) fetchConversation({ silent: refreshTrigger > 0 });
      if (agentId) fetchAgentMetrics();
    } else {
      setThread([]);
      setMetrics(null);
      setShowSummary(false);
    }
  }, [open, beadId, agentId, fetchConversation, fetchAgentMetrics, refreshTrigger]);

  // Handle escape key
  useEffect(() => {
    if (!open || embedded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, embedded]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !beadId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${beadId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRoot, text: commentText })
      });
      if (res.ok) {
        setCommentText('');
        await fetchConversation();
        onActivity?.();
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMessageAction = async (messageId: string, action: 'read' | 'ack') => {
    if (!beadId) return;
    const message = thread.find(t => t.id === messageId)?.data as AgentMessage;
    if (!message) return;

    try {
      const res = await fetch(`/api/sessions/${beadId}/messages/${messageId}/${action}?agent=${encodeURIComponent(message.to_agent)}`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchConversation();
        onActivity?.();
      }
    } catch (err) {
      console.error(`Failed to ${action} message`, err);
    }
  };

  const content = (
    <div className={`flex h-full w-full flex-col border-l border-white/10 bg-[#0b0c10]/95 shadow-[-32px_0_64px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden`}>
      <header className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4 flex-none">
        <div className="flex items-center gap-4">
          {showAgentContext && (
            <button 
              onClick={onBackToAgent}
              className="group flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:bg-white/10 active:scale-90"
            >
              <span className="text-lg text-text-muted group-hover:text-text-strong">&larr;</span>
            </button>
          )}
          <div className="flex flex-col">
            <span className="system-data text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted/50">
              {beadId ? `Task ${beadId}` : `Agent ${agentId}`}
            </span>
            <h2 className="ui-text text-sm font-bold text-text-strong truncate max-w-[12rem]">
              {beadId ? (bead?.title || 'Conversation') : 'Agent Scorecard'}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {beadId && (
            <button
              onClick={() => setShowSummary(!showSummary)}
              className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                showSummary 
                  ? 'border-sky-500 bg-sky-500/10 text-sky-300' 
                  : 'border-white/10 bg-white/5 text-text-muted hover:bg-white/10'
              }`}
            >
              {showSummary ? 'Thread' : 'Summary'}
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-text-body transition-all hover:bg-white/10 active:scale-95"
          >
            Close
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {beadId ? (
          showSummary ? (
            <div className="animate-fade-in">
               <KanbanDetail 
                  issue={bead} 
                  framed={false} 
                  projectRoot={projectRoot} 
                  onIssueUpdated={onActivity}
               />
            </div>
          ) : (
            // Task View
            loading ? (
              <div className="flex h-full items-center justify-center text-text-muted">
                <span className="animate-pulse">Loading thread...</span>
              </div>
            ) : thread.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-text-muted/40 px-8 gap-4">
                <div className="h-12 w-12 rounded-full border border-dashed border-white/20 flex items-center justify-center text-xl">💬</div>
                <p className="ui-text text-xs italic">No activity or messages yet for this task.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {thread.map(item => (
                  <ThreadRow 
                    key={item.id} 
                    item={item} 
                    onRead={(id) => handleMessageAction(id, 'read')}
                    onAck={(id) => handleMessageAction(id, 'ack')}
                  />
                ))}
              </div>
            )
          )
        ) : agentId ? (
          // Agent View
          <div className="flex flex-col gap-6 animate-fade-in">
             <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 text-center">
                <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 p-[2px] mb-4 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b0c10] text-2xl font-black text-sky-400">
                    {agentId?.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <h3 className="ui-text text-xl font-bold text-text-strong">{agentId}</h3>
                <p className="ui-text text-xs text-text-muted mt-1 uppercase tracking-widest">Active Operative</p>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <StatBlock label="Active Missions" value={String(metrics?.activeTasks ?? 0)} color="text-sky-400" />
                <StatBlock label="Recent Success" value={String(metrics?.completedTasks ?? 0)} color="text-emerald-400" />
             </div>

             <section className="space-y-4">
                <h4 className="ui-text text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/40 px-2">Recent Wins</h4>
                <div className="flex flex-col gap-2">
                   {metrics?.recentWins.length ? metrics.recentWins.map(win => (
                      <div key={win.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 group hover:border-emerald-500/30 transition-colors">
                         <p className="system-data text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">{win.id}</p>
                         <p className="ui-text text-[11px] text-text-body mt-1 font-bold group-hover:text-text-strong">{win.title}</p>
                      </div>
                   )) : (
                      <p className="ui-text text-xs italic text-text-muted/30 px-2">No completed missions recorded.</p>
                   )}
                </div>
             </section>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-text-muted/20">
             <p className="ui-text text-xs uppercase tracking-widest font-black">Context Inactive</p>
          </div>
        )}
      </div>

      {beadId && !showSummary && (
        <footer className="border-t border-white/5 bg-white/[0.01] p-6 flex-none shadow-[0_-12px_32px_rgba(0,0,0,0.2)]">
          <form onSubmit={handleAddComment} className="space-y-4">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type a message or add a comment..."
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-text-body outline-none transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 placeholder:text-text-muted/30 shadow-inner resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="rounded-2xl bg-sky-500 px-6 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)] transition-all hover:bg-sky-400 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </footer>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col"
          >
            {content}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function StatBlock({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 text-center">
      <p className={`system-data text-2xl font-black ${color}`}>{value}</p>
      <p className="ui-text text-[10px] font-bold text-text-muted/40 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'HANDOFF': return 'Passed to';
    case 'BLOCKED': return 'Needs input';
    case 'DECISION': return 'Deciding';
    default: return 'Update';
  }
}

function ThreadRow({ item, onRead, onAck }: { 
  item: ThreadItem; 
  onRead: (id: string) => void;
  onAck: (id: string) => void;
}) {
  const isMessage = item.type === 'message' || item.type === 'interaction';
  const data = item.data;

  if (item.type === 'interaction') {
    return (
      <div className="flex flex-col gap-3 w-full items-start">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-lg bg-zinc-500/20 flex items-center justify-center text-[10px] font-black text-zinc-400 border border-white/5">
            {data.actor.slice(0, 2).toUpperCase()}
          </div>
          <span className="ui-text text-xs font-bold text-text-strong">{data.actor}</span>
          <span className="ui-text text-[9px] font-black text-text-muted/40 uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
            Comment
          </span>
          <time className="system-data ml-auto text-[10px] text-text-muted/20">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
        <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-text-body shadow-2xl">
          <p className="text-[13px] leading-relaxed opacity-90 whitespace-pre-wrap">{data.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex flex-col gap-3 ${isMessage ? 'items-start' : 'items-center'}`}>
      {!isMessage ? (
        // Activity Event
        <div className="flex items-center gap-4 w-full">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
          <div className="flex items-center gap-3 rounded-full border border-white/5 bg-white/[0.02] px-4 py-1.5 shadow-sm">
            <span className="ui-text text-[10px] font-bold text-text-muted/60">
              <span className="text-text-strong/80">{data.actor}</span> {data.kind.replace('_', ' ')}
            </span>
            <time className="system-data text-[9px] text-text-muted/30 whitespace-nowrap">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        </div>
      ) : (
        // Agent Message
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-lg bg-sky-500/20 flex items-center justify-center text-[10px] font-black text-sky-400 border border-sky-500/20">
              {data.from_agent.slice(0, 2).toUpperCase()}
            </div>
            <span className="ui-text text-xs font-bold text-text-strong">{data.from_agent}</span>
            <span className="ui-text text-[9px] font-black text-text-muted/40 uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
              {getCategoryLabel(data.category)}
            </span>
            <time className="system-data ml-auto text-[10px] text-text-muted/20">
              {new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
          
          <div className={`relative rounded-3xl border p-5 text-sm ${data.state === 'acked' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-100/80 shadow-none' : 'border-white/10 bg-white/[0.03] text-text-body shadow-2xl'}`}>
            <p className="font-bold mb-2 text-text-strong">{data.subject}</p>
            <p className="text-[13px] leading-relaxed opacity-90 whitespace-pre-wrap">{data.body}</p>
            
            {(data.state === 'unread' || (data.requires_ack && data.state !== 'acked')) && (
              <div className="mt-5 flex gap-3 border-t border-white/5 pt-4">
                {data.state === 'unread' && (
                  <button 
                    onClick={() => onRead(data.message_id)}
                    className="ui-text rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold text-text-body hover:bg-white/10 transition-all active:scale-95"
                  >
                    Mark Seen
                  </button>
                )}
                {data.requires_ack && data.state !== 'acked' && (
                  <button 
                    onClick={() => onAck(data.message_id)}
                    className="ui-text rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-[11px] font-bold text-sky-300 hover:bg-sky-500/20 transition-all active:scale-95 shadow-lg shadow-sky-500/10"
                  >
                    Accept Handoff
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}