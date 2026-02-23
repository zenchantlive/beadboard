"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Network, ShieldAlert } from 'lucide-react';
import type { SwarmTemplate, AgentArchetype } from '../../lib/types-swarm';

interface TemplateInspectorProps {
    template?: SwarmTemplate;
    archetypes: AgentArchetype[];
    onClose: () => void;
    onSave: (data: Partial<SwarmTemplate>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

export function TemplateInspector({ template, archetypes, onClose, onSave, onDelete }: TemplateInspectorProps) {
    const isNew = !template;

    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [team, setTeam] = useState<{ archetypeId: string; count: number }[]>(template?.team || []);
    const [protoFormula, setProtoFormula] = useState(template?.protoFormula || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setDescription(template.description);
            setTeam(template.team);
            setProtoFormula(template.protoFormula || '');
        }
    }, [template]);

    const updateTeamMember = (index: number, field: 'archetypeId' | 'count', value: string | number) => {
        const newTeam = [...team];
        if (field === 'count') {
            newTeam[index] = { ...newTeam[index], count: Math.max(1, Number(value)) };
        } else {
            newTeam[index] = { ...newTeam[index], archetypeId: value as string };
        }
        setTeam(newTeam);
    };

    const addTeamMember = () => {
        const firstAvailableArchetype = archetypes[0]?.id || '';
        setTeam([...team, { archetypeId: firstAvailableArchetype, count: 1 }]);
    };

    const removeTeamMember = (index: number) => {
        setTeam(team.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        if (team.length === 0) {
            setError('At least one team member is required');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave({
                id: template?.id,
                name: name.trim(),
                description: description.trim(),
                team,
                protoFormula: protoFormula.trim() || undefined,
                isBuiltIn: template?.isBuiltIn
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!template || !onDelete) return;

        if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;

        setIsDeleting(true);
        setError(null);

        try {
            await onDelete(template.id);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
            setIsDeleting(false);
        }
    };

    const totalAgents = team.reduce((acc, curr) => acc + curr.count, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="flex flex-col h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[#0f1824] shadow-2xl animate-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e]">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-lg">
                            {totalAgents}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-[var(--ui-text-primary)] leading-tight">
                                    {isNew ? 'New Template' : name || 'Edit Template'}
                                </h2>
                                {template?.isBuiltIn && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] uppercase font-bold text-[var(--ui-text-muted)] border border-white/10">Built-in</span>
                                )}
                            </div>
                            {!isNew && (
                                <p className="font-mono uppercase tracking-wider text-[10px] text-[var(--ui-text-muted)] mt-0.5">{template.id}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-[var(--ui-text-muted)] hover:bg-white/5 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mx-5 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                        {error}
                    </div>
                )}

                {template?.isBuiltIn && (
                    <div className="mx-5 mt-4 flex items-start gap-3 bg-[var(--ui-accent-warning)]/10 border border-[var(--ui-accent-warning)]/20 p-3 rounded-lg text-[var(--ui-accent-warning)]">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <span className="font-semibold">Built-in Template.</span> This is a core system template. You cannot delete it.
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    <div>
                        <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 block">Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Standard Application Swarm"
                            className="w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)] focus:ring-1 focus:ring-[var(--ui-accent-info)]"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 block">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Describe the purpose of this swarm template..."
                            className="w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)] resize-none"
                        />
                    </div>

                    <div className="border-t border-[var(--ui-border-soft)] pt-5">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider block">Team Composition *</label>
                            <button
                                type="button"
                                onClick={addTeamMember}
                                className="px-2 py-1 bg-[var(--ui-border-soft)] hover:bg-[var(--ui-border-hover)] text-white rounded transition-colors flex items-center gap-1 text-xs font-medium"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Member
                            </button>
                        </div>

                        <div className="space-y-3">
                            {team.map((member, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <select
                                        value={member.archetypeId}
                                        onChange={(e) => updateTeamMember(index, 'archetypeId', e.target.value)}
                                        className="flex-1 bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)]"
                                    >
                                        {archetypes.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        value={member.count}
                                        onChange={(e) => updateTeamMember(index, 'count', e.target.value)}
                                        className="w-20 bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeTeamMember(index)}
                                        className="p-2 text-[var(--ui-text-muted)] hover:text-rose-400 hover:bg-white/5 rounded-md transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {team.length === 0 && (
                                <div className="text-sm text-[var(--ui-text-muted)] italic py-4 text-center border border-dashed border-[var(--ui-border-soft)] rounded-md">
                                    No agents assigned. Add a member to build your team.
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                            <Network className="w-3 h-3" /> Proto-Formula (Optional)
                        </label>
                        <textarea
                            value={protoFormula}
                            onChange={(e) => setProtoFormula(e.target.value)}
                            rows={3}
                            placeholder="Optional default interaction rules or steps..."
                            className="w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm font-mono text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)] resize-y custom-scrollbar"
                        />
                    </div>

                </div>

                {/* Footer Controls */}
                <div className="border-t border-[var(--ui-border-soft)] bg-[#0A111A] p-4 flex items-center justify-between flex-shrink-0 rounded-b-xl">
                    <div>
                        {!isNew && !template?.isBuiltIn && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 rounded-md text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="w-4 h-4" />
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[var(--ui-text-muted)] hover:text-white transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2 bg-[var(--ui-accent-info)] hover:bg-[var(--ui-accent-info)]/90 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : (isNew ? 'Create Template' : 'Save Changes')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
