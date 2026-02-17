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

interface ThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  id: string;
  items?: ThreadItem[];
  embedded?: boolean;
  issue?: BeadIssue | null;
  projectRoot?: string;
  onIssueUpdated?: (issueId: string) => Promise<void> | void;
}

const SAMPLE_ITEMS: ThreadItem[] = [
  {
    id: '1',
    type: 'comment',
    author: 'sarah.lee',
    content: 'Pushed a first pass for the left rail hierarchy. Need readability check on status chips.',
    timestamp: new Date(Date.now() - 6 * 60 * 1000),
  },
  {
    id: '2',
    type: 'status_change',
    from: 'open',
    to: 'in_progress',
    timestamp: new Date(Date.now() - 31 * 60 * 1000),
  },
  {
    id: '3',
    type: 'protocol_event',
    event: 'HANDOFF',
    content: 'Swarm integrator picked up follow-up work.',
    timestamp: new Date(Date.now() - 55 * 60 * 1000),
  },
];

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
  items = SAMPLE_ITEMS,
  embedded = false,
  issue,
  projectRoot,
  onIssueUpdated,
}: ThreadDrawerProps) {
  const [comment, setComment] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<EditableIssueDraft | null>(issue ? buildEditableIssueDraft(issue) : null);
  const [fieldErrors, setFieldErrors] = useState<EditableIssueFieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'ready' | 'saving' | 'saved' | 'error'>('ready');

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

  const participants = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.author && item.author.trim()) {
        names.add(item.author.trim());
      }
    }
    return Array.from(names).slice(0, 4);
  }, [items]);

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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{
        width: embedded ? '100%' : '26rem',
        background: 'linear-gradient(180deg, #353535, #2E2E2E)',
        borderLeft: embedded ? 'none' : '1px solid var(--color-border-default)',
        boxShadow: embedded ? 'none' : '-20px 0 48px rgba(0,0,0,0.45)',
      }}
    >
      <header className="border-b border-[#4A4A4A] bg-[#363636]/90 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8F8F8F]">Open Thread</p>
            <h2 className="truncate text-lg font-semibold text-white" title={title}>{title}</h2>
            <p className="text-xs text-[#A5A5A5]">{id} · {items.length} events</p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="h-8 w-8 rounded-full p-0 text-[#B8B8B8] hover:bg-white/10 hover:text-white"
            aria-label="Close thread"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          <section className="rounded-xl border border-[#4A4A4A] bg-[#303030] p-3 shadow-[0_12px_28px_-22px_rgba(0,0,0,0.7)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-[#DCDCDC]">
                <MessageSquareText className="h-4 w-4 text-[#5BA8A0]" />
                Conversation
              </div>
              <div className="flex items-center gap-1">
                {participants.map((name) => (
                  <span key={name} className="inline-flex h-6 items-center rounded-full border border-white/10 bg-white/5 px-2 text-[11px] text-[#CFCFCF]">
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <ThreadView items={items} />
          </section>

          <section className="rounded-xl border border-[#4A4A4A] bg-[#303030] p-3 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.75)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Task summary</p>
              <Badge className={`rounded-full border px-2 py-0.5 text-[11px] ${saveStateTone(saveState)}`}>
                {saveState}
              </Badge>
            </div>

            {!issue ? (
              <p className="text-sm text-[#9E9E9E]">No task details available for this thread context.</p>
            ) : !editMode ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#F4F4F4]">{issue.title}</p>
                <p className="text-[#B8B8B8]">{issue.description ?? 'No description provided.'}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-[#5BA8A0]/40 bg-[#5BA8A0]/20 text-[#CFE7E3]">{issue.status}</Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/5 text-[#CFCFCF]">P{issue.priority}</Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/5 text-[#CFCFCF]">{issue.issue_type}</Badge>
                  {issue.assignee ? <Badge className="rounded-full border border-white/10 bg-white/5 text-[#CFCFCF]">@{issue.assignee}</Badge> : null}
                </div>
                <div className="pt-1">
                  <Button
                    onClick={() => setEditMode(true)}
                    disabled={!canEdit}
                    className="h-8 rounded-full bg-[#7CB97A] px-4 text-[#1A1A1A] hover:bg-[#8FCC8D] disabled:opacity-40"
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
        </div>
      </ScrollArea>

      <footer className="border-t border-[#4A4A4A] bg-[#2F2F2F] p-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#4A4A4A] bg-[#3A3A3A] p-1">
          <Input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && comment.trim()) {
                event.preventDefault();
                setComment('');
              }
            }}
            placeholder="Reply to thread..."
            className="border-0 bg-transparent text-white placeholder:text-[#888888]"
          />
          <Button
            type="button"
            className="h-8 rounded-full bg-[#5BA8A0] px-3 text-[#1A1A1A] hover:bg-[#6AB8AF]"
            onClick={() => setComment('')}
            disabled={!comment.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
