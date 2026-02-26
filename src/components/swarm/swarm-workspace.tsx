"use client";

import React, { useState } from 'react';
import { TelemetryGrid } from './telemetry-grid';
import { ConvoyStepper, type Phase } from './convoy-stepper';
import { Network, Blocks, FileCode2, Info } from 'lucide-react';
import { cn, getArchetypeDisplayChar, getTemplateDisplayChar, getTemplateColor } from '../../lib/utils';
import type { BeadIssue } from '../../lib/types';
import { useArchetypes } from '../../hooks/use-archetypes';
import { useTemplates } from '../../hooks/use-templates';
import { ArchetypeInspector } from './archetype-inspector';
import { TemplateInspector } from './template-inspector';

export function SwarmWorkspace({ selectedMissionId, issues = [], projectRoot }: { selectedMissionId?: string, issues?: BeadIssue[], projectRoot: string }) {
    const [activeTab, setActiveTab] = useState<'operations' | 'archetypes' | 'templates'>('operations');

    // Inspector State
    const [inspectingArchetypeId, setInspectingArchetypeId] = useState<string | null>(null);
    const [inspectingTemplateId, setInspectingTemplateId] = useState<string | null>(null);

    const { archetypes, isLoading: archetypesLoading, saveArchetype, deleteArchetype } = useArchetypes(projectRoot);
    const { templates, isLoading: templatesLoading, saveTemplate, deleteTemplate } = useTemplates(projectRoot);

    // Simulation State
    const [isSimulating, setIsSimulating] = useState(false);
    const [simPhase, setSimPhase] = useState<Phase>('planning');
    const [simBeads, setSimBeads] = useState<BeadIssue[]>([]);

    const handleSummon = () => {
        setIsSimulating(true);
        setSimPhase('planning');
        setSimBeads([]);

        // Mock Flow: Planning -> Graph Generation -> Deployment -> Execution
        setTimeout(() => {
            setSimPhase('deployment'); // Skipping Graph Generation for simplicity here

            // Generate some fake beads
            const mockBeads: BeadIssue[] = [
                {
                    id: 'b-mock-1',
                    title: 'Analyze DB Schema',
                    status: 'closed',
                    assignee: 'Alice (Architect)',
                    templateId: null,
                    owner: null,
                    description: null,
                    issue_type: 'task',
                    priority: 1,
                    labels: [],
                    dependencies: [{ type: 'parent', target: selectedMissionId || 'epic' }],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    closed_at: null, close_reason: null, closed_by_session: null, created_by: null, due_at: null, estimated_minutes: null, external_ref: null, metadata: {}
                },
                {
                    id: 'b-mock-2',
                    title: 'Implement API Routes',
                    status: 'in_progress',
                    assignee: 'Bob (Backend)',
                    templateId: null,
                    owner: null,
                    description: null,
                    issue_type: 'task',
                    priority: 1,
                    labels: [],
                    dependencies: [
                        { type: 'parent', target: selectedMissionId || 'epic' },
                        { type: 'blocks', target: 'b-mock-1' } // Bob waits for Alice
                    ],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    closed_at: null, close_reason: null, closed_by_session: null, created_by: null, due_at: null, estimated_minutes: null, external_ref: null, metadata: {}
                },
                {
                    id: 'b-mock-3',
                    title: 'Build UI Components',
                    status: 'blocked',
                    assignee: 'Charlie (Frontend)',
                    templateId: null,
                    owner: null,
                    description: null,
                    issue_type: 'task',
                    priority: 1,
                    labels: [],
                    dependencies: [
                        { type: 'parent', target: selectedMissionId || 'epic' },
                        { type: 'blocks', target: 'b-mock-2' } // Charlie waits for Bob
                    ],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    closed_at: null, close_reason: null, closed_by_session: null, created_by: null, due_at: null, estimated_minutes: null, external_ref: null, metadata: {}
                }
            ];

            setTimeout(() => {
                setSimBeads(mockBeads);
                setSimPhase('execution');
            }, 1000);

        }, 1500);
    };

    const displayBeads = isSimulating ? simBeads : issues;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'operations':
                return selectedMissionId
                    ? (() => {
                        const epic = issues.find(i => i.id === selectedMissionId);
                        let epicPhase: Phase = 'planning';
                        if (epic?.status === 'in_progress') epicPhase = 'execution';
                        if (epic?.status === 'closed' || epic?.status === 'tombstone') epicPhase = 'debrief';

                        return (
                            <div className="flex flex-col h-full gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between">
                                    <ConvoyStepper activePhase={isSimulating ? simPhase : epicPhase} />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsSimulating(false)}
                                            className="px-3 py-1.5 text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-md transition-colors"
                                        >
                                            Halt Swarm
                                        </button>
                                        <button
                                            onClick={handleSummon}
                                            disabled={isSimulating && simPhase !== 'debrief'}
                                            className="px-3 py-1.5 text-xs font-bold bg-[var(--ui-accent-info)] text-white hover:bg-[var(--ui-accent-info)]/90 shadow shadow-[var(--ui-accent-info)]/20 rounded-md transition-colors disabled:opacity-50"
                                        >
                                            Summon Polecats
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <TelemetryGrid epicId={selectedMissionId} issues={displayBeads} archetypes={archetypes} projectRoot={projectRoot} />
                                </div>
                            </div>
                        )
                    })()
                    : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in duration-700">
                            <div className="p-4 bg-[var(--ui-accent-info)]/10 rounded-full">
                                <Info className="w-8 h-8 text-[var(--ui-accent-info)]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--ui-text-primary)]">No Mission Selected</h3>
                                <p className="text-sm text-[var(--ui-text-muted)] max-w-sm mx-auto mt-1">
                                    Select an active mission from the left panel to view live DAG telemetry and convoy operations.
                                </p>
                            </div>
                        </div>
                    );
            case 'archetypes':
                return (
                    <div className="p-6 bg-[#0f1824]/30 rounded-xl border border-[var(--ui-border-soft)] h-full animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-[var(--ui-text-primary)]">Agent Archetypes</h3>
                            <button
                                onClick={() => setInspectingArchetypeId('')}
                                className="px-3 py-1.5 bg-[var(--ui-accent-info)] hover:bg-[var(--ui-accent-info)]/90 text-white rounded-md text-xs font-semibold shadow-md transition-colors"
                            >
                                + Create Archetype
                            </button>
                        </div>
                        <p className="text-[var(--ui-text-muted)] text-sm mb-6">Manage the base roles and system prompts available to your swarms.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {archetypesLoading ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="bg-[#111f2b] p-4 rounded-lg border border-[var(--ui-border-soft)] animate-pulse">
                                        <div className="h-10 w-10 rounded-lg bg-[var(--ui-accent-info)]/20 mb-3" />
                                        <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                                        <div className="h-3 w-3/4 bg-white/5 rounded" />
                                    </div>
                                ))
                            ) : archetypes.length === 0 ? (
                                <div className="col-span-full text-center text-[var(--ui-text-muted)] text-sm py-8 border border-dashed border-white/10 rounded-lg">
                                    No archetypes found. Create one in the `.beads/archetypes/` directory.
                                </div>
                            ) : (
                                archetypes.map(arc => (
                                    <button
                                        key={arc.id}
                                        onClick={() => setInspectingArchetypeId(arc.id)}
                                        className="bg-[#111f2b] p-4 rounded-xl border border-[var(--ui-border-soft)] hover:border-[var(--ui-accent-info)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent-info)] transition-colors shadow-[0_18px_28px_-22px_rgba(0,0,0,0.96)] flex flex-col text-left w-full h-full"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-lg border" style={{ backgroundColor: `${arc.color}15`, color: arc.color, borderColor: `${arc.color}30` }}>
                                                {getArchetypeDisplayChar(arc)}
                                            </div>
                                            <div className="truncate">
                                                <div className="font-semibold text-[15px] text-[var(--ui-text-primary)] truncate">{arc.name}</div>
                                                <div className="text-[10px] text-[var(--ui-text-muted)] font-mono uppercase tracking-wider truncate">{arc.id}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-[var(--ui-text-muted)] line-clamp-2 mb-4 flex-1">
                                            {arc.description}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-auto">
                                            {arc.capabilities.slice(0, 3).map((cap, idx) => (
                                                <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] uppercase font-semibold text-[var(--ui-text-muted)] border border-white/10">
                                                    {cap}
                                                </span>
                                            ))}
                                            {arc.capabilities.length > 3 && (
                                                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] uppercase font-semibold text-[var(--ui-text-muted)] border border-white/10">
                                                    +{arc.capabilities.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                );
            case 'templates':
                return (
                    <div className="p-6 bg-[#0f1824]/30 rounded-xl border border-[var(--ui-border-soft)] h-full animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-[var(--ui-text-primary)]">Swarm Templates</h3>
                            <button
                                onClick={() => setInspectingTemplateId('')}
                                className="px-3 py-1.5 bg-[var(--ui-accent-info)] hover:bg-[var(--ui-accent-info)]/90 text-white rounded-md text-xs font-semibold shadow-md transition-colors"
                            >
                                + Create Template
                            </button>
                        </div>
                        <p className="text-[var(--ui-text-muted)] text-sm mb-6">Define predefined teams and formulas for rapid mission deployment.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templatesLoading ? (
                                [1, 2].map(i => (
                                    <div key={i} className="bg-[#111f2b] p-5 rounded-xl border border-[var(--ui-border-soft)] flex items-center gap-4 animate-pulse">
                                        <div className="h-12 w-12 rounded-full bg-amber-500/20" />
                                        <div className="flex-1">
                                            <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                                            <div className="h-3 w-48 bg-white/5 rounded" />
                                        </div>
                                    </div>
                                ))
                            ) : templates.length === 0 ? (
                                <div className="col-span-full text-center text-[var(--ui-text-muted)] text-sm py-8 border border-dashed border-white/10 rounded-lg">
                                    No templates found. Create one in the `.beads/templates/` directory.
                                </div>
                            ) : (
                                templates.map(tpl => {
                                    const tplColor = getTemplateColor(tpl);
                                    return (
                                    <button
                                        key={tpl.id}
                                        onClick={() => setInspectingTemplateId(tpl.id)}
                                        className="bg-[#111f2b] p-5 rounded-xl border flex flex-col gap-4 hover:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-colors shadow-[0_18px_28px_-22px_rgba(0,0,0,0.96)] text-left w-full"
                                        style={{ borderColor: `${tplColor}30` }}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3 w-full pr-2">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold border"
                                                    style={{ backgroundColor: `${tplColor}15`, color: tplColor, borderColor: `${tplColor}30` }}
                                                >
                                                    {getTemplateDisplayChar(tpl)}
                                                </div>
                                                <div className="truncate">
                                                    <div className="font-semibold text-[15px] text-[var(--ui-text-primary)] truncate">{tpl.name}</div>
                                                    <div className="text-[10px] text-[var(--ui-text-muted)] font-mono uppercase tracking-wider truncate">{tpl.id}</div>
                                                </div>
                                            </div>
                                            {tpl.isBuiltIn && (
                                                <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-white/5 text-[9px] uppercase font-bold text-[var(--ui-text-muted)] border border-white/10">Default</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-[var(--ui-text-muted)] line-clamp-2">
                                            {tpl.description}
                                        </div>
                                        <div className="mt-auto pt-3 border-t border-[var(--ui-border-soft)] w-full">
                                            <div className="text-[10px] uppercase font-bold text-[var(--ui-text-muted)] tracking-wider mb-2">Team Composition</div>
                                            <div className="flex flex-wrap gap-2">
                                                {tpl.team.map((member, idx) => {
                                                    const arch = archetypes.find(a => a.id === member.archetypeId);
                                                    return (
                                                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0f1824] border border-[var(--ui-border-soft)]">
                                                            <div className="h-4 w-4 rounded text-[9px] flex items-center justify-center font-bold" style={{ backgroundColor: `${arch?.color || '#888'}20`, color: arch?.color || '#888' }}>
                                                                {arch ? getArchetypeDisplayChar(arch) : '?'}
                                                            </div>
                                                            <span className="text-[11px] text-[var(--ui-text-primary)] font-medium">{member.count}x {arch?.name || member.archetypeId}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[radial-gradient(ellipse_at_top,#142336_0%,#090d14_100%)]">
            <header className="px-6 py-5 border-b border-[var(--ui-border-soft)] bg-black/20 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
                            <Network className="w-6 h-6 text-[var(--ui-accent-info)]" />
                            Swarm Command
                        </h1>
                        <p className="text-sm text-[var(--ui-text-muted)] mt-1">Orchestrate agents, define archetypes, and monitor live DAG telemetry.</p>
                    </div>

                    {/* Premium Custom Tabs */}
                    <div className="flex bg-[#0f1824] p-1 rounded-lg border border-[var(--ui-border-soft)] shadow-inner">
                        {[
                            { id: 'operations', label: 'Operations', icon: Network },
                            { id: 'archetypes', label: 'Archetypes', icon: Blocks },
                            { id: 'templates', label: 'Templates', icon: FileCode2 }
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium",
                                        isActive
                                            ? "bg-[#183149] text-[var(--ui-text-primary)] shadow-sm ring-1 ring-[#7dd3fc]/20"
                                            : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-primary)] hover:bg-white/5"
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4", isActive ? "text-[var(--ui-accent-info)]" : "")} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-auto p-6 custom-scrollbar">
                <div className="h-full max-w-7xl mx-auto">
                    {renderTabContent()}
                </div>
            </main>

            {/* Popups */}
            {inspectingArchetypeId !== null && (
                <ArchetypeInspector
                    archetype={archetypes.find(a => a.id === inspectingArchetypeId)}
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
