'use client';

import { useEffect, useState, useMemo } from 'react';
import type { BeadIssue } from '../../lib/types';
import type { ActivityEvent } from '../../lib/activity';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type AgentStatus = 'active' | 'stale' | 'stuck' | 'dead';

type AgentTone = {
  cardClass: string;
  labelClass: string;
  ringClass: string;
  glowClass: string;
};

export type EventTone = {
  label: string;
  labelClass: string;
  dotClass: string;
  cardClass: string;
  idClass: string;
};

interface AgentRosterEntry {
  name: string;
  status: AgentStatus;
  lastSeen: string | null;
  beadId: string;
}

interface ActivityPanelProps {
  issues: BeadIssue[];
  collapsed?: boolean;
  projectRoot: string;
}

const AGENT_LABEL = 'gt:agent';

// Determine agent status based on last activity
function deriveAgentStatus(lastSeenAt: string | null): AgentStatus {
  if (!lastSeenAt) return 'dead';

  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const minutesSince = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

  if (minutesSince < 15) return 'active';
  if (minutesSince < 30) return 'stale';
  if (minutesSince < 60) return 'stuck';
  return 'dead';
}

// Get agent name from bead
function extractAgentName(issue: BeadIssue): string | null {
  const agentMatch = issue.title.match(/Agent:\s*(\S+)/i);
  if (agentMatch) return agentMatch[1];

  const agentLabel = issue.labels.find(l => l.startsWith('agent:'));
  if (agentLabel) return agentLabel.replace('agent:', '');

  return null;
}

// Build agent roster - filter out dead agents unless none are active
function buildAgentRoster(issues: BeadIssue[]): AgentRosterEntry[] {
  const agentIssues = issues.filter(issue =>
    issue.labels.includes(AGENT_LABEL) ||
    issue.labels.some(l => l.startsWith('gt:agent')) ||
    issue.labels.includes('agent')
  );

  const roster = agentIssues.map(issue => {
    const name = extractAgentName(issue) || issue.title.replace('Agent: ', '') || issue.id;
    const status = deriveAgentStatus(issue.updated_at);

    return {
      name,
      status,
      lastSeen: issue.updated_at,
      beadId: issue.id,
    };
  }).sort((a, b) => {
    const statusOrder: Record<AgentStatus, number> = { active: 0, stale: 1, stuck: 2, dead: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // Show all non-dead agents, or at least the most recent ones
  return roster.filter(a => a.status !== 'dead' || a.lastSeen).slice(0, 10);
}

// Format relative time
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getAgentTone(status: AgentStatus): AgentTone {
  const tones: Record<AgentStatus, AgentTone> = {
    active: {
      cardClass: 'bg-[#173126]',
      labelClass: 'text-[#7CB97A]',
      ringClass: 'ring-[#7CB97A]/45',
      glowClass: 'bg-[#7CB97A]/30',
    },
    stale: {
      cardClass: 'bg-[#322817]',
      labelClass: 'text-[#D4A574]',
      ringClass: 'ring-[#D4A574]/45',
      glowClass: 'bg-[#D4A574]/30',
    },
    stuck: {
      cardClass: 'bg-[#341a1f]',
      labelClass: 'text-[#C97A7A]',
      ringClass: 'ring-[#C97A7A]/45',
      glowClass: 'bg-[#C97A7A]/30',
    },
    dead: {
      cardClass: 'bg-[#2b232b]',
      labelClass: 'text-[#A78A94]',
      ringClass: 'ring-[#A78A94]/40',
      glowClass: 'bg-[#A78A94]/25',
    },
  };

  return tones[status];
}

// reopened=blue, closed=amber, created/opened=green, others semantic
export function getEventTone(kind: string): EventTone {
  const normalized = kind.toLowerCase();
  const byKind: Record<string, EventTone> = {
    created: {
      label: 'Created',
      labelClass: 'text-[#7CB97A]',
      dotClass: 'bg-[#7CB97A]',
      cardClass: 'bg-[#182f25]',
      idClass: 'text-[#9ACB98]',
    },
    opened: {
      label: 'Opened',
      labelClass: 'text-[#7CB97A]',
      dotClass: 'bg-[#7CB97A]',
      cardClass: 'bg-[#182f25]',
      idClass: 'text-[#9ACB98]',
    },
    closed: {
      label: 'Closed',
      labelClass: 'text-[#D4A574]',
      dotClass: 'bg-[#D4A574]',
      cardClass: 'bg-[#332716]',
      idClass: 'text-[#DAB891]',
    },
    reopened: {
      label: 'Reopened',
      labelClass: 'text-[#5B95E8]',
      dotClass: 'bg-[#5B95E8]',
      cardClass: 'bg-[#1b2b43]',
      idClass: 'text-[#8DB4EF]',
    },
    status_changed: {
      label: 'Status changed',
      labelClass: 'text-[#D4A574]',
      dotClass: 'bg-[#D4A574]',
      cardClass: 'bg-[#2f2518]',
      idClass: 'text-[#DAB891]',
    },
    priority_changed: {
      label: 'Priority changed',
      labelClass: 'text-[#D4A574]',
      dotClass: 'bg-[#D4A574]',
      cardClass: 'bg-[#2f2518]',
      idClass: 'text-[#DAB891]',
    },
    assignee_changed: {
      label: 'Assigned',
      labelClass: 'text-[#D4A574]',
      dotClass: 'bg-[#D4A574]',
      cardClass: 'bg-[#2f2518]',
      idClass: 'text-[#DAB891]',
    },
    dependency_added: {
      label: 'Dependency added',
      labelClass: 'text-[#D4A574]',
      dotClass: 'bg-[#D4A574]',
      cardClass: 'bg-[#2f2518]',
      idClass: 'text-[#DAB891]',
    },
    dependency_removed: {
      label: 'Dependency removed',
      labelClass: 'text-[#C97A7A]',
      dotClass: 'bg-[#C97A7A]',
      cardClass: 'bg-[#321b21]',
      idClass: 'text-[#D9A9A9]',
    },
    heartbeat: {
      label: 'Heartbeat',
      labelClass: 'text-[#5BA8A0]',
      dotClass: 'bg-[#5BA8A0]',
      cardClass: 'bg-[#173034]',
      idClass: 'text-[#8BC9C1]',
    },
    commented: {
      label: 'Commented',
      labelClass: 'text-[#5BA8A0]',
      dotClass: 'bg-[#5BA8A0]',
      cardClass: 'bg-[#173034]',
      idClass: 'text-[#8BC9C1]',
    },
    comment_added: {
      label: 'Commented',
      labelClass: 'text-[#5BA8A0]',
      dotClass: 'bg-[#5BA8A0]',
      cardClass: 'bg-[#173034]',
      idClass: 'text-[#8BC9C1]',
    },
  };

  return (
    byKind[normalized] || {
      label: normalized.replace(/_/g, ' '),
      labelClass: 'text-[#5BA8A0]',
      dotClass: 'bg-[#5BA8A0]',
      cardClass: 'bg-[#173034]',
      idClass: 'text-[#8BC9C1]',
    }
  );
}

export function getInitials(name: string): string {
  return name.split(/[-_\s]/).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export function ActivityPanel({ issues, collapsed = false, projectRoot }: ActivityPanelProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const agentRoster = useMemo(() => buildAgentRoster(issues), [issues]);

  // Fetch activity history
  useEffect(() => {
    async function fetchActivity() {
      try {
        const response = await fetch('/api/activity');
        if (response.ok) {
          const data = await response.json();
          setActivities(data.slice(0, 50)); // Limit to 50 events
        }
      } catch (error) {
        console.error('[ActivityPanel] Failed to fetch activity:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchActivity();
  }, []);

  // Subscribe to real-time activity
  useEffect(() => {
    console.log('[ActivityPanel] Connecting to SSE for:', projectRoot);
    const source = new EventSource(`/api/events?projectRoot=${encodeURIComponent(projectRoot)}`);

    const onActivity = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[ActivityPanel] Received activity event:', data);
        // data IS the activity event directly (not wrapped in { event: ... })
        if (data?.beadId) {
          setActivities(prev => [data, ...prev].slice(0, 50));
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    source.addEventListener('activity', onActivity as EventListener);

    return () => {
      console.log('[ActivityPanel] Closing SSE connection');
      source.removeEventListener('activity', onActivity as EventListener);
      source.close();
    };
  }, [projectRoot]);

  const activeAgents = agentRoster.filter(a => a.status === 'active').length;
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-6 py-6 h-full bg-[linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.36))] shadow-[inset_10px_0_22px_-20px_rgba(0,0,0,0.9)]">
        {/* Collapsed Agent Icons with ZFC Rings */}
        <div className="flex flex-col gap-4">
          {agentRoster.slice(0, 6).map(agent => (
            <div key={agent.beadId} className="relative group cursor-help" title={`${agent.name} (${agent.status})`}>
              <div className={cn(
                "absolute -inset-1 rounded-full blur-[2px] transition-opacity duration-500",
                agent.status === 'active' ? 'bg-[#7CB97A]/20 opacity-100 animate-pulse' :
                  agent.status === 'stale' ? 'bg-[#D4A574]/14 opacity-80' :
                    agent.status === 'stuck' ? 'bg-[#C97A7A]/20 opacity-100' : 'bg-[#A78A94]/18 opacity-90'
              )} />
              <Avatar className={cn(
                "h-9 w-9 ring-2 transition-all duration-300 relative z-10",
                agent.status === 'active' ? 'ring-[#7CB97A]/45' :
                  agent.status === 'stale' ? 'ring-[#D4A574]/45' :
                    agent.status === 'stuck' ? 'ring-[#C97A7A]/45' : 'ring-[#A78A94]/40'
              )}>
                <AvatarFallback className="text-[10px] font-bold bg-[#1a1a1a] text-text-muted">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          ))}
        </div>

        <div className="w-6 h-[1px] bg-white/20 mx-auto" />

        {/* Activity Pulses */}
        <div className="flex flex-col gap-2 opacity-40">
          {activities.slice(0, 8).map((act) => (
            <div key={act.id} className={cn(
              "w-1 h-1 rounded-full",
              getEventTone(act.kind).dotClass
            )} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#070f19] backdrop-blur-xl">
      {/* AGENT ROSTER SECTION */}
      <div className="flex-shrink-0 p-4 bg-[#0b1625] shadow-[0_16px_24px_-24px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Live Agents</h3>
          </div>
          <div className="text-[10px] font-mono text-[#7CB97A]/80 bg-[#7CB97A]/15 px-2 py-0.5 rounded shadow-[0_10px_16px_-12px_rgba(0,0,0,0.8)]">
            {activeAgents} ONLINE
          </div>
        </div>

        {agentRoster.length === 0 ? (
          <p className="text-xs text-text-muted/40 italic text-center py-4">No agents broadcasting</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {agentRoster.map(agent => (
              <div key={agent.beadId} className={cn(
                'group flex items-center gap-3 p-2 rounded-xl transition-all duration-300 shadow-[0_14px_24px_-14px_rgba(0,0,0,0.92)]',
                getAgentTone(agent.status).cardClass,
              )}>
                <div className="relative">
                  <div className={cn(
                    "absolute -inset-0.5 rounded-full blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity",
                    getAgentTone(agent.status).glowClass
                  )} />
                  <Avatar className={cn("h-8 w-8 relative z-10 ring-1", getAgentTone(agent.status).ringClass)}>
                    <AvatarFallback className="text-[10px] font-bold bg-[#252525]">
                      {getInitials(agent.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-semibold text-text-primary group-hover:text-white transition-colors">{agent.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-[9px] uppercase tracking-wider font-bold",
                      getAgentTone(agent.status).labelClass
                    )}>
                      {agent.status}
                    </span>
                    <span className="text-[9px] text-text-muted/40 font-mono">
                      {agent.lastSeen ? formatRelativeTime(agent.lastSeen) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTIVITY FEED SECTION */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="p-4 flex items-center gap-2 shadow-[0_14px_24px_-24px_rgba(0,0,0,0.9)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/60"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Telemetry Stream</h3>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-10 flex flex-col items-center gap-3">
              <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-mono text-text-muted">SYNCING...</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-10 text-center opacity-30">
              <p className="text-[10px] font-mono">VOID_STREAM_NULL</p>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {activities.map((activity) => {
                const eventTone = getEventTone(activity.kind);
                return (
                  <div key={activity.id} className="group relative">
                    <div className={cn(
                      "p-3 rounded-xl transition-all duration-300 shadow-[0_14px_24px_-14px_rgba(0,0,0,0.94)]",
                      eventTone.cardClass
                    )}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          eventTone.dotClass
                        )} />
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", eventTone.labelClass)}>
                          {eventTone.label}
                        </span>
                        <span className="text-[9px] text-text-muted/30 font-mono ml-auto">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-text-secondary leading-snug line-clamp-2 mb-2 group-hover:text-text-primary transition-colors">
                        {activity.beadTitle}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className={cn("text-[10px] font-mono", eventTone.idClass)}>
                          {activity.beadId}
                        </span>
                        {activity.actor && (
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-white/10 shadow-[0_0_8px_rgba(0,0,0,0.45)] flex items-center justify-center text-[6px] font-bold">
                              {activity.actor[0].toUpperCase()}
                            </div>
                            <span className="text-[9px] text-text-muted/60">{activity.actor}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
