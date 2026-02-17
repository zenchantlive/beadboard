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
    issue.labels.includes(AGENT_LABEL) || issue.labels.some(l => l.startsWith('gt:agent'))
  );
  
  const roster = agentIssues.map(issue => {
    const name = extractAgentName(issue) || issue.id;
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

  // Filter: if there are active agents, show only active + stale (max 5)
  // If no active, show stale + stuck (max 3)
  // Dead agents never show unless it's the only thing
  const activeCount = roster.filter(a => a.status === 'active').length;
  
  if (activeCount > 0) {
    return roster.filter(a => a.status !== 'dead').slice(0, 5);
  } else {
    return roster.filter(a => a.status !== 'dead').slice(0, 3);
  }
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
      <div className="flex flex-col items-center gap-4 py-4 h-full bg-black/20">
        {/* Collapsed Agent Icons */}
        <div className="flex flex-col gap-2">
          {agentRoster.slice(0, 5).map(agent => (
            <div key={agent.beadId} className="relative group cursor-help" title={`${agent.name} (${agent.status})`}>
              <Avatar className="h-8 w-8 ring-1 ring-white/10 hover:ring-white/30 transition-all">
                <AvatarFallback className="text-[10px] bg-white/5">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1e1e1e]",
                agent.status === 'active' ? 'bg-emerald-500' :
                agent.status === 'stale' ? 'bg-amber-500' : 'bg-rose-500'
              )} />
            </div>
          ))}
        </div>
        
        {/* Divider */}
        <div className="w-4 h-[1px] bg-white/10" />
        
        {/* Mini Activity Dots (Just visual pulse) */}
        <div className="flex flex-col gap-1">
           {/* Just show a few recent activity dots as a visual "heartbeat" */}
           {activities.slice(0, 5).map((act) => (
             <div key={act.id} className={cn(
               "w-1.5 h-1.5 rounded-full opacity-50",
               act.kind === 'created' ? 'bg-emerald-500' : 'bg-cyan-500'
             )} />
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* AGENT ROSTER SECTION */}
      <div className="flex-shrink-0 p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Agents</h3>
          <div className="flex gap-2">
            {activeAgents > 0 && (
              <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                {activeAgents} active
              </Badge>
            )}
            {staleAgents > 0 && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                {staleAgents} stale
              </Badge>
            )}
          </div>
        </div>
        
        {agentRoster.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No active agents</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {agentRoster.map(agent => (
              <div
                key={agent.beadId}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(agent.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{agent.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* ACTIVITY FEED SECTION */}
      <div className="flex-1 min-h-0">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
        </div>
        
        <ScrollArea className="h-[calc(100%-40px)]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="p-2">
              {activities.map((activity, index) => {
                const eventInfo = getEventKindInfo(activity.kind);
                return (
                  <div key={activity.id}>
                    <div className="flex items-start gap-2 py-2 px-1 rounded hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center mt-0.5">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.kind === 'heartbeat' ? 'bg-muted' :
                          activity.kind === 'created' ? 'bg-emerald-500' :
                          activity.kind === 'closed' ? 'bg-amber-500' :
                          'bg-cyan-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium ${eventInfo.color}`}>
                            {eventInfo.label}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {activity.beadId}
                          </span>
                        </div>
                        <p className="text-xs text-foreground line-clamp-1 mt-0.5">
                          {activity.beadTitle}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {activity.actor && (
                            <span className="text-[10px] text-muted-foreground">
                              {activity.actor}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {index < activities.length - 1 && (
                      <Separator className="my-0.5" />
                    )}
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