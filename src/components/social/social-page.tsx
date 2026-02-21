'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { BeadIssue } from '../../lib/types';
import type { ProjectScopeOption } from '../../lib/project-scope';
import { buildSocialCards } from '../../lib/social-cards';
import { SocialCard } from './social-card';

interface SocialPageProps {
  issues: BeadIssue[];
  selectedId?: string;
  onSelect: (id: string) => void;
  projectScopeOptions?: ProjectScopeOption[];
  blockedOnly?: boolean;
}

type SectionKey = 'ready' | 'in_progress' | 'blocked' | 'deferred' | 'done';

const SECTION_LABEL: Record<SectionKey, string> = {
  ready: 'Ready',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  deferred: 'Deferred',
  done: 'Done',
};

const SECTION_COLOR: Record<SectionKey, string> = {
  ready: 'var(--ui-accent-ready)',
  in_progress: 'var(--ui-accent-warning)',
  blocked: 'var(--ui-accent-blocked)',
  deferred: 'var(--ui-accent-info)',
  done: 'var(--ui-text-muted)',
};

function bucketForStatus(status: string): SectionKey {
  if (status === 'ready') return 'ready';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'blocked') return 'blocked';
  if (status === 'closed') return 'done';
  return 'deferred';
}

function formatRelative(timestamp: string): string {
  const then = new Date(timestamp);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - then.getTime()) / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function SocialPage({
  issues,
  selectedId,
  onSelect,
  projectScopeOptions = [],
  blockedOnly = false,
}: SocialPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cards = useMemo(() => buildSocialCards(issues), [issues]);

  const navigateWithParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.push(query ? `/?${query}` : '/', { scroll: false });
  };

  const issueById = useMemo(() => {
    const map = new Map<string, BeadIssue>();
    for (const issue of issues) map.set(issue.id, issue);
    return map;
  }, [issues]);
  const epicTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of issues) {
      if (issue.issue_type === 'epic') {
        map.set(issue.id, issue.title);
      }
    }
    return map;
  }, [issues]);

  const toDependencyDetails = (ids: string[]) =>
    ids.map((id) => {
      const depIssue = issueById.get(id);
      const parentEpicId = depIssue?.dependencies.find((dep) => dep.type === 'parent')?.target;
      return {
        id,
        title: depIssue?.title ?? id,
        epic: parentEpicId ? epicTitleById.get(parentEpicId) : undefined,
      };
    });

  const orderedCards = useMemo(
    () => [...cards].sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()),
    [cards],
  );

  const visibleCards = useMemo(
    () => (blockedOnly ? orderedCards.filter((card) => card.status === 'blocked') : orderedCards),
    [blockedOnly, orderedCards],
  );

  const grouped = useMemo(() => {
    const map: Record<SectionKey, typeof visibleCards> = {
      ready: [],
      in_progress: [],
      blocked: [],
      deferred: [],
      done: [],
    };

    for (const card of visibleCards) {
      map[bucketForStatus(card.status)].push(card);
    }

    return map;
  }, [visibleCards]);
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    ready: false,
    in_progress: false,
    blocked: false,
    deferred: false,
    done: false,
  });
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    ready: false,
    in_progress: false,
    blocked: false,
    deferred: true,
    done: true,
  });

  return (
    <div className="h-full overflow-y-auto bg-[var(--ui-bg-app)] custom-scrollbar">
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-8 pt-4 xl:px-6">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--ui-border-soft)] pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Social Stream</p>
            <p className="text-sm text-[var(--ui-text-primary)]">Task Activity Command Feed</p>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-full border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] px-2 py-1 text-[var(--ui-text-muted)]">
              {projectScopeOptions.length} scopes
            </span>
            <span className="rounded-full border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] px-2 py-1 text-[var(--ui-text-muted)]">
              {visibleCards.length} tasks
            </span>
          </div>
        </div>

        <section className="space-y-6">
          {(Object.keys(SECTION_LABEL) as SectionKey[]).map((key) => {
            const cardsForSection = grouped[key];
            return (
              <div key={key}>
                <div className="mb-3 flex items-center gap-2 border-b border-[var(--ui-border-soft)] pb-2">
                  <p className="font-mono text-xs uppercase tracking-[0.14em]" style={{ color: SECTION_COLOR[key] }}>
                    {SECTION_LABEL[key]}
                  </p>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] px-1.5 text-[10px] text-[var(--ui-text-primary)]">
                    {cardsForSection.length}
                  </span>
                  {(key === 'deferred' || key === 'done') ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedSections((current) => ({ ...current, [key]: !current[key] }))
                      }
                      className="ml-auto rounded border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ui-text-muted)] transition-colors hover:text-[var(--ui-text-primary)]"
                    >
                      {collapsedSections[key] ? 'Expand' : 'Minimize'}
                    </button>
                  ) : null}
                </div>

                {collapsedSections[key] ? (
                  <p className="px-0.5 py-1 text-sm text-[var(--ui-text-muted)]">
                    {cardsForSection.length === 0
                      ? `No tasks in ${SECTION_LABEL[key].toLowerCase()}.`
                      : `${cardsForSection.length} tasks hidden.`}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(expandedSections[key] ? cardsForSection : cardsForSection.slice(0, 3)).map((card) => {
                    const issue = issueById.get(card.id);
                    const commentCount = typeof issue?.metadata?.commentCount === 'number' ? issue.metadata.commentCount : 0;
                    const unreadCount = typeof issue?.metadata?.unreadCount === 'number' ? issue.metadata.unreadCount : 0;
                    const dependencyCount = issue?.dependencies.length ?? card.blocks.length + card.unblocks.length;

                    return (
                      <SocialCard
                        key={card.id}
                        data={card}
                        selected={selectedId === card.id}
                        onClick={() => onSelect(card.id)}
                        onJumpToGraph={(id) =>
                          navigateWithParams({
                            view: 'graph',
                            task: id,
                            swarm: null,
                            right: 'open',
                            panel: 'open',
                            drawer: 'closed',
                          })
                        }
                        onJumpToActivity={(id) =>
                          navigateWithParams({
                            view: 'activity',
                            task: id,
                            right: 'open',
                            panel: 'open',
                            drawer: 'closed',
                          })
                        }
                        onOpenThread={() => onSelect(card.id)}
                        description={issue?.description ?? undefined}
                        updatedLabel={issue ? formatRelative(issue.updated_at) : 'just now'}
                        dependencyCount={dependencyCount}
                        commentCount={commentCount}
                        unreadCount={unreadCount}
                        blockedByDetails={toDependencyDetails(card.unblocks)}
                        unblocksDetails={toDependencyDetails(card.blocks)}
                      />
                    );
                  })}
                    {cardsForSection.length === 0 ? (
                      <p className="px-0.5 py-1 text-sm text-[var(--ui-text-muted)]">
                        No tasks in this lane.
                      </p>
                    ) : null}
                  </div>
                )}

                {!collapsedSections[key] && cardsForSection.length > 3 ? (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSections((current) => ({ ...current, [key]: !current[key] }))
                      }
                      className="rounded-md border border-[var(--ui-border-soft)] bg-[var(--ui-bg-panel)] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ui-text-muted)] transition-colors hover:text-[var(--ui-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-info)]"
                    >
                      {expandedSections[key] ? 'Show Less' : `Show ${cardsForSection.length - 3} More`}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        {visibleCards.length === 0 ? (
          <p className="mt-5 px-0.5 py-1 text-sm text-[var(--ui-text-muted)]">
            No blocked tasks right now.
          </p>
        ) : null}
      </div>
    </div>
  );
}
