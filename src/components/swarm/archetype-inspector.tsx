"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, ShieldAlert, Trash2, Plus } from 'lucide-react';
import type { AgentArchetype } from '../../lib/types-swarm';

interface ArchetypeInspectorProps {
    archetype?: AgentArchetype;
    onClose: () => void;
    onSave: (data: Partial<AgentArchetype>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

export function ArchetypeInspector({ archetype, onClose, onSave, onDelete }: ArchetypeInspectorProps) {
    const isNew = !archetype;

    const [name, setName] = useState(archetype?.name || '');
    const [description, setDescription] = useState(archetype?.description || '');
    const [systemPrompt, setSystemPrompt] = useState(archetype?.systemPrompt || '');
    const [capabilities, setCapabilities] = useState<string[]>(archetype?.capabilities || []);
    const [color, setColor] = useState(archetype?.color || '#3b82f6');
    const [newCapability, setNewCapability] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (archetype) {
            setName(archetype.name);
            setDescription(archetype.description);
            setSystemPrompt(archetype.systemPrompt);
            setCapabilities(archetype.capabilities);
            setColor(archetype.color);
        }
    }, [archetype]);

    const handleAddCapability = () => {
        if (newCapability.trim()) {
            setCapabilities([...capabilities, newCapability.trim().toLowerCase()]);
            setNewCapability('');
        }
    };

    const handleRemoveCapability = (index: number) => {
        setCapabilities(capabilities.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!name.trim() || !systemPrompt.trim()) {
            setError('Name and System Prompt are required');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave({
                id: archetype?.id,
                name: name.trim(),
                description: description.trim(),
                systemPrompt: systemPrompt.trim(),
                capabilities,
                color,
                isBuiltIn: archetype?.isBuiltIn
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!archetype || !onDelete) return;

        if (!confirm(`Delete archetype "${archetype.name}"? This cannot be undone.`)) return;

        setIsDeleting(true);
        setError(null);

        try {
            await onDelete(archetype.id);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="flex flex-col h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[#0f1824] shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e]">
                    <div className="flex items-center gap-3">
                        <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg border"
                            style={{ backgroundColor: `${color}15`, color: color, borderColor: `${color}30` }}
                        >
                            {name.charAt(0) || '?'}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--ui-text-primary)] leading-tight">
                                {isNew ? 'New Archetype' : name || 'Edit Archetype'}
                            </h2>
                            {!isNew && (
                                <p className="font-mono uppercase tracking-wider text-[10px] text-[var(--ui-text-muted)] mt-0.5">{archetype.id}</p>
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

                {archetype?.isBuiltIn && (
                    <div className="mx-5 mt-4 flex items-start gap-3 bg-[var(--ui-accent-warning)]/10 border border-[var(--ui-accent-warning)]/20 p-3 rounded-lg text-[var(--ui-accent-warning)]">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <span className="font-semibold">Built-in Archetype.</span> This is a core system role. You cannot delete it.
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
                            placeholder="e.g., System Architect"
                            className="w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)] focus:ring-1 focus:ring-[var(--ui-accent-info)]"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 block">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this archetype's role"
                            className="w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)] focus:ring-1 focus:ring-[var(--ui-accent-info)]"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 block">Color</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border border-[var(--ui-border-soft)]"
                            />
                            <input
                                type="text"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="flex-1 bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)] focus:ring-1 focus:ring-[var(--ui-accent-info)]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 block">System Prompt *</label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="You are an expert software engineer..."
                            rows={6}
                            className="w-full bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] font-mono resize-y focus:outline-none focus:border-[var(--ui-accent-info)] focus:ring-1 focus:ring-[var(--ui-accent-info)] custom-scrollbar"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 block">Capabilities</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newCapability}
                                onChange={(e) => setNewCapability(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCapability())}
                                placeholder="e.g., execute_code"
                                className="flex-1 bg-[#0a111a] border border-[var(--ui-border-soft)] rounded-md px-3 py-2 text-sm text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--ui-accent-info)] focus:ring-1 focus:ring-[var(--ui-accent-info)]"
                            />
                            <button
                                type="button"
                                onClick={handleAddCapability}
                                disabled={!newCapability.trim()}
                                className="px-3 py-2 bg-[var(--ui-border-soft)] hover:bg-[var(--ui-border-hover)] text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-1 text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>

                        {capabilities.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {capabilities.map((cap, i) => (
                                    <div key={i} className="flex items-center gap-1.5 bg-[#14202e] border border-[var(--ui-border-soft)] px-2.5 py-1 rounded-full text-xs text-[var(--ui-text-primary)] isolate">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                                        <span>{cap}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCapability(i)}
                                            className="ml-1 text-[var(--ui-text-muted)] hover:text-rose-400 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-[var(--ui-text-muted)] italic py-2">No specific capabilities defined.</div>
                        )}
                    </div>
                </div>

                <div className="border-t border-[var(--ui-border-soft)] bg-[#0A111A] p-4 flex items-center justify-between flex-shrink-0 rounded-b-xl">
                    <div>
                        {!isNew && !archetype?.isBuiltIn && (
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
                            {isSaving ? 'Saving...' : (isNew ? 'Create Archetype' : 'Save Changes')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
