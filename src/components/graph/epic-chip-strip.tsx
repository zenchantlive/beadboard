'use client';

import { useState } from 'react';
import { Chip } from '../shared/chip';
import type { BeadIssue } from '../../lib/types';

/** Props for the EpicChipStrip component. */
interface EpicChipStripProps {
    /** List of all epic issues to display as selectable chips. */
    epics: BeadIssue[];
    /** Currently selected epic ID, or null if none selected. */
    selectedEpicId: string | null;
    /** Map of epic ID to total bead (task) count. */
    beadCounts: Map<string, number>;
    /** Callback fired when the user clicks an epic chip. */
    onSelect: (epicId: string) => void;
}

/**
 * Returns the label and color for an epic's status.
 */
function statusStyle(status: BeadIssue['status']): { label: string; dot: string } {
    switch (status) {
        case 'open':
            return { label: 'Open', dot: 'bg-sky-400' };
        case 'in_progress':
            return { label: 'In Progress', dot: 'bg-amber-400' };
        case 'blocked':
            return { label: 'Blocked', dot: 'bg-rose-500' };
        case 'closed':
            return { label: 'Done', dot: 'bg-emerald-400' };
        case 'deferred':
            return { label: 'Deferred', dot: 'bg-slate-400' };
        default:
            return { label: status, dot: 'bg-zinc-500' };
    }
}

/**
 * Renders an epic selector as a dropdown button that expands an inline selection panel.
 * When collapsed: shows the selected epic's title as a button.
 * When expanded: shows a horizontal strip of epic cards with ID, title, and status,
 * pushing page content down naturally.
 */
export function EpicChipStrip({ epics, selectedEpicId, beadCounts, onSelect }: EpicChipStripProps) {
    // Track whether the epic selector panel is expanded
    const [expanded, setExpanded] = useState(false);

    // Find the currently selected epic for the button label
    const selectedEpic = epics.find((epic) => epic.id === selectedEpicId);

    return (
        <div className="relative">
            {/* Collapsed state: button showing selected epic */}
            <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-left transition-all hover:bg-white/[0.07] hover:border-white/15 active:scale-[0.98] w-full"
            >
                {/* Status dot */}
                {selectedEpic ? (
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyle(selectedEpic.status).dot}`} />
                ) : null}

                {/* Selected epic label */}
                <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted/50">
                        Epic
                    </span>
                    <span className="block truncate text-sm font-semibold text-text-strong">
                        {selectedEpic ? selectedEpic.title : 'Select an epic'}
                    </span>
                </div>

                {/* Expand/collapse chevron */}
                <span className="text-text-muted/50 text-sm shrink-0">
                    {expanded ? '\u25b2' : '\u25bc'}
                </span>
            </button>

            {/* Expanded state: horizontal card strip */}
            {expanded ? (
                <div className="mt-2 rounded-2xl border border-white/8 bg-[#0c0e14]/95 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-lg animate-fade-in">
                    <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
                        {epics.map((epic) => {
                            // Determine if this card is the currently selected epic
                            const isSelected = epic.id === selectedEpicId;
                            // Closed epics get a muted visual treatment
                            const isClosed = epic.status === 'closed';
                            const style = statusStyle(epic.status);
                            const count = beadCounts.get(epic.id) ?? 0;

                            return (
                                <button
                                    key={epic.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(epic.id);
                                        setExpanded(false);
                                    }}
                                    className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${isSelected
                                        ? 'border-sky-400/40 bg-sky-400/10 ring-1 ring-sky-400/15'
                                        : isClosed
                                            ? 'border-white/5 bg-white/[0.02] opacity-50 hover:opacity-80'
                                            : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15'
                                        }`}
                                >
                                    {/* Top row: ID + Status + Priority */}
                                    <div className="flex items-center justify-between gap-2 w-full">
                                        <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted/60">{epic.id}</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5">
                                                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted/70">{style.label}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">P{epic.priority}</span>
                                        </div>
                                    </div>

                                    {/* Epic title */}
                                    <p className={`text-[12px] font-semibold leading-tight text-text-strong line-clamp-2 ${isClosed ? 'line-through' : ''}`}>
                                        {epic.title}
                                    </p>

                                    {/* Metadata Row: Bead Count */}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                            {count} {count === 1 ? 'bead' : 'beads'}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
