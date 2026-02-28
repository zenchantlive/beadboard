'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit3, MessageSquareText, Send, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { buildEditableIssueDraft, buildIssueUpdatePayload, validateEditableIssueDraft, type EditableIssueDraft, type EditableIssueFieldErrors } from '../../lib/issue-editor';
import type { UpdateMutationPayload } from '../../lib/mutations';
import type { BeadIssue } from '../../lib/types';
import { ThreadView, type ThreadItem } from './thread-view';
import { useResponsive } from '../../hooks/use-responsive';

interface ThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  id: string;
  items?: ThreadItem[];
  embedded?: boolean;
  takeover?: boolean;
  issue?: BeadIssue | null;
  projectRoot?: string;
  onIssueUpdated?: (issueId: string) => Promise<void> | void;
}

interface CommentFromApi {
  id: string;
  bead_id: string;
  actor: string;
  kind: 'comment';
  text: string;
  timestamp: string;
}

const STATUS_OPTIONS: EditableIssueDraft['status'][] = ['open', 'in_progress', 'blocked', 'deferred', 'closed'];
const PRIORITY_OPTIONS = [0, 1, 2, 3, 4] as const;

async function postIssueUpdate(body: UpdateMutationPayload): Promise<void> {
  const response = await fetch('/api/beads/update', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as { ok: boolean; error?: { message?: string } };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error?.message ?? 'Update failed');
  }
}

async function postComment(projectRoot: string, id: string, text: string): Promise<void> {
  const response = await fetch('/api/beads/comment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ projectRoot, id, text }),
  });

  const payload = (await response.json()) as { ok: boolean; error?: { message?: string } };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error?.message ?? 'Comment failed');
  }
}

function saveStateTone(state: 'ready' | 'saving' | 'saved' | 'error'): string {
  if (state === 'saving') return 'border-[#5BA8A0]/50 bg-[#5BA8A0]/20 text-[#D6EEEA]';
  if (state === 'saved') return 'border-[#7CB97A]/50 bg-[#7CB97A]/20 text-[#D4ECD2]';
  if (state === 'error') return 'border-[#E24A3A]/50 bg-[#E24A3A]/20 text-[#F3C2BC]';
  return 'border-white/10 bg-white/5 text-[#B8B8B8]';
}

export function ThreadDrawer({
  isOpen,
  onClose,
  title,
  id,
  items: externalItems,
  embedded = false,
  takeover = false,
  issue,
  projectRoot,
  onIssueUpdated,
}: ThreadDrawerProps) {
  const { isMobile } = useResponsive();
  const [comment, setComment] = useState('');
  const [commentState, setCommentState] = useState<'ready' | 'sending' | 'sent' | 'error'>('ready');
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<EditableIssueDraft | null>(issue ? buildEditableIssueDraft(issue) : null);
  const [fieldErrors, setFieldErrors] = useState<EditableIssueFieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'ready' | 'saving' | 'saved' | 'error'>('ready');
  const [comments, setComments] = useState<CommentFromApi[]>([]);
  // Fetch comments when drawer opens
  useEffect(() => {
    if (!isOpen || !id || !projectRoot) {
      setComments([]);
      return;
    }

    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/beads/${id}/comments?projectRoot=${encodeURIComponent(projectRoot)}`);
        const payload = (await response.json()) as { ok: boolean; comments?: CommentFromApi[] };
        if (payload.ok && payload.comments) {
          setComments(payload.comments);
        }
      } catch (error) {
        console.error('Failed to fetch comments:', error);
      }
    };

    fetchComments();
  }, [isOpen, id, projectRoot]);

  useEffect(() => {
    if (!issue) {
      setDraft(null);
      setEditMode(false);
      setFieldErrors({});
      setSaveError(null);
      setSaveState('ready');
      return;
    }

    setDraft(buildEditableIssueDraft(issue));
    setEditMode(false);
    setFieldErrors({});
    setSaveError(null);
    setSaveState('ready');
  }, [issue]);

  const canEdit = Boolean(issue && projectRoot && draft);

  // Convert comments to ThreadItems
  const threadItems: ThreadItem[] = useMemo(() => {
    const items: ThreadItem[] = comments.map(c => ({
      id: c.id,
      type: 'comment' as const,
      author: c.actor,
      content: c.text,
      timestamp: new Date(c.timestamp),
    }));
    // Merge with any external items if provided
    if (externalItems) {
      items.push(...externalItems);
    }
    // Sort by timestamp descending
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [comments, externalItems]);

  const participants = useMemo(() => {
    const names = new Set<string>();
    for (const item of threadItems) {
      if (item.author && item.author.trim()) {
        names.add(item.author.trim());
      }
    }
    return Array.from(names).slice(0, 4);
  }, [threadItems]);

  const handleSave = async () => {
    if (!issue || !projectRoot || !draft) {
      return;
    }

    const validation = validateEditableIssueDraft(draft);
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setSaveState('error');
      return;
    }

    const payload = buildIssueUpdatePayload(issue, draft, projectRoot);
    if (!payload) {
      setEditMode(false);
      setSaveState('saved');
      setTimeout(() => setSaveState('ready'), 900);
      return;
    }

    setSaveState('saving');
    setSaveError(null);
    setFieldErrors({});

    try {
      await postIssueUpdate(payload);
      await onIssueUpdated?.(issue.id);
      setEditMode(false);
      setSaveState('saved');
      setTimeout(() => setSaveState('ready'), 900);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Save failed');
      setSaveState('error');
    }
  };

  const handleCommentSubmit = async () => {
    const targetIssueId = issue?.id ?? '';
    if (!projectRoot || !targetIssueId || !comment.trim()) {
      return;
    }

    setCommentState('sending');

    try {
      await postComment(projectRoot, targetIssueId, comment.trim());
      setComment('');
      setCommentState('sent');
      // Refresh comments
      const response = await fetch(`/api/beads/${targetIssueId}/comments?projectRoot=${encodeURIComponent(projectRoot)}`);
      const payload = (await response.json()) as { ok: boolean; comments?: CommentFromApi[] };
      if (payload.ok && payload.comments) {
        setComments(payload.comments);
      }
      await onIssueUpdated?.(targetIssueId);
      setTimeout(() => setCommentState('ready'), 900);
    } catch (error) {
      console.error('Comment failed:', error);
      setCommentState('error');
      setTimeout(() => setCommentState('ready'), 2000);
    }
  };

  if (!isOpen) {
    return null;
  }

  const frameShellClass = takeover
    ? 'mx-auto flex h-full w-full max-w-[1120px] flex-col overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ui-bg-card)_92%,black),color-mix(in_srgb,var(--ui-bg-shell)_88%,black))] shadow-[0_34px_60px_-40px_rgba(0,0,0,0.84)]'
    : 'flex h-full flex-col';

  const frameShellStyle = takeover
    ? undefined
    : {
      width: embedded ? '100%' : '26rem',
      background: 'linear-gradient(180deg, var(--ui-bg-card), var(--ui-bg-shell))',
      borderLeft: embedded ? 'none' : '1px solid var(--color-border-default)',
      boxShadow: embedded ? 'none' : '-20px 0 48px rgba(0,0,0,0.45)',
      overscrollBehavior: 'contain' as const,
    };

  const conversationSection = (
    <section className="rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-shell)] p-3 shadow-[0_12px_28px_-22px_rgba(0,0,0,0.7)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-[var(--ui-text-primary)]">
          <MessageSquareText className="h-4 w-4 text-[var(--ui-accent-info)]" />
          Conversation
        </div>
        <div className="flex items-center gap-1">
          {participants.map((name) => (
            <span key={name} className="inline-flex h-6 items-center rounded-full border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] px-2 text-[11px] text-[var(--ui-text-muted)]">
              {name}
            </span>
          ))}
        </div>
      </div>
      <ThreadView items={threadItems} variant={takeover ? 'chat' : 'stack'} currentUser="you" />
    </section>
  );

  const summarySection = (
    <section className="rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-shell)] p-3 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.75)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--ui-text-primary)]">Task Summary</p>
        <Badge className={`rounded-full border px-2 py-0.5 text-[11px] ${saveStateTone(saveState)}`}>
          {saveState}
        </Badge>
      </div>

      {!issue ? (
        <p className="text-sm text-[var(--ui-text-muted)]">No task details available for this thread context.</p>
      ) : !editMode ? (
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-[var(--ui-text-primary)]">{issue.title}</p>
          <p className="text-[var(--ui-text-muted)]">{issue.description ?? 'No description provided.'}</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full border border-[var(--ui-accent-info)]/40 bg-[var(--ui-accent-info)]/20 text-[#d9f5ff]">{issue.status}</Badge>
            <Badge className="rounded-full border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-muted)]">P{issue.priority}</Badge>
            <Badge className="rounded-full border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-muted)]">{issue.issue_type}</Badge>
            {issue.assignee ? <Badge className="rounded-full border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-muted)]">@{issue.assignee}</Badge> : null}
          </div>
          <div className="pt-1">
            <Button
              onClick={() => setEditMode(true)}
              disabled={!canEdit}
              className="h-8 rounded-full bg-[var(--ui-accent-action-green)] px-4 text-[#081f12] hover:bg-[color-mix(in_srgb,var(--ui-accent-action-green)_86%,white)] disabled:opacity-40"
            >
              <Edit3 className="mr-2 h-3.5 w-3.5" /> Edit task
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <label className="block text-xs text-[#9F9F9F]">
            Title
            <Input
              value={draft?.title ?? ''}
              onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))}
              className="mt-1 border-[#4A4A4A] bg-[#3B3B3B] text-white"
            />
          </label>
          {fieldErrors.title ? <p className="text-xs text-[#EAA7A0]">{fieldErrors.title}</p> : null}

          <label className="block text-xs text-[#9F9F9F]">
            Description
            <textarea
              value={draft?.description ?? ''}
              onChange={(event) => setDraft((current) => (current ? { ...current, description: event.target.value } : current))}
              className="mt-1 min-h-20 w-full rounded-md border border-[#4A4A4A] bg-[#3B3B3B] px-3 py-2 text-sm text-white outline-none ring-offset-0 placeholder:text-[#808080] focus:border-[#5BA8A0]"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-[#9F9F9F]">
              Assignee
              <Input
                value={draft?.assignee ?? ''}
                onChange={(event) => setDraft((current) => (current ? { ...current, assignee: event.target.value } : current))}
                className="mt-1 border-[#4A4A4A] bg-[#3B3B3B] text-white"
              />
            </label>
            <label className="block text-xs text-[#9F9F9F]">
              Issue type
              <Input
                value={draft?.issueType ?? ''}
                onChange={(event) => setDraft((current) => (current ? { ...current, issueType: event.target.value } : current))}
                className="mt-1 border-[#4A4A4A] bg-[#3B3B3B] text-white"
              />
            </label>
          </div>

          <label className="block text-xs text-[#9F9F9F]">
            Labels
            <Input
              value={draft?.labelsInput ?? ''}
              onChange={(event) => setDraft((current) => (current ? { ...current, labelsInput: event.target.value } : current))}
              className="mt-1 border-[#4A4A4A] bg-[#3B3B3B] text-white"
            />
          </label>
          {fieldErrors.labelsInput ? <p className="text-xs text-[#EAA7A0]">{fieldErrors.labelsInput}</p> : null}

          <div>
            <p className="mb-1 text-xs text-[#9F9F9F]">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setDraft((current) => (current ? { ...current, status } : current))}
                  className={`rounded-full border px-2 py-1 text-xs ${draft?.status === status ? 'border-[#5BA8A0] bg-[#5BA8A0]/20 text-[#D7ECE9]' : 'border-[#4A4A4A] bg-[#3A3A3A] text-[#B8B8B8]'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-[#9F9F9F]">Priority</p>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setDraft((current) => (current ? { ...current, priority } : current))}
                  className={`rounded-full border px-2 py-1 text-xs ${draft?.priority === priority ? 'border-[#D4A574] bg-[#D4A574]/20 text-[#EBD7BD]' : 'border-[#4A4A4A] bg-[#3A3A3A] text-[#B8B8B8]'}`}
                >
                  P{priority}
                </button>
              ))}
            </div>
          </div>

          {saveError ? <p className="text-xs text-[#EAA7A0]">{saveError}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setEditMode(false)}
              className="h-8 rounded-full border-[#4A4A4A] bg-[#3B3B3B] px-4 text-[#C0C0C0] hover:bg-[#444444]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              className="h-8 rounded-full bg-[#7CB97A] px-4 text-[#1A1A1A] hover:bg-[#8ECC8C]"
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div
      className={takeover ? 'h-full p-4 md:p-6' : 'h-full'}
      style={
        isMobile
          ? {
            paddingTop: takeover ? 'max(1rem, env(safe-area-inset-top))' : undefined,
            paddingBottom: takeover ? 'max(1rem, env(safe-area-inset-bottom))' : undefined,
          }
          : undefined
      }
    >
      <div className={frameShellClass} style={frameShellStyle}>
        <header className="border-b border-[var(--ui-border-soft)] bg-[var(--ui-bg-shell)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <p className="font-mono text-xs font-semibold text-[var(--ui-accent-info)]">#{id}</p>
                <span className="rounded-full border border-[var(--ui-accent-ready)]/45 bg-[var(--ui-accent-ready)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d8ffe8]">
                  {issue?.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'Unknown'}
                </span>
              </div>
              <h2 className="truncate text-[40px] font-semibold leading-[1.12] tracking-[-0.02em] text-[var(--ui-text-primary)]" title={title}>{title}</h2>
              <p className="mt-1 text-xs text-[var(--ui-text-muted)]">{threadItems.length} events</p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              className="h-8 w-8 rounded-full p-0 text-[var(--ui-text-muted)] hover:bg-white/10 hover:text-[var(--ui-text-primary)]"
              aria-label="Close thread"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="space-y-3 p-4">
            {takeover ? (
              <>
                {summarySection}
                {conversationSection}
              </>
            ) : (
              <>
                {conversationSection}
                {summarySection}
              </>
            )}
          </div>
        </ScrollArea>

        <footer
          className="border-t border-[var(--ui-border-soft)] bg-[var(--ui-bg-shell)] p-3"
          style={
            isMobile
              ? {
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
              }
              : undefined
          }
        >
          <div className="flex items-center gap-2 rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] p-1">
            <Input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && comment.trim()) {
                  event.preventDefault();
                  void handleCommentSubmit();
                }
              }}
              placeholder="Type a message to neighbors..."
              className="border-0 bg-transparent text-[var(--ui-text-primary)] placeholder:text-[var(--ui-text-muted)]"
              autoComplete="off"
              disabled={commentState === 'sending' || !issue || !projectRoot}
            />
            <Button
              type="button"
              className="h-8 rounded-full bg-[var(--ui-accent-action-green)] px-3 text-[#082012] hover:bg-[color-mix(in_srgb,var(--ui-accent-action-green)_86%,white)] disabled:opacity-50"
              onClick={() => void handleCommentSubmit()}
              disabled={!comment.trim() || commentState === 'sending' || !issue || !projectRoot}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          {commentState === 'error' && (
            <p className="mt-1 text-xs text-[#EAA7A0]">Failed to send comment</p>
          )}
        </footer>
      </div>
      {takeover ? (
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_10%,rgba(91,168,160,0.14),transparent_32%),radial-gradient(circle_at_92%_88%,rgba(212,165,116,0.16),transparent_30%)]" />
      ) : null}
    </div>
  );
}
