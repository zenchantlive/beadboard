"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, ShieldAlert, Trash2, Plus, Copy, Palette, Smile } from 'lucide-react';
import type { AgentArchetype } from '../../lib/types-swarm';

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

const SUGGESTED_CAPABILITIES = [
    'coding', 'testing', 'debugging', 'refactoring', 'documentation',
    'code_review', 'system_design', 'architecture', 'planning', 'analysis',
    'research', 'investigation', 'deployment', 'ci_cd', 'monitoring',
    'security', 'performance', 'optimization', 'integration', 'migration',
    'data_analysis', 'automation', 'scripting', 'api_design', 'database',
    'frontend', 'backend', 'devops', 'qa', 'mentoring',
];

interface ArchetypeInspectorProps {
    archetype?: AgentArchetype;
    onClose: () => void;
    onSave: (data: Partial<AgentArchetype>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onClone?: (archetype: AgentArchetype) => Promise<void>;
}

export function ArchetypeInspector({ archetype, onClose, onSave, onDelete, onClone }: ArchetypeInspectorProps) {
    const isNew = !archetype;

    const [name, setName] = useState(archetype?.name || '');
    const [description, setDescription] = useState(archetype?.description || '');
    const [systemPrompt, setSystemPrompt] = useState(archetype?.systemPrompt || '');
    const [capabilities, setCapabilities] = useState<string[]>(archetype?.capabilities || []);
    const [color, setColor] = useState(archetype?.color || '#3b82f6');
    const [icon, setIcon] = useState(archetype?.icon || '');
    const [newCapability, setNewCapability] = useState('');
    const [capabilityFilter, setCapabilityFilter] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCloning, setIsCloning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showCapabilityDropdown, setShowCapabilityDropdown] = useState(false);

    useEffect(() => {
        if (archetype) {
            setName(archetype.name);
            setDescription(archetype.description);
            setSystemPrompt(archetype.systemPrompt);
            setCapabilities(archetype.capabilities);
            setColor(archetype.color);
            setIcon(archetype.icon || '');
        }
    }, [archetype]);

    const filteredSuggestions = useMemo(() => {
        return SUGGESTED_CAPABILITIES.filter(
            cap => 
                cap.includes(capabilityFilter.toLowerCase()) && 
                !capabilities.includes(cap)
        ).slice(0, 6);
    }, [capabilityFilter, capabilities]);

    const handleAddCapability = (cap?: string) => {
        const toAdd = cap || newCapability.trim();
        if (toAdd && !capabilities.includes(toAdd.toLowerCase())) {
            setCapabilities([...capabilities, toAdd.toLowerCase()]);
            setNewCapability('');
            setCapabilityFilter('');
            setShowCapabilityDropdown(false);
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
                icon: icon || undefined,
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

    const handleClone = async () => {
        if (!archetype || !onClone) return;
        
        setIsCloning(true);
        setError(null);

        try {
            await onClone(archetype);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clone');
        } finally {
            setIsCloning(false);
        }
    };

    const displayChar = icon || name.charAt(0) || '?';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="flex flex-col h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[#0f1824] shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e]">
                    <div className="flex items-center gap-4">
                        <div
                            className="h-12 w-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-all duration-200"
                            style={{ 
                                backgroundColor: `${color}20`, 
                                color: color, 
                                borderColor: `${color}50` 
                            }}
                        >
                            {displayChar}
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
                    <div className="mx-5 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--ui-text-secondary)] mb-1.5">Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] text-[var(--ui-text-primary)] placeholder:text-[var(--ui-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder="e.g., Code Reviewer"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--ui-text-secondary)] mb-1.5">Description</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] text-[var(--ui-text-primary)] placeholder:text-[var(--ui-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder="Brief description"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--ui-text-secondary)] mb-1.5">System Prompt *</label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] text-[var(--ui-text-primary)] placeholder:text-[var(--ui-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm resize-none"
                            placeholder="You are a helpful assistant that..."
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

                    <div>
                        <label className="block text-sm font-medium text-[var(--ui-text-secondary)] mb-1.5">Capabilities</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {capabilities.map((cap, index) => (
                                <span
                                    key={cap}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] text-[var(--ui-text-secondary)]"
                                >
                                    {cap}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCapability(index)}
                                        className="text-[var(--ui-text-muted)] hover:text-rose-400 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="relative">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCapability}
                                    onChange={(e) => {
                                        setNewCapability(e.target.value);
                                        setCapabilityFilter(e.target.value);
                                        setShowCapabilityDropdown(true);
                                    }}
                                    onFocus={() => setShowCapabilityDropdown(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCapability();
                                        }
                                    }}
                                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] text-[var(--ui-text-primary)] placeholder:text-[var(--ui-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                                    placeholder="Add capability..."
                                />
                                <button
                                    type="button"
                                    onClick={() => handleAddCapability()}
                                    disabled={!newCapability.trim()}
                                    className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {showCapabilityDropdown && filteredSuggestions.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] rounded-lg shadow-lg overflow-hidden">
                                    {filteredSuggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => handleAddCapability(suggestion)}
                                            className="w-full px-3 py-2 text-left text-sm text-[var(--ui-text-primary)] hover:bg-white/5 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
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
                                        {name || 'Archetype Name'}
                                    </div>
                                    <div className="text-xs text-[var(--ui-text-muted)]">
                                        {description || 'No description'}
                                    </div>
                                </div>
                            </div>
                            {capabilities.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {capabilities.slice(0, 5).map((cap) => (
                                        <span
                                            key={cap}
                                            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                            style={{ 
                                                backgroundColor: `${color}20`, 
                                                color: color 
                                            }}
                                        >
                                            {cap}
                                        </span>
                                    ))}
                                    {capabilities.length > 5 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-[var(--ui-text-muted)]">
                                            +{capabilities.length - 5} more
                                        </span>
                                    )}
                                </div>
                            )}
                            {systemPrompt && (
                                <div className="mt-3 p-2 rounded-lg bg-black/20 text-xs text-[var(--ui-text-muted)] font-mono line-clamp-2">
                                    {systemPrompt}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e]">
                    <div className="flex items-center gap-2">
                        {!isNew && onDelete && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting || archetype?.isBuiltIn}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        )}
                        {!isNew && onClone && (
                            <button
                                onClick={handleClone}
                                disabled={isCloning}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--ui-text-secondary)] hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Copy className="w-4 h-4" />
                                {isCloning ? 'Cloning...' : 'Clone'}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {archetype?.isBuiltIn && (
                            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                                Built-in archetype
                            </span>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-[var(--ui-text-secondary)] hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !name.trim() || !systemPrompt.trim()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : (isNew ? 'Create' : 'Save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
