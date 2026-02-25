'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { BeadIssue } from '../../lib/types';
import type { ActivityEvent } from '../../lib/activity';
import { useArchetypes } from '../../hooks/use-archetypes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getEventTone, formatRelativeTime, getInitials } from './activity-panel';

export interface SwarmCommandFeedProps {
    epicId: string;
    issues: BeadIssue[];
    projectRoot: string;
}

export function SwarmCommandFeed({ epicId, issues, projectRoot }: SwarmCommandFeedProps) {
    const [activities, setActivities] = useState<ActivityEvent[]>([]);
    const { archetypes } = useArchetypes(projectRoot);

    // 1. Compute Contextual Tasks
    const contextBeads = useMemo(() => {
        return issues.filter(issue => {
            const parent = issue.dependencies.find(d => d.type === 'parent');
            return parent?.target === epicId;
        });
    }, [issues, epicId]);
    const contextBeadIds = useMemo(() => new Set(contextBeads.map(b => b.id)), [contextBeads]);

    // 2. Compute "Active Squad Roster" (Unique assignees working on in_progress tasks for THIS epic)
    const rosterEntries = useMemo(() => {
        const activeAssignees = new Set<string>();
        const entries: { assignee: string, currentTask: string, archetype?: any }[] = [];

        contextBeads.forEach(b => {
            if (b.status === 'in_progress' && b.assignee && !activeAssignees.has(b.assignee)) {
                activeAssignees.add(b.assignee);
                const assigneeStr = b.assignee.toLowerCase();
                const matchedArchetype = archetypes.find(a =>
                    assigneeStr.includes(a.id.toLowerCase()) ||
                    assigneeStr.includes(a.name.toLowerCase())
                );

                entries.push({
                    assignee: b.assignee,
                    currentTask: b.title,
                    archetype: matchedArchetype
                });
            }
        });
        return entries;
    }, [contextBeads, archetypes]);

    // 3. Subscribe to real-time activity, filtering ONLY for this epic's children
    useEffect(() => {
        const source = new EventSource(`/api/events?projectRoot=${encodeURIComponent(projectRoot)}`);

        const onActivity = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data) as ActivityEvent;
                // ONLY accept events for beads that belong to this Epic
                if (data?.beadId && contextBeadIds.has(data.beadId)) {
                    setActivities(prev => [data, ...prev].slice(0, 100)); // Keep a healthy buffer for terminal feel
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
    }, [projectRoot, contextBeadIds]);

    return (
        <div className="flex flex-col h-full bg-[#050a10] border-l border-[var(--ui-border-soft)]">
            {/* SQUAD ROSTER SECTION */}
            <div className="flex-shrink-0 p-4 bg-[#0a111a] shadow-[0_16px_24px_-24px_rgba(0,0,0,0.9)] z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ui-text-primary)]">Active Squad</h3>
                    </div>
                    <div className="text-[10px] font-mono text-[#7CB97A]/80 bg-[#7CB97A]/15 px-2 py-0.5 rounded border border-[#7CB97A]/30">
                        {rosterEntries.length} DEPLOYED
                    </div>
                </div>

                {rosterEntries.length === 0 ? (
                    <div className="text-xs text-[var(--ui-text-muted)] italic text-center py-4 border border-dashed border-white/5 rounded-lg">
                        No agents currently operating on this Epic.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {rosterEntries.map((agent, i) => (
                            <div key={i} className="flex gap-3 p-2.5 bg-[#0f1824] border border-[var(--ui-border-soft)] rounded-xl items-center shadow-lg transition-all hover:border-[var(--ui-accent-info)]/30">
                                <div className="relative">
                                    <div className="absolute -inset-0.5 rounded-full blur-[2px] opacity-70 bg-emerald-500/20" />
                                    <Avatar className="h-9 w-9 relative z-10 ring-2 ring-emerald-500/40">
                                        <AvatarFallback className="text-[10px] font-bold" style={{ backgroundColor: agent.archetype?.color ? `\${agent.archetype.color}20` : '#252525', color: agent.archetype?.color || '#fff' }}>
                                            {getInitials(agent.assignee)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="flex-col flex-1 min-w-0">
                                    <div className="text-sm font-bold text-[var(--ui-text-primary)] truncate">{agent.assignee}</div>
                                    <div className="text-[10px] text-[var(--ui-accent-warning)] truncate font-mono mt-0.5">
                                        &gt; {agent.currentTask}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* STREAMING LOG / TERMINAL SECTION */}
            <div className="flex-1 min-h-0 flex flex-col pt-2 bg-black/40">
                <div className="px-4 py-2 flex items-center justify-between border-b border-[var(--ui-border-soft)]/50">
                    <div className="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-500"><path d="M4 17l6-6-6-6M12 19h8"></path></svg>
                        <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">Live Command Feed</h3>
                    </div>
                    <div className="text-[9px] font-mono text-[var(--ui-text-muted)]/50 uppercase">Tailing Logs</div>
                </div>

                <ScrollArea className="flex-1 p-3">
                    {activities.length === 0 ? (
                        <div className="p-10 text-center opacity-30 flex flex-col items-center gap-2">
                            <div className="w-1 h-4 bg-cyan-500 animate-pulse" />
                            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500">Waiting for agent signals...</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {activities.map((activity) => {
                                const eventTone = getEventTone(activity.kind);
                                return (
                                    <div key={activity.id} className="group flex gap-3 p-1.5 rounded bg-transparent hover:bg-white/5 transition-colors items-start">
                                        <div className={cn("text-[9px] font-mono whitespace-nowrap pt-0.5", eventTone.idClass)}>
                                            [{formatRelativeTime(activity.timestamp)}]
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {activity.actor && (
                                                    <span className="text-[10px] font-bold text-white uppercase">{activity.actor.split(' ')[0]}</span>
                                                )}
                                                <span className={cn("text-[10px] font-mono", eventTone.labelClass)}>
                                                    {eventTone.label.toLowerCase()}
                                                </span>
                                                <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">
                                                    {activity.beadId}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-zinc-300 leading-snug break-words">
                                                {activity.beadTitle}
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
