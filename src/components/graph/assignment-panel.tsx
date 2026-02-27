"use client";

import React, { useState, useMemo } from 'react';
import { Zap, Users, FileCode2, Loader2, UserPlus, Clock, AlertCircle, ChevronDown, ChevronRight, Blocks, Layers } from 'lucide-react';
import { ArchetypeInspector } from '../swarm/archetype-inspector';
import { TemplateInspector } from '../swarm/template-inspector';
import { ArchetypePicker } from '../swarm/archetype-picker';
import { TemplatePicker } from '../swarm/template-picker';
import { useArchetypes } from '../../hooks/use-archetypes';
import { useTemplates } from '../../hooks/use-templates';
import { useGraphAnalysis } from '../../hooks/use-graph-analysis';
import type { BeadIssue } from '../../lib/types';
import type { AgentArchetype, SwarmTemplate } from '../../lib/types-swarm';
import { getArchetypeDisplayChar } from '../../lib/utils';

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

function getTemplateId(issue: BeadIssue): string | null {
    if (issue.metadata?.templateId && typeof issue.metadata.templateId === 'string') {
        return issue.metadata.templateId;
    }
    return issue.templateId;
}

export function AssignmentPanel({ selectedIssue, projectRoot, issues, epicId }: AssignmentPanelProps) {
    const [inspectingArchetypeId, setInspectingArchetypeId] = useState<string | null>(null);
    const [inspectingTemplateId, setInspectingTemplateId] = useState<string | null>(null);
    const [showArchetypeList, setShowArchetypeList] = useState(false);
    const [showTemplateList, setShowTemplateList] = useState(false);
    const [selectedArchetypeForPrep, setSelectedArchetypeForPrep] = useState<string>('');
    const [isPrepping, setIsPrepping] = useState(false);
    const [prepSuccess, setPrepSuccess] = useState(false);
    const [quickAssignDropdown, setQuickAssignDropdown] = useState<string | null>(null);

    const [needsAgentCollapsed, setNeedsAgentCollapsed] = useState(false);
    const [preAssignedCollapsed, setPreAssignedCollapsed] = useState(false);
    const [squadRosterCollapsed, setSquadRosterCollapsed] = useState(false);

    const { archetypes, saveArchetype, deleteArchetype } = useArchetypes(projectRoot);
    const { templates, saveTemplate, deleteTemplate } = useTemplates(projectRoot);
    const { actionableNodeIds } = useGraphAnalysis(issues, projectRoot, null);

    const selectedEpic = useMemo(() => {
        if (!epicId) return null;
        return issues.find(issue => issue.id === epicId && issue.issue_type === 'epic') || null;
    }, [issues, epicId]);

    const epicTemplate = useMemo(() => {
        const templateId = selectedEpic ? getTemplateId(selectedEpic) : null;
        if (!templateId) return null;
        return templates.find(t => t.id === templateId) || null;
    }, [templates, selectedEpic]);

    const needsAgentTasks = useMemo(() => {
        return issues.filter(issue => {
            if (issue.status === 'closed') return false;
            if (!actionableNodeIds.has(issue.id)) return false;
            if (hasAgentLabel(issue.labels)) return false;
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

    const handleApplyTemplateToEpic = async (templateId: string, targetEpicId: string) => {
        try {
            const res = await fetch('/api/beads/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectRoot,
                    id: targetEpicId,
                    metadata: { templateId }
                })
            });

            if (!res.ok) {
                throw new Error('Failed to apply template');
            }

            console.log('Template applied successfully:', { templateId, epicId: targetEpicId });
        } catch (error) {
            console.error('Failed to apply template:', error);
        }
    };

    const handleRemoveTemplateFromEpic = async (targetEpicId: string) => {
        try {
            const res = await fetch('/api/beads/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectRoot,
                    id: targetEpicId,
                    metadata: { templateId: null }
                })
            });

            if (!res.ok) {
                throw new Error('Failed to remove template');
            }

            console.log('Template removed successfully');
        } catch (error) {
            console.error('Failed to remove template:', error);
        }
    };

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

    const cloneTemplate = async (template: SwarmTemplate) => {
        await saveTemplate({
            name: `${template.name} (Copy)`,
            description: template.description,
            team: template.team,
            protoFormula: template.protoFormula,
            color: template.color,
            icon: template.icon,
            isBuiltIn: false
        });
    };

    const getArchetypeCountInTeam = (template: SwarmTemplate, archetypeId: string): number => {
        return template.team.filter(member => member.archetypeId === archetypeId).length;
    };

    const renderTaskItem = (issue: BeadIssue, showAssignButton: boolean = false, archetypeBadges: AgentArchetype[] = []) => (
        <div key={issue.id} className="flex items-center gap-2 p-2 bg-[var(--surface-input)] rounded-md border border-[var(--border-subtle)]">
            <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-[var(--text-tertiary)]">{issue.id}</div>
                <div className="text-xs text-[var(--text-primary)] truncate">{truncateTitle(issue.title)}</div>
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
                        className="h-6 w-6 flex items-center justify-center rounded bg-[var(--accent-info)]/20 hover:bg-[var(--accent-info)]/30 text-[var(--accent-info)] transition-colors"
                    >
                        <UserPlus className="w-3 h-3" />
                    </button>
                    {quickAssignDropdown === issue.id && (
                        <div className="absolute right-0 top-full mt-1 z-10 bg-[var(--surface-tertiary)] border border-[var(--border-subtle)] rounded-md shadow-lg py-1 min-w-[120px]">
                            {archetypes.map((a: AgentArchetype) => (
                                <button
                                    key={a.id}
                                    onClick={() => handleQuickAssign(issue.id, a.id)}
                                    className="w-full px-3 py-1.5 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
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
                    onClick={() => setShowArchetypeList(!showArchetypeList)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium text-[var(--text-primary)] transition-colors ${showArchetypeList ? 'bg-[var(--surface-active)] border-[var(--accent-info)]' : 'bg-[var(--surface-tertiary)] hover:bg-[var(--surface-hover)] border-[var(--border-subtle)]'}`}
                >
                    <Blocks className="w-4 h-4 text-[var(--accent-info)]" />
                    Archetypes
                </button>
                <button
                    onClick={() => setShowTemplateList(!showTemplateList)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium text-[var(--text-primary)] transition-colors ${showTemplateList ? 'bg-[var(--surface-active)] border-[var(--accent-warning)]' : 'bg-[var(--surface-tertiary)] hover:bg-[var(--surface-hover)] border-[var(--border-subtle)]'}`}
                >
                    <FileCode2 className="w-4 h-4 text-amber-500" />
                    Templates
                </button>
            </div>

            <ArchetypePicker
                archetypes={archetypes}
                isOpen={showArchetypeList}
                onClose={() => setShowArchetypeList(false)}
                onSelect={(archetype) => {
                    setSelectedArchetypeForPrep(archetype.id);
                    setShowArchetypeList(false);
                }}
                onEdit={(archetypeId) => {
                    setInspectingArchetypeId(archetypeId);
                    setShowArchetypeList(false);
                }}
                onCreateNew={() => {
                    setInspectingArchetypeId('');
                    setShowArchetypeList(false);
                }}
            />

            <TemplatePicker
                templates={templates}
                isOpen={showTemplateList}
                onClose={() => setShowTemplateList(false)}
                onSelect={(template) => {
                    if (selectedEpic) {
                        handleApplyTemplateToEpic(template.id, selectedEpic.id);
                    }
                    setShowTemplateList(false);
                }}
                onEdit={(templateId) => {
                    setInspectingTemplateId(templateId);
                    setShowTemplateList(false);
                }}
                onCreateNew={() => {
                    setInspectingTemplateId('');
                    setShowTemplateList(false);
                }}
            />

            {selectedEpic && (
                <div className="bg-[var(--surface-tertiary)] rounded-xl border border-purple-500/30 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-tertiary)] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <h3 className="font-semibold text-sm text-[var(--text-primary)]">Epic Template</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        <div>
                            <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{selectedEpic.id}</div>
                            <div className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{selectedEpic.title}</div>
                        </div>

                        {epicTemplate ? (
                            <div className="space-y-3">
                                <div className="bg-[var(--surface-input)] rounded-md p-3 border border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div
                                            className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold"
                                            style={{
                                                backgroundColor: epicTemplate.color ? `${epicTemplate.color}20` : '#88888820',
                                                color: epicTemplate.color || '#888888'
                                            }}
                                        >
                                            {epicTemplate.icon || 'T'}
                                        </div>
                                        <div className="font-semibold text-sm text-[var(--text-primary)]">{epicTemplate.name}</div>
                                    </div>
                                    {epicTemplate.description && (
                                        <div className="text-xs text-[var(--text-tertiary)] mb-3">{epicTemplate.description}</div>
                                    )}
                                    <div>
                                        <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Team Roster</div>
                                        <div className="space-y-1">
                                            {Array.from(new Set(epicTemplate.team.map(m => m.archetypeId))).map(archetypeId => {
                                                const archetype = archetypes.find((a: AgentArchetype) => a.id === archetypeId);
                                                const count = getArchetypeCountInTeam(epicTemplate, archetypeId);
                                                if (!archetype) return null;
                                                return (
                                                    <div key={archetypeId} className="flex items-center gap-2 text-xs">
                                                        <div
                                                            className="h-4 w-4 rounded flex items-center justify-center text-[10px] font-bold"
                                                            style={{
                                                                backgroundColor: `${archetype.color}20`,
                                                                color: archetype.color
                                                            }}
                                                        >
                                                            {getArchetypeDisplayChar(archetype)}
                                                        </div>
                                                        <span className="text-[var(--text-primary)]">{archetype.name}</span>
                                                        <span className="text-[var(--text-tertiary)] ml-auto">x{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowTemplateList(true)}
                                        className="flex-1 py-1.5 text-xs font-medium text-[var(--text-tertiary)] bg-[var(--surface-input)] border border-[var(--border-subtle)] rounded-md hover:bg-[var(--surface-hover)] transition-colors"
                                    >
                                        Change Template
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (selectedEpic) {
                                                handleRemoveTemplateFromEpic(selectedEpic.id);
                                            }
                                        }}
                                        className="py-1.5 px-3 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="text-xs text-[var(--text-tertiary)] text-center py-3">
                                    No template assigned
                                </div>
                                <button
                                    onClick={() => setShowTemplateList(true)}
                                    className="w-full py-2 text-sm font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-md hover:bg-purple-500/20 transition-colors"
                                >
                                    Assign Template
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedIssue && selectedIssue.issue_type !== 'epic' && (
                <div className="bg-[var(--surface-tertiary)] rounded-xl border border-[var(--accent-info)]/30 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-tertiary)] flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[var(--accent-info)]" />
                        <h3 className="font-semibold text-sm text-[var(--text-primary)]">Task Assignment</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{selectedIssue.id}</div>
                            <div className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{selectedIssue.title}</div>
                            <div className="text-xs text-[var(--text-tertiary)] mt-1">Status: <span className="font-semibold uppercase">{selectedIssue.status}</span></div>
                        </div>

                        {(selectedIssue.status === 'open' || selectedIssue.status === 'blocked') ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1.5 block">Assign Agent Archetype</label>
                                    <select
                                        value={selectedArchetypeForPrep}
                                        onChange={(e) => setSelectedArchetypeForPrep(e.target.value)}
                                        className="w-full bg-[var(--surface-input)] border border-[var(--border-subtle)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-info)]"
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
                                    className={`w-full py-2 text-[var(--text-inverse)] text-sm font-bold rounded-md disabled:opacity-50 transition-colors flex items-center justify-center ${prepSuccess ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-info)] hover:bg-[var(--accent-info)]/90'}`}
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

            <div className="bg-[var(--surface-tertiary)] rounded-xl border border-[var(--border-subtle)] flex flex-col overflow-hidden">
                <button
                    onClick={() => setNeedsAgentCollapsed(!needsAgentCollapsed)}
                    className="w-full px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-tertiary)] flex items-center gap-2 hover:bg-[var(--surface-hover)] transition-colors"
                >
                    {needsAgentCollapsed ? <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">Needs Agent</h3>
                    <span className="ml-auto text-xs text-[var(--text-tertiary)]">{needsAgentTasks.length}</span>
                </button>
                {!needsAgentCollapsed && (
                    <div className="max-h-40 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {needsAgentTasks.length === 0 ? (
                            <div className="text-center text-[var(--text-tertiary)] text-xs py-2">
                                All actionable tasks have agents assigned
                            </div>
                        ) : (
                            needsAgentTasks.map(issue => renderTaskItem(issue, true))
                        )}
                    </div>
                )}
            </div>

            <div className="bg-[var(--surface-tertiary)] rounded-xl border border-[var(--border-subtle)] flex flex-col overflow-hidden">
                <button
                    onClick={() => setPreAssignedCollapsed(!preAssignedCollapsed)}
                    className="w-full px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-tertiary)] flex items-center gap-2 hover:bg-[var(--surface-hover)] transition-colors"
                >
                    {preAssignedCollapsed ? <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">Pre-assigned</h3>
                    <span className="ml-auto text-xs text-[var(--text-tertiary)]">{preAssignedTasks.length}</span>
                </button>
                {!preAssignedCollapsed && (
                    <div className="max-h-40 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {preAssignedTasks.length === 0 ? (
                            <div className="text-center text-[var(--text-tertiary)] text-xs py-2">
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
                )}
            </div>

            <div className="flex-1 bg-[var(--surface-tertiary)] rounded-xl border border-[var(--border-subtle)] flex flex-col overflow-hidden min-h-0">
                <button
                    onClick={() => setSquadRosterCollapsed(!squadRosterCollapsed)}
                    className="w-full px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-tertiary)] flex items-center gap-2 hover:bg-[var(--surface-hover)] transition-colors"
                >
                    {squadRosterCollapsed ? <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
                    <Users className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">Squad Roster</h3>
                    <span className="ml-auto text-xs text-[var(--text-tertiary)]">{activeRoster.length} active</span>
                </button>
                {!squadRosterCollapsed && (
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {activeRoster.length === 0 ? (
                            <div className="text-center text-[var(--text-tertiary)] text-xs py-4">
                                No active agents
                            </div>
                        ) : (
                            activeRoster.map(({ issue, archetype }) => (
                                <div key={issue.id} className="flex items-center gap-2 p-2 bg-[var(--surface-input)] rounded-md border border-[var(--border-subtle)]">
                                    <div
                                        className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold"
                                        style={{
                                            backgroundColor: archetype ? `${archetype.color}20` : '#88888820',
                                            color: archetype?.color || '#888888'
                                        }}
                                    >
                                        {archetype ? getArchetypeDisplayChar(archetype) : '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-[var(--text-primary)] truncate">{issue.assignee}</div>
                                        <div className="text-[10px] text-[var(--text-tertiary)] truncate">{issue.id}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
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
                    onClone={cloneTemplate}
                />
            )}
        </div>
    );
}
