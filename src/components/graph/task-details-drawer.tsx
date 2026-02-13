'use client';

import { useEffect, useRef } from 'react';

import type { BeadIssue } from '../../lib/types';
import type { BlockedTreeNode } from '../../lib/kanban';
import { KanbanDetail } from '../kanban/kanban-detail';

/** Props for the TaskDetailsDrawer component. */
interface TaskDetailsDrawerProps {
    /** The issue to display, or null if nothing is selected. */
    issue: BeadIssue | null;
    /** Whether the drawer is open (visible). */
    open: boolean;
    /** Callback fired when the user closes the drawer. */
    onClose: () => void;
    /** Project root for mutation requests. */
    projectRoot?: string;
    /** Whether editing is enabled for the drawer. */
    editable?: boolean;
    /** Callback fired after successful save. */
    onIssueUpdated?: (issueId: string) => Promise<void> | void;

    /** Tree of blocked issues (incoming). */
    blockedTree?: { total: number; nodes: BlockedTreeNode[] };
    /** List of issues blocked by this one (outgoing). */
    outgoingBlocks?: { id: string; title: string; status: string }[];
    /** Callback when a blocked/blocking issue is clicked. */
    onSelectBlockedIssue?: (issueId: string) => void;
}

/**
 * A slide-in drawer panel from the right side that shows full task details.
 * Opens when a task is selected, closes via the X button or clicking the backdrop.
 * Uses CSS translate for the slide animation.
 */
export function TaskDetailsDrawer({
    issue,
    open,
    onClose,
    projectRoot,
    editable = true,
    onIssueUpdated,
    blockedTree,
    outgoingBlocks,
    onSelectBlockedIssue
}: TaskDetailsDrawerProps) {
    // Reference for the drawer panel to manage focus trapping
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close drawer on Escape key press
    useEffect(() => {
        if (!open) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    return (
        <>
            {/* Backdrop overlay - click to close */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer panel - slides in from right */}
            <div
                ref={drawerRef}
                className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0b0c10]/95 backdrop-blur-xl shadow-[-32px_0_64px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Drawer header with close button */}
                <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted/70">Task Details</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-text-body transition-all hover:bg-white/10 active:scale-95"
                    >
                        Close
                    </button>
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-6 custom-scrollbar">
                    {issue ? (
                        <KanbanDetail
                            issue={issue}
                            framed={false}
                            projectRoot={projectRoot}
                            editable={editable}
                            onIssueUpdated={onIssueUpdated}
                            blockedTree={blockedTree}
                            outgoingBlocks={outgoingBlocks}
                            onSelectBlockedIssue={onSelectBlockedIssue}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-xs font-medium uppercase tracking-widest text-text-muted/50">
                                Select a task to view details
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
