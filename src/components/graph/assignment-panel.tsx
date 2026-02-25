"use client";

import React, { useState, useMemo } from 'react';
import { Zap, Users, Blocks, FileCode2, Loader2, UserPlus, Clock, AlertCircle } from 'lucide-react';
import { ArchetypeInspector } from '../swarm/archetype-inspector';
import { TemplateInspector } from '../swarm/template-inspector';
import { useArchetypes } from '../../hooks/use-archetypes';
import { useTemplates } from '../../hooks/use-templates';
import { useGraphAnalysis } from '../../hooks/use-graph-analysis';
import type { BeadIssue } from '../../lib/types';
import type { AgentArchetype } from '../../lib/types-swarm';

export interface AssignmentPanelProps {
    selectedIssue: BeadIssue | null;
    projectRoot: string;
    issues: BeadIssue[];
    epicId?: string;
}

function hasAgentLabel(labels: string[]): boolean {
    return labels.some(label => label.startsWith('agent:'));
}

function getAgentLabels(labels: string[]): string[] {
    return labels.filter(label => label.startsWith('agent:'));
}

function extractArchetypeIdFromLabel(label: string): string {
    return label.replace('agent:', '');
}

function truncateTitle(title: string, maxLength: number = 30): string {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength - 3) + '...';
}

export function AssignmentPanel({ selectedIssue, projectRoot, issues, epicId }: AssignmentPanelProps) {
    const [inspectingArchetypeId, setInspectingArchetypeId] = useState<string | null>(null);
    const [inspectingTemplateId, setInspectingTemplateId] = useState<string | null>(null);
    const [selectedArchetypeForPrep, setSelectedArchetypeForPrep] = useState<string>('');
    const [isPrepping, setIsPrepping] = useState(false);
    const [prepSuccess, setPrepSuccess] = useState(false);
    const [quickAssignDropdown, setQuickAssignDropdown] = useState<string | null>(null);

    const { archetypes, saveArchetype, deleteArchetype } = useArchetypes(projectRoot);
    const { templates, saveTemplate, deleteTemplate } = useTemplates(projectRoot);
    const { actionableNodeIds } = useGraphAnalysis(issues, projectRoot, null);

    const needsAgentTasks = useMemo(() => {
        return issues.filter(issue => {
            if (issue.status === 'closed') return false;
            if (!actionableNodeIds.has(issue.id)) return false;
            if (hasAgentLabel(issue.labels)) return false;
            // Filter by selected epic
            if (epicId) {
                const hasParentEpic = issue.dependencies.some(
                    dep => dep.type === 'parent' && dep.target === epicId
                );
                if (!hasParentEpic) return false;
            }
            return true;
        });
    }, [issues, actionableNodeIds, epicId]);

    const preAssignedTasks = useMemo(() => {
        return issues.filter(issue => {
            if (issue.status === 'in_progress') return false;
            if (issue.status === 'closed') return false;
            if (!hasAgentLabel(issue.labels)) return false;
            // Filter by selected epic
            if (epicId) {
                const hasParentEpic = issue.dependencies.some(
                    dep => dep.type === 'parent' && dep.target === epicId
                );
                if (!hasParentEpic) return false;
            }
            return true;
        });
    }, [issues, epicId]);

    const activeRoster = useMemo(() => {
        const filtered = issues.filter(issue => {
            if (issue.status !== 'in_progress') return false;
            if (!issue.assignee) return false;
            if (epicId) {
                const hasParentEpic = issue.dependencies.some(
                    dep => dep.type === 'parent' && dep.target === epicId
                );
                if (!hasParentEpic) return false;
            }
            return true;
        });

        return filtered.map(issue => {
            const matchedArchetype = archetypes.find((a: AgentArchetype) =>
                issue.assignee?.toLowerCase().includes(a.id.toLowerCase()) ||
                issue.assignee?.toLowerCase().includes(a.name.toLowerCase())
            );
            return { issue, archetype: matchedArchetype };
        });
    }, [issues, archetypes, epicId]);

    const handlePrepTask = async () => {
        if (!selectedIssue || !selectedArchetypeForPrep) return;

        setIsPrepping(true);
        setPrepSuccess(false);

        try {
            const res = await fetch('/api/swarm/prep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    beadId: selectedIssue.id,
                    archetypeId: selectedArchetypeForPrep
                })
            });

            if (!res.ok) {
                throw new Error('Failed to prep task');
            }

            setPrepSuccess(true);
            setTimeout(() => setPrepSuccess(false), 2000);
        } catch (error) {
            console.error('Failed to prep task:', error);
        } finally {
            setIsPrepping(false);
        }
    };

    const handleQuickAssign = async (issueId: string, archetypeId: string) => {
        try {
            const res = await fetch('/api/swarm/prep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    beadId: issueId,
                    archetypeId: archetypeId
                })
            });

            if (!res.ok) {
                throw new Error('Failed to assign agent');
            }

            setQuickAssignDropdown(null);
        } catch (error) {
            console.error('Failed to assign agent:', error);
        }
    };

    const getArchetypeForAgentLabel = (label: string): AgentArchetype | undefined => {
        const archetypeId = extractArchetypeIdFromLabel(label);
        return archetypes.find((a: AgentArchetype) =>
            a.id.toLowerCase() === archetypeId.toLowerCase() ||
            a.name.toLowerCase() === archetypeId.toLowerCase()
        );
    };

    const renderTaskItem = (issue: BeadIssue, showAssignButton: boolean = false, archetypeBadges: AgentArchetype[] = []) => (
        <div key={issue.id} className="flex items-center gap-2 p-2 bg-[#0a111a] rounded-md border border-[var(--ui-border-soft)]">
            <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-[var(--ui-text-muted)]">{issue.id}</div>
                <div className="text-xs text-[var(--ui-text-primary)] truncate">{truncateTitle(issue.title)}</div>
            </div>
            {archetypeBadges.length > 0 && (
                <div className="flex gap-1">
                    {archetypeBadges.map(archetype => (
                        <div
                            key={archetype.id}
                            className="h-5 px-1.5 rounded text-[10px] font-bold flex items-center"
                            style={{
                                backgroundColor: `${archetype.color}20`,
                                color: archetype.color
                            }}
                        >
                            {archetype.name}
                        </div>
                    ))}
                </div>
            )}
            {showAssignButton && (
                <div className="relative">
                    <button
                        onClick={() => setQuickAssignDropdown(quickAssignDropdown === issue.id ? null : issue.id)}
                        className="h-6 w-6 flex items-center justify-center rounded bg-[var(--ui-accent-info)]/20 hover:bg-[var(--ui-accent-info)]/30 text-[var(--ui-accent-info)] transition-colors"
                    >
                        <UserPlus className="w-3 h-3" />
                    </button>
                    {quickAssignDropdown === issue.id && (
                        <div className="absolute right-0 top-full mt-1 z-10 bg-[#111f2b] border border-[var(--ui-border-soft)] rounded-md shadow-lg py-1 min-w-[120px]">
                            {archetypes.map((a: AgentArchetype) => (
                                <button
                                    key={a.id}
                                    onClick={() => handleQuickAssign(issue.id, a.id)}
                                    className="w-full px-3 py-1.5 text-left text-xs text-[var(--ui-text-primary)] hover:bg-[#1a2d3d] transition-colors"
                                >
                                    {a.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full gap-4 p-4 overflow-y-auto custom-scrollbar">
            <div className="flex gap-2">
                <button
                    onClick={() => setInspectingArchetypeId('')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#111f2b] hover:bg-[#1a2d3d] border border-[var(--ui-border-soft)] rounded-lg text-sm font-medium text-[var(--ui-text-primary)] transition-colors"
                >
                    <Blocks className="w-4 h-4 text-[var(--ui-accent-info)]" />
                    Archetypes
                </button>
                <button
                    onClick={() => setInspectingTemplateId('')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#111f2b] hover:bg-[#1a2d3d] border border-[var(--ui-border-soft)] rounded-lg text-sm font-medium text-[var(--ui-text-primary)] transition-colors"
                >
                    <FileCode2 className="w-4 h-4 text-amber-500" />
                    Templates
                </button>
            </div>

            {selectedIssue && (
                <div className="bg-[#111f2b] rounded-xl border border-[var(--ui-accent-info)]/30 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--ui-border-soft)] bg-[#14202e] flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[var(--ui-accent-info)]" />
                        <h3 className="font-semibold text-sm text-[var(--ui-text-primary)]">Task Assignment</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <div className="text-[10px] font-mono text-[var(--ui-text-muted)] uppercase tracking-wider mb-1">{selectedIssue.id}</div>
                            <div className="text-sm font-semibold text-[var(--ui-text-primary)] leading-snug">{selectedIssue.title}</div>
                            <div className="text-xs text-[var(--ui-text-muted)] mt-1">Status: <span className="font-semibold uppercase">{selectedIssue.status}</span></div>
                        </div>

                        {(selectedIssue.status === 'open' || selectedIssue.status === 'blocked') ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-[var(--ui-text-muted)] mb-1.5 block">Assign Agent Archetype</label>
                                    <select
                                        value={selectedArchetypeForPrep}
                                        onChange={(e) => setSelectedArchetypeForPrep(e.target.value)}
                                        className="w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent-info)]"
                                    >
                                        <option value="" disabled>Select archetype...</option>
                                        {archetypes.map((a: AgentArchetype) => (
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
                                Task is {selectedIssue.status.replace('_', ' ')}. Only open or blocked tasks can be prepped.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-[#111f2b] rounded-xl border border-[var(--ui-border-soft)] flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--ui-border-soft)] bg-[#14202e] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <h3 className="font-semibold text-sm text-[var(--ui-text-primary)]">Needs Agent</h3>
                    <span className="ml-auto text-xs text-[var(--ui-text-muted)]">{needsAgentTasks.length}</span>
                </div>
                <div className="max-h-40 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {needsAgentTasks.length === 0 ? (
                        <div className="text-center text-[var(--ui-text-muted)] text-xs py-2">
                            All actionable tasks have agents assigned
                        </div>
                    ) : (
                        needsAgentTasks.map(issue => renderTaskItem(issue, true))
                    )}
                </div>
            </div>

            <div className="bg-[#111f2b] rounded-xl border border-[var(--ui-border-soft)] flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--ui-border-soft)] bg-[#14202e] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-sm text-[var(--ui-text-primary)]">Pre-assigned</h3>
                    <span className="ml-auto text-xs text-[var(--ui-text-muted)]">{preAssignedTasks.length}</span>
                </div>
                <div className="max-h-40 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {preAssignedTasks.length === 0 ? (
                        <div className="text-center text-[var(--ui-text-muted)] text-xs py-2">
                            No pre-assigned tasks waiting
                        </div>
                    ) : (
                        preAssignedTasks.map(issue => {
                            const agentLabels = getAgentLabels(issue.labels);
                            const archetypeBadges = agentLabels
                                .map(label => getArchetypeForAgentLabel(label))
                                .filter((a): a is AgentArchetype => a !== undefined);
                            return renderTaskItem(issue, false, archetypeBadges);
                        })
                    )}
                </div>
            </div>

            <div className="flex-1 bg-[#111f2b] rounded-xl border border-[var(--ui-border-soft)] flex flex-col overflow-hidden min-h-0">
                <div className="px-4 py-3 border-b border-[var(--ui-border-soft)] bg-[#14202e] flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-semibold text-sm text-[var(--ui-text-primary)]">Squad Roster</h3>
                    <span className="ml-auto text-xs text-[var(--ui-text-muted)]">{activeRoster.length} active</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {activeRoster.length === 0 ? (
                        <div className="text-center text-[var(--ui-text-muted)] text-xs py-4">
                            No active agents
                        </div>
                    ) : (
                        activeRoster.map(({ issue, archetype }) => (
                            <div key={issue.id} className="flex items-center gap-2 p-2 bg-[#0a111a] rounded-md border border-[var(--ui-border-soft)]">
                                <div
                                    className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold"
                                    style={{
                                        backgroundColor: archetype ? `${archetype.color}20` : '#88888820',
                                        color: archetype?.color || '#888888'
                                    }}
                                >
                                    {archetype?.name.charAt(0) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-[var(--ui-text-primary)] truncate">{issue.assignee}</div>
                                    <div className="text-[10px] text-[var(--ui-text-muted)] truncate">{issue.id}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {inspectingArchetypeId !== null && (
                <ArchetypeInspector
                    archetype={archetypes.find((a: AgentArchetype) => a.id === inspectingArchetypeId)}
                    onClose={() => setInspectingArchetypeId(null)}
                    onSave={saveArchetype}
                    onDelete={deleteArchetype}
                />
            )}

            {inspectingTemplateId !== null && (
                <TemplateInspector
                    template={templates.find(t => t.id === inspectingTemplateId)}
                    archetypes={archetypes}
                    onClose={() => setInspectingTemplateId(null)}
                    onSave={saveTemplate}
                    onDelete={deleteTemplate}
                />
            )}
        </div>
    );
}
