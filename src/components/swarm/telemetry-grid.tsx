"use client";

import React, { useState } from 'react';

import { Loader2, AlertCircle, Bot, Zap } from 'lucide-react';
import type { BeadIssue } from '../../lib/types';
import type { AgentArchetype } from '../../lib/types-swarm';

import { WorkflowGraph } from '../shared/workflow-graph';

interface TelemetryGridProps {
    epicId: string;
    issues: BeadIssue[];
    archetypes: AgentArchetype[];
}

export function TelemetryGrid({ epicId, issues, archetypes }: TelemetryGridProps) {
    const [selectedBeadId, setSelectedBeadId] = useState<string | null>(null);
    const [isPrepping, setIsPrepping] = useState(false);
    const [prepSuccess, setPrepSuccess] = useState(false);
    const [selectedArchetypeForPrep, setSelectedArchetypeForPrep] = useState<string>('');

    // 1. Filter beads for this epic
    const beads = issues.filter(issue => {
        if (issue.issue_type === 'epic') return false; // don't include epic itself in DAG
        const parent = issue.dependencies.find(d => d.type === 'parent');
        return parent?.target === epicId;
    });

    // 2. Compute "Attention Feed" (Blocked beads)
    const blockedBeads = beads.filter(b => b.status === 'blocked');

    // 3. Compute "Active Roster" (Unique assignees working on in_progress beads)
    const activeAssignees = new Set<string>();
    const rosterEntries: { assignee: string, currentTask: string, archetype?: AgentArchetype }[] = [];

    beads.forEach(b => {
        if (b.status === 'in_progress' && b.assignee && !activeAssignees.has(b.assignee)) {
            activeAssignees.add(b.assignee);

            const assigneeStr = b.assignee.toLowerCase();
            const matchedArchetype = archetypes.find(a =>
                assigneeStr.includes(a.id.toLowerCase()) ||
                assigneeStr.includes(a.name.toLowerCase())
            );

            rosterEntries.push({
                assignee: b.assignee,
                currentTask: b.title,
                archetype: matchedArchetype
            });
        }
    });

    const selectedBead = selectedBeadId ? beads.find(b => b.id === selectedBeadId) : null;

    const handlePrepTask = async () => {
        if (!selectedBead || !selectedArchetypeForPrep) return;
        setIsPrepping(true);
        setPrepSuccess(false);
        try {
            const res = await fetch('/api/swarm/prep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    beadId: selectedBead.id,
                    archetypeId: selectedArchetypeForPrep
                })
            });
            if (!res.ok) throw new Error('Prep failed');
            setPrepSuccess(true);
            setTimeout(() => setPrepSuccess(false), 3000);

            // Note: The shell's useIssues typically polls or relies on SWR to update. 
            // In a real app we'd call mutate() here.
        } catch (e) {
            console.error(e);
        } finally {
            setIsPrepping(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-full animate-in fade-in duration-500">
            {/* Left/Top: Specialized DAG */}
            <div className="flex-[2] min-h-[400px] lg:min-h-0 bg-[#0f1824]/50 rounded-xl border border-[var(--ui-border-soft)] shadow-inner relative overflow-hidden flex flex-col">
                <div className="absolute top-3 left-3 z-10 px-3 py-1.5 bg-background/80 backdrop-blur rounded-md border border-[var(--ui-border-soft)] flex items-center gap-2 shadow-sm pointer-events-none">
                    <Bot className="w-4 h-4 text-[var(--ui-accent-info)]" />
                    <span className="text-xs font-semibold tracking-wide uppercase text-[var(--ui-text-primary)]">Agent Flow</span>
                </div>
                <div className="flex-1 w-full h-full">
                    <WorkflowGraph
                        beads={beads}
                        archetypes={archetypes}
                        selectedId={selectedBeadId || undefined}
                        onSelect={setSelectedBeadId}
                        hideClosed={false}
                    />
                </div>
            </div>

            {/* Right/Bottom: Feeds */}
            <div className="flex-1 flex flex-col gap-4 min-w-[300px]">

                {/* Task Assignment Panel (Shows if a node is selected) */}
                {selectedBead && (
                    <div className="flex-none bg-[#111f2b] rounded-xl border border-[var(--ui-accent-info)]/30 flex flex-col overflow-hidden shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)] ring-1 ring-[var(--ui-accent-info)]/10">
                        <div className="px-4 py-3 border-b border-[var(--ui-border-soft)] bg-[#14202e] flex items-center gap-2">
                            <Zap className="w-4 h-4 text-[var(--ui-accent-info)]" />
                            <h3 className="font-semibold text-sm text-[var(--ui-text-primary)]">Task Assignment</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <div className="text-[10px] font-mono text-[var(--ui-text-muted)] uppercase tracking-wider mb-1">{selectedBead.id}</div>
                                <div className="text-sm font-semibold text-[var(--ui-text-primary)] leading-snug">{selectedBead.title}</div>
                                <div className="text-xs text-[var(--ui-text-muted)] mt-1">Status: <span className="font-semibold uppercase">{selectedBead.status}</span></div>
                            </div>

                            {(selectedBead.status === 'open' || selectedBead.status === 'blocked') ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--ui-text-muted)] mb-1.5 block">Assign Agent Archetype</label>
                                        <select
                                            value={selectedArchetypeForPrep}
                                            onChange={(e) => setSelectedArchetypeForPrep(e.target.value)}
                                            className="w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent-info)]"
                                        >
                                            <option value="" disabled>Select archetype...</option>
                                            {archetypes.map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handlePrepTask}
                                        disabled={!selectedArchetypeForPrep || isPrepping || prepSuccess}
                                        className={`w-full py-2 text-white text-sm font-bold rounded-md disabled:opacity-50 transition-colors flex items-center justify-center ${prepSuccess ? 'bg-emerald-500' : 'bg-[var(--ui-accent-info)] hover:bg-[var(--ui-accent-info)]/90'}`}
                                    >
                                        {isPrepping ? <Loader2 className="w-4 h-4 animate-spin" /> : prepSuccess ? 'Prep Successful!' : 'Prep Task for Swarm'}
                                    </button>
                                </div>
                            ) : (
                                <div className="text-xs text-amber-500 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                    Task is {selectedBead.status.replace('_', ' ')}. Only open or blocked tasks can be prepped.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Priority Attention */}
                <div className="flex-1 bg-[#111f2b] rounded-xl border border-[var(--ui-border-soft)] flex flex-col overflow-hidden shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]">
                    <div className="px-4 py-3 border-b border-[var(--ui-border-soft)] bg-[#14202e] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        <h3 className="font-semibold text-sm text-[var(--ui-text-primary)]">Priority Attention</h3>
                        <span className="ml-auto bg-rose-500/10 text-rose-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{blockedBeads.length} Blocked</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {blockedBeads.length === 0 ? (
                            <div className="text-center text-xs text-[var(--ui-text-muted)] mt-6">
                                All clear. No blocked tasks.
                            </div>
                        ) : (
                            blockedBeads.map(b => (
                                <div key={b.id} className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                                    <div className="text-xs font-mono text-rose-500 mb-1">{b.id}</div>
                                    <div className="text-sm text-[var(--ui-text-primary)] font-medium leading-tight">{b.title}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Active Roster */}
                <div className="flex-1 bg-[#111f2b] rounded-xl border border-[var(--ui-border-soft)] flex flex-col overflow-hidden shadow-[0_8px_16px_-12px_rgba(0,0,0,0.8)]">
                    <div className="px-4 py-3 border-b border-[var(--ui-border-soft)] bg-[#14202e] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="font-semibold text-sm text-[var(--ui-text-primary)]">Active Roster</h3>
                        <span className="ml-auto text-[10px] uppercase font-bold text-[var(--ui-text-muted)] tracking-wider">{rosterEntries.length} Deployed</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {rosterEntries.length === 0 ? (
                            <div className="text-center text-xs text-[var(--ui-text-muted)] mt-6">
                                No agents currently active.
                            </div>
                        ) : (
                            rosterEntries.map((r, i) => (
                                <div key={i} className="flex gap-3 p-3 bg-[#0a111a] border border-white/5 rounded-lg items-center">
                                    <div
                                        className="h-8 w-8 rounded flex-shrink-0 flex items-center justify-center font-bold text-sm border"
                                        style={{ backgroundColor: `${r.archetype?.color || '#888'}15`, color: r.archetype?.color || '#888', borderColor: `${r.archetype?.color || '#888'}30` }}
                                    >
                                        {r.assignee.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-bold text-[var(--ui-text-primary)] truncate">{r.assignee}</div>
                                        <div className="text-[10px] text-[var(--ui-text-muted)] truncate">{r.currentTask}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
