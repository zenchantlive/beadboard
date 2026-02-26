"use client";

import React from 'react';
import { X, Blocks, Check, Pencil, Plus } from 'lucide-react';
import type { AgentArchetype } from '../../lib/types-swarm';
import { getArchetypeDisplayChar } from '../../lib/utils';

interface ArchetypePickerProps {
    archetypes: AgentArchetype[];
    isOpen: boolean;
    onClose: () => void;
    onSelect: (archetype: AgentArchetype) => void;
    onEdit: (archetypeId: string) => void;
    onCreateNew: () => void;
}

export function ArchetypePicker({
    archetypes,
    isOpen,
    onClose,
    onSelect,
    onEdit,
    onCreateNew
}: ArchetypePickerProps) {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSelect = (archetype: AgentArchetype) => {
        onSelect(archetype);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div className="flex flex-col w-full max-w-[800px] max-h-[85vh] overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[#0f1824] shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e]">
                    <div className="flex items-center gap-3">
                        <Blocks className="w-5 h-5 text-[var(--ui-text-secondary)]" />
                        <h2 className="text-lg font-bold text-[var(--ui-text-primary)]">
                            Select Archetype
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-[var(--ui-text-muted)] hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {archetypes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-[var(--ui-text-muted)]">
                            <Blocks className="w-12 h-12 mb-3 opacity-50" />
                            <p className="text-sm">No archetypes available</p>
                            <p className="text-xs mt-1">Create one to get started</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {archetypes.map((archetype) => {
                                const displayChar = getArchetypeDisplayChar(archetype);
                                return (
                                    <div
                                        key={archetype.id}
                                        className="group relative flex flex-col p-4 rounded-xl bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] hover:border-[var(--ui-border)] hover:bg-[#111f2b] transition-all duration-200"
                                    >
                                        <div className="flex items-start gap-3 mb-2">
                                            <div
                                                className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold border-2 flex-shrink-0"
                                                style={{
                                                    backgroundColor: `${archetype.color}20`,
                                                    color: archetype.color,
                                                    borderColor: `${archetype.color}50`
                                                }}
                                            >
                                                {displayChar}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-[var(--ui-text-primary)] text-sm truncate">
                                                    {archetype.name}
                                                </h3>
                                                <p className="text-xs text-[var(--ui-text-muted)] line-clamp-4 mt-0.5">
                                                    {archetype.description || 'No description'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[var(--ui-border-soft)]">
                                            <button
                                                onClick={() => handleSelect(archetype)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                Select
                                            </button>
                                            <button
                                                onClick={() => onEdit(archetype.id)}
                                                className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-text-primary)] hover:bg-white/5 transition-colors"
                                                title="Edit archetype"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="border-t border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e]">
                    <button
                        onClick={onCreateNew}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--ui-bg-soft)] border border-[var(--ui-border-soft)] text-[var(--ui-text-secondary)] hover:bg-[#111f2b] hover:text-[var(--ui-text-primary)] hover:border-[var(--ui-border)] transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create New Archetype
                    </button>
                </div>
            </div>
        </div>
    );
}
