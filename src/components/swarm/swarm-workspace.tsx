"use client";

import React, { useState } from 'react';
import { SwarmLiveDag } from './swarm-live-dag';
import { ConvoyStepper } from './convoy-stepper';
import { Network, Blocks, FileCode2, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export function SwarmWorkspace({ selectedMissionId }: { selectedMissionId?: string }) {
    const [activeTab, setActiveTab] = useState<'operations' | 'archetypes' | 'templates'>('operations');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'operations':
                return selectedMissionId
                    ? (
                        <div className="flex flex-col h-full gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ConvoyStepper activePhase="execution" />
                            <div className="flex-1 min-h-0 bg-[#0f1824]/50 rounded-xl border border-[var(--ui-border-soft)] p-2 shadow-inner">
                                <SwarmLiveDag epicId={selectedMissionId} />
                            </div>
                        </div>
                    )
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
                    <div className="p-6 bg-[#0f1824]/30 rounded-xl border border-[var(--ui-border-soft)] h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-xl font-bold text-[var(--ui-text-primary)] mb-2">Agent Archetypes</h3>
                        <p className="text-[var(--ui-text-muted)] text-sm mb-6">Manage the base roles and system prompts available to your swarms.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Placeholder Cards */}
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-[#111f2b] p-4 rounded-lg border border-[var(--ui-border-soft)] hover:border-[var(--ui-accent-info)]/50 transition-colors">
                                    <div className="h-10 w-10 rounded-lg bg-[var(--ui-accent-info)]/20 mb-3" />
                                    <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                                    <div className="h-3 w-3/4 bg-white/5 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'templates':
                return (
                    <div className="p-6 bg-[#0f1824]/30 rounded-xl border border-[var(--ui-border-soft)] h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-xl font-bold text-[var(--ui-text-primary)] mb-2">Swarm Templates</h3>
                        <p className="text-[var(--ui-text-muted)] text-sm mb-6">Define predefined teams and formulas for rapid mission deployment.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-[#111f2b] p-5 rounded-lg border border-[var(--ui-border-soft)] flex items-center gap-4 hover:border-amber-500/50 transition-colors">
                                    <div className="h-12 w-12 rounded-full bg-amber-500/20" />
                                    <div>
                                        <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                                        <div className="h-3 w-48 bg-white/5 rounded" />
                                    </div>
                                </div>
                            ))}
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
        </div>
    );
}
