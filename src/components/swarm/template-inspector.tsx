import React from 'react';
import { X, Save, Edit, Link, Network } from 'lucide-react';
import type { SwarmTemplate, AgentArchetype } from '../../lib/types-swarm';

interface TemplateInspectorProps {
    template: SwarmTemplate;
    archetypes: AgentArchetype[];
    onClose: () => void;
}

export function TemplateInspector({ template, archetypes, onClose }: TemplateInspectorProps) {
    if (!template) return null;

    const totalAgents = template.team.reduce((acc, curr) => acc + curr.count, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="flex flex-col h-[75vh] w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[#0f1824] shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e]">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-lg">
                            {totalAgents}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-[var(--ui-text-primary)] leading-tight">{template.name}</h2>
                                {template.isBuiltIn && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] uppercase font-bold text-[var(--ui-text-muted)] border border-white/10">Built-in</span>
                                )}
                            </div>
                            <p className="font-mono uppercase tracking-wider text-[10px] text-[var(--ui-text-muted)] mt-0.5">{template.id}</p>
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

                    {/* Metadata Section */}
                    <div>
                        <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 block">Purpose / Description</label>
                        <textarea
                            defaultValue={template.description}
                            readOnly
                            rows={2}
                            className="w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)] focus:ring-1 focus:ring-[var(--ui-accent-info)] resize-none"
                        />
                    </div>

                    {/* Team Composition Builder */}
                    <div className="border-t border-[var(--ui-border-soft)] pt-5">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider flex items-center gap-2">
                                <Network className="w-4 h-4 text-emerald-500" />
                                Roster Composition
                            </label>
                            <button className="text-[11px] font-semibold text-[var(--ui-accent-info)] hover:text-white bg-[var(--ui-accent-info)]/10 px-2 py-1 rounded transition-colors disabled:opacity-50">
                                + Add Member
                            </button>
                        </div>

                        <div className="space-y-2">
                            {template.team.map((member, idx) => {
                                const arch = archetypes.find(a => a.id === member.archetypeId);
                                return (
                                    <div key={idx} className="flex items-center gap-3 bg-[#111f2b] border border-[var(--ui-border-soft)] p-3 rounded-lg">
                                        <div className="h-8 w-8 rounded text-sm flex items-center justify-center font-bold" style={{ backgroundColor: `${arch?.color || '#888'}20`, color: arch?.color || '#888' }}>
                                            {arch?.name.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm text-[var(--ui-text-primary)]">{arch?.name || member.archetypeId}</div>
                                            <div className="text-[11px] text-[var(--ui-text-muted)]">{arch?.description || 'Unknown Archetype'}</div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md p-1">
                                            <span className="text-xs font-mono text-[var(--ui-text-muted)] px-2">Count:</span>
                                            <input
                                                type="number"
                                                defaultValue={member.count}
                                                readOnly
                                                className="w-12 bg-transparent text-sm font-bold text-center text-[var(--ui-text-primary)] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Advanced: Proto-formula */}
                    <div className="border-t border-[var(--ui-border-soft)] pt-5">
                        <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Link className="w-4 h-4 text-amber-500" />
                            MOL Proto-Formula (Optional)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                defaultValue={template.protoFormula || ''}
                                placeholder="e.g. 'release' or 'bugfix'"
                                readOnly
                                className="flex-1 bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 font-mono text-sm text-amber-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
                            />
                            <div className="text-[11px] text-[var(--ui-text-muted)] max-w-[200px] leading-tight">
                                Specifies a Gastown Formula to execute (`bd mol pour`) when launching this swarm.
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Controls */}
                <div className="border-t border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-[var(--ui-text-primary)] hover:bg-white/5 rounded-md transition-colors"
                    >
                        Close
                    </button>
                    <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-[var(--ui-accent-info)] hover:bg-[var(--ui-accent-info)]/90 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        Save Template
                    </button>
                </div>
            </div>
        </div>
    );
}
