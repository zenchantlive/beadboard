import { useState } from 'react';
import type { KeyboardEvent, MouseEventHandler } from 'react';
import { Clock3, GitBranch, Link2, MessageCircle, MessageSquare, UserPlus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { SocialCard as SocialCardData, AgentStatus } from '../../lib/social-cards';
import { AgentAvatar } from '../shared/agent-avatar';
import { AgentActionRow } from '../agents';
import { useArchetypePicker } from '../../hooks/use-archetype-picker';
import type { AgentArchetype } from '../../lib/types-swarm';

interface SocialCardProps {
  data: SocialCardData;
  className?: string;
  selected?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onJumpToGraph?: (id: string) => void;
  onOpenThread?: () => void;
  description?: string;
  updatedLabel?: string;
  dependencyCount?: number;
  commentCount?: number;
  unreadCount?: number;
  blockedByDetails?: Array<{ id: string; title: string; epic?: string }>;
  unblocksDetails?: Array<{ id: string; title: string; epic?: string }>;
  archetypes?: AgentArchetype[];
  projectRoot?: string;
  swarmId?: string;
  onLaunchSwarm?: () => void;
  onAskOrchestrator?: () => void;
  agentUnreadByName?: Record<string, number>;
  agentMessagesByName?: Record<string, Array<{
    message_id: string;
    from_agent: string;
    category: 'HANDOFF' | 'BLOCKED' | 'DECISION' | 'INFO';
    subject: string;
    body: string;
    state: 'unread' | 'read' | 'acked';
    requires_ack: boolean;
  }>>;
  agentReservationsByName?: Record<string, string | undefined>;
  onAckMessage?: (agent: string, messageId: string) => Promise<void> | void;
}

function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>, onClick?: MouseEventHandler<HTMLDivElement>) {
  if (!onClick) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onClick(event as unknown as Parameters<MouseEventHandler<HTMLDivElement>>[0]);
}

function statusVisual(status: SocialCardData['status']) {
  if (status === 'blocked') {
    return {
      border: 'var(--accent-danger)',
      badgeBg: 'var(--status-blocked)',
      badgeText: '#ffd5df',
      chipText: 'Blocked',
    };
  }

  if (status === 'in_progress') {
    return {
      border: 'var(--accent-warning)',
      badgeBg: 'var(--status-in-progress)',
      badgeText: '#ffe5c7',
      chipText: 'Active',
    };
  }

  if (status === 'ready') {
    return {
      border: 'var(--accent-success)',
      badgeBg: 'var(--status-ready)',
      badgeText: '#d6ffe7',
      chipText: 'Ready',
    };
  }

  return {
    border: 'var(--border-default)',
    badgeBg: 'var(--status-closed)',
    badgeText: 'var(--text-tertiary)',
    chipText: 'Closed',
  };
}

function dependencyPanel(
  title: string,
  color: string,
  details: Array<{ id: string; title: string; epic?: string }>,
) {
  if (details.length === 0) return null;

  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] px-2.5 py-2">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color }}>
        {title}
      </p>
      <div className="space-y-1.5">
        {details.slice(0, 1).map((item) => (
          <div
            key={`${title}-${item.id}`}
            className="rounded border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-2 py-1.5"
          >
            <div className="mb-0.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-info)]" />
              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{item.id}</span>
            </div>
            <p className="line-clamp-1 text-xs text-[var(--text-primary)]">{item.title}</p>
            {item.epic ? (
              <p className="line-clamp-1 text-[10px] text-[var(--accent-info)]">↳ {item.epic}</p>
            ) : null}
          </div>
        ))}
      </div>
      {details.length > 1 ? <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">+{details.length - 1} more</p> : null}
    </div>
  );
}

function categoryBadgeClass(category: 'HANDOFF' | 'BLOCKED' | 'DECISION' | 'INFO'): string {
  if (category === 'BLOCKED') return 'bg-red-600/25 text-red-200 border-red-500/40';
  if (category === 'HANDOFF') return 'bg-amber-500/20 text-amber-200 border-amber-400/40';
  if (category === 'DECISION') return 'bg-sky-500/20 text-sky-200 border-sky-400/40';
  return 'bg-slate-600/20 text-slate-200 border-slate-500/40';
}

export function SocialCard({
  data,
  className,
  selected = false,
  onClick,
  onJumpToGraph,
  description,
  updatedLabel = 'just now',
  dependencyCount,
  commentCount,
  unreadCount = 0,
  blockedByDetails = [],
  unblocksDetails = [],
  archetypes = [],
  projectRoot,
  swarmId,
  onLaunchSwarm,
  onAskOrchestrator,
  agentUnreadByName = {},
  agentMessagesByName = {},
  agentReservationsByName = {},
  onAckMessage,
}: SocialCardProps) {
  const status = statusVisual(data.status);
  const { selectedArchetype, setSelectedArchetype, isAssigning, assignSuccess, handleAssign } = useArchetypePicker();
  const showAssign = (data.status === 'blocked' || data.agents.length === 0) && archetypes.length > 0;
  const isSwarmHighlighted = swarmId && data.id.includes(swarmId);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [ackingMessageId, setAckingMessageId] = useState<string | null>(null);

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => handleCardKeyDown(event, onClick)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${data.title}`}
      className={cn(
        'group relative flex min-h-[290px] cursor-pointer flex-col rounded-[14px] border px-3.5 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-info)]',
        isSwarmHighlighted && 'ring-2 ring-blue-500',
        className,
      )}
      style={{
        background: 'var(--surface-quaternary)',
        borderColor: selected ? status.border : 'var(--border-default)',
        boxShadow: selected
          ? `0 0 0 2px ${status.border}, 0 20px 40px -20px rgba(0,0,0,0.6)`
          : '0 4px 12px -6px rgba(0,0,0,0.4)',
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ backgroundColor: status.badgeBg, color: status.badgeText }}>
            {status.chipText}
          </Badge>
          <span className="font-mono text-[11px] text-[var(--accent-info)]">{data.priority}</span>
          <span className="truncate font-mono text-[11px] text-[var(--text-tertiary)]">{data.id}</span>
          {unreadCount > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-danger)] px-1 text-[10px] font-semibold text-[var(--text-inverse)]">
              {unreadCount}
            </span>
          ) : null}
        </div>
      </div>

      <h3 className="line-clamp-2 text-[27px] font-semibold leading-[1.13] tracking-[-0.01em] text-[var(--text-primary)]">{data.title}</h3>
      <p className="mt-1.5 line-clamp-3 min-h-[56px] text-[13px] leading-relaxed text-[var(--text-tertiary)]">
        {description || 'No summary provided yet.'}
      </p>

      <div className="mt-2 flex flex-col gap-2">
        {dependencyPanel('Blocked By', 'var(--accent-danger)', blockedByDetails)}
        {dependencyPanel('Unblocks', 'var(--accent-success)', unblocksDetails)}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {data.agents.slice(0, 3).map((agent) => {
          const unreadCount = agentUnreadByName[agent.name] ?? 0;
          const reservation = agentReservationsByName[agent.name];
          return (
            <div key={`${data.id}-${agent.name}`} className="flex items-center gap-1.5">
              <AgentAvatar
                name={agent.name}
                status={agent.status as AgentStatus}
                role={agent.role}
                size="sm"
              />
              <div className="flex flex-col gap-1">
                <span className="max-w-[84px] truncate text-[10px] text-[var(--text-tertiary)]">{agent.name}</span>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedAgent((prev) => (prev === agent.name ? null : agent.name));
                      }}
                      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-danger)] px-1 text-[10px] font-semibold text-[var(--text-inverse)]"
                      title={`Unread for ${agent.name}`}
                    >
                      {unreadCount}
                    </button>
                  ) : null}
                  {reservation ? (
                    <span className="max-w-[92px] truncate rounded border border-cyan-500/30 bg-cyan-500/10 px-1 py-0.5 text-[9px] text-cyan-200" title={reservation}>
                      {reservation}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {data.agents.length === 0 ? <span className="text-xs text-[var(--text-tertiary)]">No crew</span> : null}
      </div>

      {expandedAgent ? (
        <div className="mt-2 space-y-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] p-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            {expandedAgent} inbox
          </p>
          {(agentMessagesByName[expandedAgent] ?? []).slice(0, 4).map((message) => (
            <div
              key={message.message_id}
              className="rounded border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] p-2"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${categoryBadgeClass(message.category)}`}>
                  {message.category}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">{message.state}</span>
              </div>
              <p className="text-[11px] font-semibold text-[var(--text-primary)]">{message.subject}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{message.body}</p>
              <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">from {message.from_agent}</p>
              {message.requires_ack && message.state !== 'acked' && onAckMessage ? (
                <button
                  type="button"
                  onClick={async (event) => {
                    event.stopPropagation();
                    setAckingMessageId(message.message_id);
                    try {
                      await onAckMessage(expandedAgent, message.message_id);
                    } finally {
                      setAckingMessageId(null);
                    }
                  }}
                  disabled={ackingMessageId === message.message_id}
                  className="mt-1 rounded border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-200 disabled:opacity-60"
                >
                  {ackingMessageId === message.message_id ? 'Acking...' : 'Ack'}
                </button>
              ) : null}
            </div>
          ))}
          {(agentMessagesByName[expandedAgent] ?? []).length === 0 ? (
            <p className="text-[11px] text-[var(--text-tertiary)]">No messages.</p>
          ) : null}
        </div>
      ) : null}

      {showAssign && (
        <div className="mt-2 flex gap-2 items-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <select
            value={selectedArchetype ?? ''}
            onChange={(e) => setSelectedArchetype(e.target.value || null)}
            className="min-w-0 flex-1 text-xs border border-[var(--border-subtle)] rounded-md px-2 py-1.5 bg-[var(--surface-input)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-info)]"
          >
            <option value="" disabled>Select agent role...</option>
            {archetypes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await handleAssign(data.id);
            }}
            disabled={!selectedArchetype || isAssigning || assignSuccess}
            className={`flex-shrink-0 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 flex items-center gap-1 ${assignSuccess ? 'bg-[var(--accent-success)] text-white' : 'bg-[var(--accent-info)] text-white hover:bg-[var(--accent-info)]/90'}`}
          >
            <UserPlus className="w-3 h-3" />
            {isAssigning ? '...' : assignSuccess ? '✓' : 'Assign'}
          </button>
        </div>
      )}

      <div className="mt-auto border-t border-[var(--border-subtle)] pt-1.5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{updatedLabel}</span>
          <span className="font-mono text-[11px] text-[var(--accent-success)]">stage active</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <span className="inline-flex items-center gap-1"><Link2 className="h-3.5 w-3.5" aria-hidden="true" />{dependencyCount ?? data.blocks.length + data.unblocks.length}</span>
            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />{commentCount ?? 0}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onJumpToGraph?.(data.id);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] text-[var(--accent-info)] transition-colors hover:bg-[var(--alpha-white-low)]"
              aria-label="View dependency graph"
              title="View dependency graph"
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {onAskOrchestrator ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onAskOrchestrator();
                }}
                className="inline-flex items-center gap-1 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-200 transition-colors hover:bg-cyan-500/20"
                aria-label="Ask orchestrator"
                title="Ask Orchestrator"
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Ask
              </button>
            ) : null}
            {projectRoot && archetypes.length > 0 ? (
              <AgentActionRow
                beadId={data.id}
                beadStatus={data.status}
                agents={archetypes}
                projectRoot={projectRoot}
                currentAgentTypeId={data.agentTypeId}
                size="sm"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
