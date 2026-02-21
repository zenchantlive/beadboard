import React from 'react';
import { X, Save, ShieldAlert } from 'lucide-react';
import type { AgentArchetype } from '../../lib/types-swarm';

interface ArchetypeInspectorProps {
    archetype: AgentArchetype;
    onClose: () => void;
}

export function ArchetypeInspector({ archetype, onClose }: ArchetypeInspectorProps) {
    if (!archetype) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="flex flex-col h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[#0f1824] shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e]">
                    <div className="flex items-center gap-3">
                        <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg border"
                            style={{ backgroundColor: `${archetype.color}15`, color: archetype.color, borderColor: `${archetype.color}30` }}
                        >
                            {archetype.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--ui-text-primary)] leading-tight">{archetype.name}</h2>
                            <p className="font-mono uppercase tracking-wider text-[10px] text-[var(--ui-text-muted)] mt-0.5">{archetype.id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-[var(--ui-text-muted)] hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

                    {/* ReadOnly Warning if builtin */}
                    {archetype.isBuiltIn && (
                        <div className="flex items-start gap-3 bg-[var(--ui-accent-warning)]/10 border border-[var(--ui-accent-warning)]/20 p-3 rounded-lg text-[var(--ui-accent-warning)]">
                            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <span className="font-semibold">Built-in Archetype.</span> This is a core system role. You cannot delete it, but you can override its system prompt.
                            </div>
                        </div>
                    )}

                    {/* Metadata Section */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 block">Description</label>
                            <input
                                type="text"
                                defaultValue={archetype.description}
                                readOnly
                                className="w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)] focus:ring-1 focus:ring-[var(--ui-accent-info)]"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 block">Capabilities</label>
                            <div className="flex flex-wrap gap-2">
                                {archetype.capabilities.map((cap, idx) => (
                                    <span key={idx} className="px-2 py-1 rounded-md bg-white/5 text-[11px] uppercase font-semibold text-[var(--ui-text-muted)] border border-white/10">
                                        {cap}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[var(--ui-border-soft)] pt-6">
                        <div className="flex flex-col h-[300px]">
                            <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                <span>System Prompt</span>
                                <span className="text-[10px] text-emerald-400 normal-case tracking-normal">Syntax: Markdown</span>
                            </label>
                            <textarea
                                defaultValue={archetype.systemPrompt}
                                readOnly
                                className="flex-1 w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md p-4 text-sm text-[var(--ui-text-primary)] font-mono resize-none focus:outline-none focus:border-[var(--ui-accent-info)] custom-scrollbar leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="border-t border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-[var(--ui-text-primary)] hover:bg-white/5 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-[var(--ui-accent-info)] hover:bg-[var(--ui-accent-info)]/90 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
