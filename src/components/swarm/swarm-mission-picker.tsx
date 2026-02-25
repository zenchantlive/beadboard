"use client";

import React from 'react';
import { useUrlState, type ViewType } from '../../hooks/use-url-state';
import type { BeadIssue } from '../../lib/types';
import { FolderGit2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function SwarmMissionPicker({ issues }: { issues: BeadIssue[] }) {
    const { view, setView, setSwarmId, swarmId } = useUrlState();

    const views: Array<{ id: ViewType; label: string }> = [
        { id: 'social', label: 'Social' },
        { id: 'graph', label: 'Graph' },
    ];

    // Filter issues to find epics (Missions)
    const missions = issues.filter(i => i.issue_type === 'epic' && i.status !== 'closed');

    return (
        <aside className="flex h-full flex-col bg-[var(--ui-bg-shell)] shadow-[inset_-1px_0_0_rgba(0,0,0,0.55),24px_0_40px_-34px_rgba(0,0,0,0.98)]" data-testid="left-panel-swarm">
            <div className="px-4 py-3 shadow-[0_14px_24px_-20px_rgba(0,0,0,0.92)]">
                <div className="mb-3 flex items-center gap-1 rounded-xl bg-[#101c2b] p-1 shadow-[0_12px_24px_-18px_rgba(0,0,0,0.88)]">
                    {views.map((item) => {
                        const active = view === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setView(item.id)}
                                className={cn(
                                    'flex-1 rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-info)]',
                                    active
                                        ? 'bg-[#183149] text-[var(--ui-text-primary)]'
                                        : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text-primary)]',
                                )}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-[var(--ui-accent-info)]" />
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ui-text-muted)]">Active Missions</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
                {missions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[var(--ui-text-muted)] bg-white/5 rounded-lg border border-dashed border-white/10">
                        No active missions (epics) found.
                    </div>
                ) : (
                    missions.map(m => {
                        const isSelected = swarmId === m.id;
                        const hasChildren = m.dependencies.filter(d => d.type === 'parent').length;
                        const progress = hasChildren > 0 ? 30 : 0;

                        return (
                            <button
                                key={m.id}
                            onClick={() => {
                                    setView('graph');
                                    setSwarmId(m.id);
                                }}
                                className={cn(
                                    'flex flex-col items-start p-3 min-h-[60px] rounded-xl transition-all w-full focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent-info)] text-left mb-2 shadow-[0_18px_28px_-22px_rgba(0,0,0,0.96)]',
                                    isSelected
                                        ? 'bg-[#183149] border border-[#2c4e73] ring-1 ring-[#7dd3fc]/20'
                                        : 'bg-[#111f2b] border border-transparent hover:bg-[#152736]'
                                )}
                            >
                                <div className="flex items-center justify-between w-full mb-1">
                                    <span className="font-semibold text-[13px] text-[var(--ui-text-primary)] line-clamp-1">{m.title}</span>
                                    <span className={cn(
                                        'text-[9px] uppercase font-bold px-1.5 py-0.5 rounded',
                                        m.status === 'in_progress' ? 'bg-[var(--ui-accent-warning)]/20 text-[var(--ui-accent-warning)]' : 'bg-white/10 text-[var(--ui-text-muted)]'
                                    )}>
                                        {m.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <span className="text-[10px] text-[var(--ui-text-muted)] font-mono mb-2">{m.id}</span>

                                <div className="w-full bg-[#0a111a] h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-[var(--ui-accent-info)] h-full rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            <footer className="border-t border-[var(--ui-border-soft)] px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[linear-gradient(135deg,#9cb6bf,#f1dcc6)]" />
                    <div>
                        <p className="text-sm font-semibold text-[var(--ui-text-primary)]">Swarm Commander</p>
                        <p className="text-xs text-[var(--ui-text-muted)]">Operations</p>
                    </div>
                </div>
            </footer>
        </aside>
    );
}
