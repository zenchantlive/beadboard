"use client";

import React from 'react';
import { X, Check, Pencil, Plus, Users } from 'lucide-react';
import type { SwarmTemplate } from '../../lib/types-swarm';
import { getTemplateDisplayChar, getTemplateColor } from '../../lib/utils';

interface TemplatePickerProps {
    templates: SwarmTemplate[];
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: SwarmTemplate) => void;
    onEdit: (templateId: string) => void;
    onCreateNew: () => void;
}

export function TemplatePicker({
    templates,
    isOpen,
    onClose,
    onSelect,
    onEdit,
    onCreateNew
}: TemplatePickerProps) {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSelect = (template: SwarmTemplate) => {
        onSelect(template);
        onClose();
    };

    const handleEdit = (e: React.MouseEvent, templateId: string) => {
        e.stopPropagation();
        onEdit(templateId);
    };

    const getTotalTeamSize = (template: SwarmTemplate): number => {
        return template.team.reduce((acc, member) => acc + member.count, 0);
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div className="flex flex-col w-full max-w-[800px] max-h-[85vh] overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[#0f1824] shadow-2xl animate-in zoom-in-95 duration-200">
                
                <div className="flex items-center justify-between border-b border-[var(--ui-border-soft)] px-5 py-4 bg-[#14202e] flex-shrink-0">
                    <h2 className="text-lg font-bold text-[var(--ui-text-primary)]">
                        Select Template
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="rounded-full p-2 text-[var(--ui-text-muted)] hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {templates.length === 0 ? (
                        <div className="text-center py-8 text-[var(--ui-text-muted)]">
                            <p className="text-sm">No templates available</p>
                            <p className="text-xs mt-1">Create a template to get started</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {templates.map((template) => {
                                const displayChar = getTemplateDisplayChar(template);
                                const color = getTemplateColor(template);
                                const teamSize = getTotalTeamSize(template);

                                return (
                                    <div
                                        key={template.id}
                                        className="group relative p-4 rounded-xl border border-[var(--ui-border-soft)] bg-[#111f2b] hover:bg-[#152836] hover:border-[var(--ui-border-hover)] transition-all cursor-pointer"
                                        onClick={() => handleSelect(template)}
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            <div 
                                                className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold border-2 flex-shrink-0"
                                                style={{ 
                                                    backgroundColor: `${color}20`, 
                                                    color: color, 
                                                    borderColor: `${color}50` 
                                                }}
                                            >
                                                {displayChar}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-[var(--ui-text-primary)] text-sm truncate">
                                                    {template.name}
                                                </h3>
                                                {template.isBuiltIn && (
                                                    <span className="inline-block px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] uppercase font-bold text-[var(--ui-text-muted)] border border-white/10 mt-1">
                                                        Built-in
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-xs text-[var(--ui-text-muted)] mb-3 line-clamp-4">
                                            {template.description}
                                        </p>

                                        <div className="flex items-center gap-2 text-xs text-[var(--ui-text-muted)] mb-3">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{teamSize} agent{teamSize !== 1 ? 's' : ''}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleSelect(template)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[var(--ui-accent-info)] hover:bg-[var(--ui-accent-info)]/90 text-white rounded-md text-xs font-medium transition-colors"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                Select
                                            </button>
                                            <button
                                                onClick={(e) => handleEdit(e, template.id)}
                                                className="p-1.5 rounded-md text-[var(--ui-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
                                                title="Edit template"
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

                <div className="border-t border-[var(--ui-border-soft)] bg-[#0A111A] p-4 flex-shrink-0 rounded-b-xl">
                    <button
                        onClick={onCreateNew}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--ui-border-soft)] hover:bg-[var(--ui-border-hover)] text-white rounded-md text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create New Template
                    </button>
                </div>

            </div>
        </div>
    );
}
