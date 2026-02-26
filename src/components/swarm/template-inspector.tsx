"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Network, ShieldAlert, Palette, Smile, Copy } from 'lucide-react';
import type { SwarmTemplate, AgentArchetype } from '../../lib/types-swarm';

const COLOR_PRESETS = [
    '#3b82f6', '#2563eb', '#1d4ed8', '#0ea5e9', '#06b6d4',
    '#10b981', '#059669', '#22c55e', '#84cc16', '#a3e635',
    '#8b5cf6', '#7c3aed', '#a855f7', '#c084fc', '#e879f9',
    '#ef4444', '#dc2626', '#f97316', '#fb923c', '#fbbf24',
    '#ec4899', '#db2777', '#f472b6', '#f9a8d4', '#fda4af',
    '#6366f1', '#64748b', '#78716c', '#57534e', '#1e293b',
];

const EMOJI_PRESETS = [
    '🏗️', '⚙️', '🔍', '🧪', '🚀', '🤖', '👨‍💻', '👩‍💻', '🧙‍♂️', '🧙‍♀️',
    '🔧', '📝', '🎯', '⚡', '🛡️', '📊', '🗂️', '💡', '🔮', '🧩',
    '⭐', '🔥', '💎', '🚦', '🎪', '🎨', '🎭', '🃏', '👑', '🏆',
    '🦅', '🐺', '🦁', '🐻', '🦊', '🐙', '🐝', '🦋', '🌿', '🌊',
];

interface TemplateInspectorProps {
    template?: SwarmTemplate;
    archetypes: AgentArchetype[];
    onClose: () => void;
    onSave: (data: Partial<SwarmTemplate>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onClone?: (template: SwarmTemplate) => Promise<void>;
}

export function TemplateInspector({ template, archetypes, onClose, onSave, onDelete, onClone }: TemplateInspectorProps) {
    const isNew = !template;

    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [team, setTeam] = useState<{ archetypeId: string; count: number }[]>(template?.team || []);
    const [protoFormula, setProtoFormula] = useState(template?.protoFormula || '');
    const [color, setColor] = useState(template?.color || '#f59e0b');
    const [icon, setIcon] = useState(template?.icon || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCloning, setIsCloning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setDescription(template.description);
            setTeam(template.team);
            setProtoFormula(template.protoFormula || '');
            setColor(template.color || '#f59e0b');
            setIcon(template.icon || '');
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
                color,
                icon: icon || undefined,
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

    const handleClone = async () => {
        if (!template || !onClone) return;

        setIsCloning(true);
        setError(null);

        try {
            await onClone(template);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clone');
        } finally {
            setIsCloning(false);
        }
    };

    const totalAgents = team.reduce((acc, curr) => acc + curr.count, 0);
    const displayChar = icon || totalAgents;

    const getArchetypeName = (id: string) => {
        return archetypes.find(a => a.id === id)?.name || id;
    };

    const getArchetypeColor = (id: string) => {
        return archetypes.find(a => a.id === id)?.color || '#64748b';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="flex flex-col h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[#0f1824] shadow-2xl animate-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e]">
                    <div className="flex items-center gap-4">
                        <div 
                            className="h-12 w-12 rounded-xl flex items-center justify-center text-xl font-bold border-2"
                            style={{ backgroundColor: `${color}20`, color: color, borderColor: `${color}50` }}
                        >
                            {displayChar}
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--ui-text-secondary)] mb-1.5">
                                <Palette className="w-4 h-4" />
                                Color
                            </label>
                            <div className="flex items-center gap-2 mb-2">
                                <div
                                    className="h-8 w-8 rounded-lg border-2 border-white/20"
                                    style={{ backgroundColor: color }}
                                />
                                <input
                                    type="text"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] text-[var(--ui-text-primary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                    className="px-3 py-1.5 rounded-lg bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] text-[var(--ui-text-secondary)] hover:bg-white/5 text-sm"
                                >
                                    {showColorPicker ? 'Hide' : 'Pick'}
                                </button>
                            </div>
                            {showColorPicker && (
                                <div className="grid grid-cols-10 gap-1.5 p-2 bg-[var(--ui-bg-soft)] rounded-lg border border-[var(--ui-border-soft)]">
                                    {COLOR_PRESETS.map((presetColor) => (
                                        <button
                                            key={presetColor}
                                            type="button"
                                            onClick={() => {
                                                setColor(presetColor);
                                                setShowColorPicker(false);
                                            }}
                                            className={`h-6 w-6 rounded-md border-2 transition-all hover:scale-110 ${color === presetColor ? 'border-white ring-2 ring-white/30' : 'border-transparent'}`}
                                            style={{ backgroundColor: presetColor }}
                                            title={presetColor}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--ui-text-secondary)] mb-1.5">
                                <Smile className="w-4 h-4" />
                                Icon / Emoji
                            </label>
                            <div className="flex items-center gap-2 mb-2">
                                <div
                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-lg border border-[var(--ui-border-soft)] bg-[var(--ui-bg-soft)]"
                                    style={{ color }}
                                >
                                    {icon || '?'}
                                </div>
                                <input
                                    type="text"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] text-[var(--ui-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="Emoji or leave empty"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="px-3 py-1.5 rounded-lg bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] text-[var(--ui-text-secondary)] hover:bg-white/5 text-sm"
                                >
                                    {showEmojiPicker ? 'Hide' : 'Pick'}
                                </button>
                            </div>
                            {showEmojiPicker && (
                                <div className="grid grid-cols-10 gap-1.5 p-2 bg-[var(--ui-bg-soft)] rounded-lg border border-[var(--ui-border-soft)]">
                                    {EMOJI_PRESETS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => {
                                                setIcon(emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                            className={`h-6 w-6 rounded-md flex items-center justify-center text-base transition-all hover:scale-110 hover:bg-white/10 ${icon === emoji ? 'bg-white/20 ring-2 ring-white/30' : ''}`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
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

                    <div className="border-t border-[var(--ui-border-soft)] pt-4">
                        <h3 className="text-sm font-medium text-[var(--ui-text-secondary)] mb-3">Live Preview</h3>
                        <div className="p-4 rounded-xl bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)]">
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold border-2"
                                    style={{ 
                                        backgroundColor: `${color}20`, 
                                        color: color, 
                                        borderColor: `${color}50` 
                                    }}
                                >
                                    {displayChar}
                                </div>
                                <div>
                                    <div className="font-semibold text-[var(--ui-text-primary)]">
                                        {name || 'Template Name'}
                                    </div>
                                    <div className="text-xs text-[var(--ui-text-muted)]">
                                        {description || 'No description'}
                                    </div>
                                </div>
                            </div>
                            {team.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {team.map((member, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                            style={{ 
                                                backgroundColor: `${getArchetypeColor(member.archetypeId)}20`, 
                                                color: getArchetypeColor(member.archetypeId)
                                            }}
                                        >
                                            {getArchetypeName(member.archetypeId)} ×{member.count}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {protoFormula && (
                                <div className="mt-3 p-2 rounded-lg bg-black/20 text-xs text-[var(--ui-text-muted)] font-mono line-clamp-2">
                                    {protoFormula}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className="border-t border-[var(--ui-border-soft)] bg-[#0A111A] p-4 flex items-center justify-between flex-shrink-0 rounded-b-xl">
                    <div className="flex items-center gap-2">
                        {!isNew && !template?.isBuiltIn && onDelete && (
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
                        {!isNew && onClone && (
                            <button
                                type="button"
                                onClick={handleClone}
                                disabled={isCloning}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--ui-text-secondary)] hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Copy className="w-4 h-4" />
                                {isCloning ? 'Cloning...' : 'Clone'}
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
