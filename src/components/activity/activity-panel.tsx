'use client';

import { useEffect, useState, useMemo } from 'react';
import type { BeadIssue } from '../../lib/types';
import type { ActivityEvent } from '../../lib/activity';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type AgentStatus = 'active' | 'stale' | 'stuck' | 'dead';

interface AgentRosterEntry {
  name: string;
  status: AgentStatus;
  lastSeen: string | null;
  beadId: string;
}

interface ActivityPanelProps {
  issues: BeadIssue[];
  collapsed?: boolean;
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
function formatRelativeTime(timestamp: string): string {
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

// Get event kind icon/color
function getEventKindInfo(kind: string): { label: string; color: string } {
  const events: Record<string, { label: string; color: string }> = {
    created: { label: 'Created', color: 'text-emerald-500' },
    closed: { label: 'Closed', color: 'text-amber-500' },
    reopened: { label: 'Reopened', color: 'text-blue-500' },
    status_changed: { label: 'Status changed', color: 'text-cyan-500' },
    priority_changed: { label: 'Priority changed', color: 'text-purple-500' },
    assignee_changed: { label: 'Assigned', color: 'text-indigo-500' },
    heartbeat: { label: 'Heartbeat', color: 'text-muted-foreground' },
    dependency_added: { label: 'Dependency added', color: 'text-orange-500' },
    dependency_removed: { label: 'Dependency removed', color: 'text-red-500' },
  };
  
  return events[kind] || { label: kind.replace(/_/g, ' '), color: 'text-muted-foreground' };
}

function getInitials(name: string): string {
  return name.split(/[-_\s]/).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export function ActivityPanel({ issues, collapsed = false }: ActivityPanelProps) {
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
    const source = new EventSource('/api/events');
    
    const onActivity = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.event) {
          setActivities(prev => [data.event, ...prev].slice(0, 50));
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
    
    source.addEventListener('activity', onActivity as EventListener);
    
    return () => {
      source.removeEventListener('activity', onActivity as EventListener);
      source.close();
    };
  }, []);

  const activeAgents = agentRoster.filter(a => a.status === 'active').length;
  const staleAgents = agentRoster.filter(a => a.status === 'stale').length;
  
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-6 py-6 h-full bg-black/40 border-l border-white/5 shadow-2xl">
        {/* Collapsed Agent Icons with ZFC Rings */}
        <div className="flex flex-col gap-4">
          {agentRoster.slice(0, 6).map(agent => (
            <div key={agent.beadId} className="relative group cursor-help" title={`${agent.name} (${agent.status})`}>
              <div className={cn(
                "absolute -inset-1 rounded-full blur-[2px] transition-opacity duration-500",
                agent.status === 'active' ? 'bg-emerald-500/20 opacity-100 animate-pulse' :
                agent.status === 'stale' ? 'bg-amber-500/10 opacity-50' : 'bg-rose-500/20 opacity-100'
              )} />
              <Avatar className={cn(
                "h-9 w-9 ring-2 transition-all duration-300 relative z-10",
                agent.status === 'active' ? 'ring-emerald-500/40' :
                agent.status === 'stale' ? 'ring-amber-500/20' : 'ring-rose-500/40'
              )}>
                <AvatarFallback className="text-[10px] font-bold bg-[#1a1a1a] text-text-muted">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          ))}
        </div>
        
        <div className="w-6 h-[1px] bg-white/10 mx-auto" />
        
        {/* Activity Pulses */}
        <div className="flex flex-col gap-2 opacity-40">
           {activities.slice(0, 8).map((act) => (
             <div key={act.id} className={cn(
               "w-1 h-1 rounded-full",
               act.kind === 'created' ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 'bg-cyan-500 shadow-[0_0_4px_#06b6d4]'
             )} />
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]/95 backdrop-blur-xl">
      {/* AGENT ROSTER SECTION */}
      <div className="flex-shrink-0 p-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Live Agents</h3>
          </div>
          <div className="text-[10px] font-mono text-emerald-500/60 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
            {activeAgents} ONLINE
          </div>
        </div>
        
        {agentRoster.length === 0 ? (
          <p className="text-xs text-text-muted/40 italic text-center py-4">No agents broadcasting</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {agentRoster.map(agent => (
              <div
                key={agent.beadId}
                className="group flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all duration-300"
              >
                <div className="relative">
                  <div className={cn(
                    "absolute -inset-0.5 rounded-full blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity",
                    agent.status === 'active' ? 'bg-emerald-500/30' : 'bg-amber-500/30'
                  )} />
                  <Avatar className="h-8 w-8 relative z-10 ring-1 ring-white/10">
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
                      agent.status === 'active' ? 'text-emerald-500' : 'text-amber-500'
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
        <div className="p-4 flex items-center gap-2 border-b border-white/5">
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
                const eventInfo = getEventKindInfo(activity.kind);
                return (
                  <div key={activity.id} className="group relative">
                    <div className="absolute -left-3 top-0 bottom-0 w-[1px] bg-white/5 group-hover:bg-white/10 transition-colors" />
                    
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          activity.kind === 'closed' ? 'bg-amber-500' : 'bg-emerald-500'
                        )} />
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", eventInfo.color)}>
                          {eventInfo.label}
                        </span>
                        <span className="text-[9px] text-text-muted/30 font-mono ml-auto">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-xs font-medium text-text-secondary leading-snug line-clamp-2 mb-2 group-hover:text-text-primary transition-colors">
                        {activity.beadTitle}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-teal-500/50">
                          {activity.beadId}
                        </span>
                        {activity.actor && (
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[6px] font-bold">
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