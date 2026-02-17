'use client';

import { useMemo } from 'react';
import { Clock3, Layers2, Sparkles, TriangleAlert } from 'lucide-react';
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

const STATUS_SCORE: Record<string, number> = {
  blocked: 5,
  in_progress: 4,
  ready: 3,
  open: 3,
  deferred: 2,
  closed: 1,
};

export function SocialPage({ issues, selectedId, onSelect, projectScopeOptions = [] }: SocialPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cards = useMemo(() => buildSocialCards(issues), [issues]);

  const navigateWithParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    const query = next.toString();
    router.push(query ? `/?${query}` : '/', { scroll: false });
  };

  const issueById = useMemo(() => {
    const map = new Map<string, BeadIssue>();
    for (const issue of issues) {
      map.set(issue.id, issue);
    }
    return map;
  }, [issues]);

  const orderedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const scoreDiff = (STATUS_SCORE[b.status] ?? 0) - (STATUS_SCORE[a.status] ?? 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return b.lastActivity.getTime() - a.lastActivity.getTime();
    });
  }, [cards]);

  const selectedCard = useMemo(
    () => orderedCards.find((card) => card.id === selectedId) ?? null,
    [orderedCards, selectedId],
  );

  const selectedIssue = selectedCard ? issueById.get(selectedCard.id) ?? null : null;

  const metrics = useMemo(() => {
    const blocked = cards.filter((card) => card.status === 'blocked').length;
    const active = cards.filter((card) => card.status === 'in_progress').length;
    const ready = cards.filter((card) => card.status === 'ready').length;
    const urgent = cards.filter((card) => card.priority === 'P0').length;

    return { blocked, active, ready, urgent };
  }, [cards]);

  return (
    <div className="relative h-full overflow-y-auto bg-[#2D2D2D] custom-scrollbar">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(90,70,50,0.42),transparent_34%),radial-gradient(circle_at_88%_82%,rgba(35,72,77,0.34),transparent_36%)]" />
      <div className="relative mx-auto flex max-w-[1450px] flex-col gap-4 p-5">
        <section className="rounded-2xl bg-[linear-gradient(160deg,rgba(57,57,66,0.95),rgba(46,49,60,0.95))] p-4 shadow-[0_24px_40px_-26px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B8B8B]">Social Stream</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">Task Activity Command Feed</h2>
              <p className="mt-1 text-sm text-[#B8B8B8]">Two-column live task stream with inline thread context.</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="rounded-full bg-[#404856] px-3 py-1 text-[#D8D8D8] shadow-[0_10px_18px_-14px_rgba(0,0,0,0.8)]">{projectScopeOptions.length} scopes</div>
              <div className="rounded-full bg-[#404856] px-3 py-1 text-[#D8D8D8] shadow-[0_10px_18px_-14px_rgba(0,0,0,0.8)]">{cards.length} tasks</div>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-[#7CB97A]/24 px-3 py-2 text-xs font-semibold text-[#DDF0DA] shadow-[0_12px_20px_-16px_rgba(0,0,0,0.82)]">{metrics.ready} ready</div>
            <div className="rounded-xl bg-[#D4A574]/24 px-3 py-2 text-xs font-semibold text-[#F0DEC8] shadow-[0_12px_20px_-16px_rgba(0,0,0,0.82)]">{metrics.active} in progress</div>
            <div className="rounded-xl bg-[#C97A7A]/24 px-3 py-2 text-xs font-semibold text-[#F3D2D2] shadow-[0_12px_20px_-16px_rgba(0,0,0,0.82)]">{metrics.blocked} blocked</div>
            <div className="rounded-xl bg-[#E24A3A]/24 px-3 py-2 text-xs font-semibold text-[#F7CBC6] shadow-[0_12px_20px_-16px_rgba(0,0,0,0.82)]">{metrics.urgent} P0</div>
          </div>
        </section>

        {selectedCard && selectedIssue ? (
          <section className="rounded-2xl bg-[radial-gradient(circle_at_100%_50%,rgba(91,168,160,0.2),transparent_45%),rgba(54,57,66,0.94)] p-3 shadow-[0_16px_30px_-18px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#DDEDEC]">
                <Sparkles className="h-4 w-4 text-[#5BA8A0]" />
                <p className="text-sm font-semibold">Focused thread context</p>
              </div>
              <p className="text-xs text-[#8B8B8B]">{selectedCard.id}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
              <p className="line-clamp-2 text-sm text-[#D8D8D8]">{selectedIssue.description ?? selectedIssue.title}</p>
              <p className="inline-flex items-center gap-1 text-xs text-[#9E9E9E]"><Clock3 className="h-3.5 w-3.5" />{formatRelative(selectedIssue.updated_at)}</p>
              <p className="inline-flex items-center gap-1 text-xs text-[#9E9E9E]"><Layers2 className="h-3.5 w-3.5" />{selectedIssue.dependencies.length} deps</p>
              {selectedIssue.status === 'blocked' ? (
                <p className="inline-flex items-center gap-1 text-xs text-[#E1BC8F]"><TriangleAlert className="h-3.5 w-3.5" />Needs unblock</p>
              ) : (
                <p className="text-xs text-[#7CB97A]">Healthy flow</p>
              )}
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 pb-6 xl:grid-cols-2">
          {orderedCards.map((card) => {
            const issue = issueById.get(card.id);
            const commentCount = typeof issue?.metadata?.commentCount === 'number' ? issue.metadata.commentCount : 0;
            const unreadCount = typeof issue?.metadata?.unreadCount === 'number' ? issue.metadata.unreadCount : 0;
            const description = issue?.description ?? undefined;

            return (
              <SocialCard
                key={card.id}
                data={card}
                selected={selectedId === card.id}
                onClick={() => onSelect(card.id)}
                onJumpToGraph={(id) => {
                  navigateWithParams({
                    view: 'graph',
                    task: id,
                    swarm: null,
                    panel: 'open',
                    drawer: 'closed',
                  });
                }}
                onJumpToActivity={(id) => {
                  navigateWithParams({
                    view: 'activity',
                    task: id,
                    panel: 'open',
                    drawer: 'closed',
                  });
                }}
                onOpenThread={() => onSelect(card.id)}
                description={description ?? undefined}
                updatedLabel={issue ? formatRelative(issue.updated_at) : 'just now'}
                dependencyCount={issue?.dependencies.length ?? card.blocks.length + card.unblocks.length}
                commentCount={commentCount}
                unreadCount={unreadCount}
              />
            );
          })}
        </section>
      </div>
    </div>
  );
}
