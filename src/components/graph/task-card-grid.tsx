'use client';

import type { BeadIssue } from '../../lib/types';

/** Props for an individual task card in the grid. */
/** Details for a blocker task shown on the card. */
export interface BlockerDetail {
    id: string;
    title: string;
    status: BeadIssue['status'];
    priority: BeadIssue['priority'];
    epicTitle?: string;
}

/** Props for an individual task card in the grid. */
interface TaskCardProps {
    /** The issue data for this card. */
    issue: BeadIssue;
    /** Whether this card is the currently selected task. */
    selected: boolean;
    /** List of issues blocking this task. */
    blockers: BlockerDetail[];
    /** List of issues this task blocks. */
    blocking: BlockerDetail[];
    /** Whether this task is actionable (unblocked). */
    isActionable: boolean;
    /** Callback fired when the user clicks this card (or a blocker). */
    onSelect: (id: string, shouldOpenDrawer?: boolean) => void;
}

/** Props for the TaskCardGrid component. */
interface TaskCardGridProps {
    /** List of tasks to display in the grid. */
    tasks: BeadIssue[];
    /** ID of the currently selected task, or null. */
    selectedId: string | null;
    /** Map of issue ID to detailed blocker info. */
    blockerDetailsMap: Map<string, BlockerDetail[]>;
    /** Map of issue ID to detailed downstream blocking info. */
    blocksDetailsMap: Map<string, BlockerDetail[]>;
    /** Set of actionable (unblocked) task IDs. */
    actionableIds: Set<string>;
    /** Callback fired when the user selects a task. */
    onSelect: (id: string, shouldOpenDrawer?: boolean) => void;
}

/**
 * Returns the Tailwind background color class for a status dot indicator.
 * Mirrors the statusDot function from the original monolith.
 */
function statusDot(status: BeadIssue['status']): string {
    switch (status) {
        case 'open':
            return 'bg-emerald-400';
        case 'in_progress':
            return 'bg-amber-400';
        case 'blocked':
            return 'bg-rose-500';
        case 'deferred':
            return 'bg-slate-400';
        case 'closed':
            return 'bg-slate-400';
        case 'pinned':
            return 'bg-violet-400';
        case 'hooked':
            return 'bg-orange-400';
        default:
            return 'bg-zinc-500';
    }
}

/**
 * Returns status-tinted gradient background for simplified flat styling.
 */
function statusGradient(status: BeadIssue['status']): string {
  switch (status) {
    case 'open':
      return 'border-l-2 border-emerald-400/60 bg-emerald-400/8';
    case 'in_progress':
      return 'border-l-2 border-amber-400/60 bg-amber-400/8';
    case 'blocked':
      return 'border-l-2 border-rose-400/60 bg-rose-400/8';
    case 'closed':
      return 'border-l-2 border-slate-400/40 bg-slate-400/5 opacity-70';
    case 'deferred':
      return 'border-l-2 border-slate-400/40 bg-slate-400/5';
    default:
      return 'border-l-2 border-slate-400/40 bg-slate-400/5';
  }
}

/**
 * Returns status-colored border for Aero Chrome styling.
 */
function statusBorder(status: BeadIssue['status']): string {
    switch (status) {
        case 'open':
            return 'border-emerald-500/20';
        case 'in_progress':
            return 'border-amber-500/20';
        case 'blocked':
            return 'border-rose-500/20';
        case 'closed':
            return 'border-rose-500/30';
        case 'deferred':
            return 'border-slate-500/20';
        default:
            return 'border-white/[0.06]';
    }
}

/**
 * Returns title text color class - greyed out for closed status.
 */
function titleColorClass(status: BeadIssue['status']): string {
    return status === 'closed' ? 'text-text-muted/70' : 'text-text-strong';
}

/**
 * Returns a human-friendly label and text color class for a status.
 */
function statusBadge(status: BeadIssue['status'], isActionable: boolean, hasBlockers: boolean): { label: string; textColor: string; bgColor: string } {
    // Actual blocked status always shows as Blocked in red
    if (status === 'blocked') {
        return { label: 'Blocked', textColor: 'text-rose-400', bgColor: 'bg-rose-400/10' };
    }

    // If effectively blocked (has open blockers), show Blocked (unless closed/done)
    if (hasBlockers && status !== 'closed' && status !== 'in_progress') {
        return { label: 'Blocked', textColor: 'text-rose-400', bgColor: 'bg-rose-400/10' };
    }

    switch (status) {
        case 'in_progress':
            return { label: 'In Progress', textColor: 'text-amber-400', bgColor: 'bg-amber-400/10' };
        case 'closed':
            return { label: 'Done', textColor: 'text-emerald-400', bgColor: 'bg-emerald-400/10' };
        case 'deferred':
            return { label: 'Deferred', textColor: 'text-slate-400', bgColor: 'bg-slate-400/10' };
        case 'open':
            // Open with no blockers -> Ready
            return { label: 'Ready', textColor: 'text-cyan-400', bgColor: 'bg-cyan-400/10' };
        default:
            return { label: status, textColor: 'text-zinc-400', bgColor: 'bg-zinc-400/10' };
    }
}



/**
 * A single task card displaying the issue ID, title, priority, type, assignee,
 * and detailed blocker list (interactive).
 */
function TaskCard({ issue, selected, blockers, blocking, isActionable, onSelect }: TaskCardProps) {
    const hasBlockers = blockers.length > 0; // Note: blockers list only contains OPEN blockers (computed in page)
    const badge = statusBadge(issue.status, isActionable, hasBlockers);
    const projectName = (issue as BeadIssue & { project?: { name?: string } }).project?.name ?? null;
    
    // Determine effective status: in_progress always shows as in_progress, blocked always blocked, otherwise check blockers
    const effectiveStatus: BeadIssue['status'] = issue.status === 'in_progress' ? 'in_progress' : 
                                    issue.status === 'blocked' ? 'blocked' : 
                                    hasBlockers ? 'blocked' : 
                                    issue.status;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect(issue.id, false)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(issue.id, false);
                }
            }}
            className={`group relative flex w-full flex-col rounded-xl border ${statusBorder(effectiveStatus)} ${statusGradient(effectiveStatus)} px-4 py-4 text-left transition duration-200 shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] ${selected
                ? 'ring-1 ring-amber-200/30 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                : 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
                }`}
        >
            {/* Expand / Open Drawer Button */}
            <button
                type="button"
                className="absolute right-2 top-2 z-10 rounded p-1.5 text-text-muted/50 hover:bg-white/10 hover:text-sky-300 transition-colors hover:opacity-100"
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(issue.id, true);
                }}
                title="Open Details"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
            </button>

            <div className="flex w-full items-start justify-between gap-3 pr-6">
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${statusDot(effectiveStatus)} ring-1 ring-white/10`} />
                        <span className="font-mono text-[10px] text-text-muted">{issue.id}</span>
                        {/* Status Badge */}
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.textColor} ${badge.bgColor}`}>
                            {badge.label}
                        </span>
                    </div>
                    {projectName ? (
                        <div className="inline-flex w-fit rounded border border-sky-300/25 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[9px] text-sky-200">
                            project: {projectName}
                        </div>
                    ) : null}
                    <h3 className={`line-clamp-3 text-sm font-medium leading-snug ${titleColorClass(issue.status)}`}>
                        {issue.title}
                    </h3>
                </div>
            </div>

            {/* Labels */}
            {issue.labels?.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                    {issue.labels.map((label) => (
                        <span key={label} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-text-muted/80 backdrop-blur-sm border border-white/5">
                            {label}
                        </span>
                    ))}
                </div>
            ) : null}

            {/* "Unlocks" section for blockers */}
            {blockers.length > 0 ? (
                <div className="mt-auto pt-2 w-full">
                    <div className="rounded-lg bg-black/20 p-2 border border-white/5">
                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-rose-400/80">Unlocks</p>
                        <div className="flex flex-col gap-1.5">
                            {blockers.map((blocker) => (
                                <div
                                    key={blocker.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(blocker.id, false);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.stopPropagation();
                                            onSelect(blocker.id, false);
                                        }
                                    }}
                                    className="group relative flex flex-col gap-0.5 rounded border border-white/5 bg-white/5 px-2.5 py-2 hover:border-sky-400/30 hover:bg-white/10 transition-colors"
                                >
                                    {/* Expand Button */}
                                    <button
                                        type="button"
                                        className="absolute right-1 top-1 z-10 rounded p-1 text-text-muted/50 hover:bg-white/10 hover:text-sky-300 transition-colors hover:opacity-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelect(blocker.id, true);
                                        }}
                                        title="Open Details"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                                    </button>

                                    <div className="flex items-center gap-2 pr-5">
                                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(blocker.status)}`} />
                                        <span className="font-mono text-[9px] text-text-muted">{blocker.id}</span>
                                        <span className="line-clamp-1 text-[10px] font-medium text-text-body">{blocker.title}</span>
                                    </div>
                                    {blocker.epicTitle ? (
                                        <div className="pl-3.5 text-[9px] text-text-muted/60 truncate max-w-full pr-5">
                                            <span className="group-hover:text-sky-300/70 transition-colors">↳ {blocker.epicTitle}</span>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* "Blocks" section (downstream) */}
            {blocking.length > 0 ? (
                <div className={`${blockers.length > 0 ? 'mt-2' : 'mt-auto'} w-full`}>
                    <div className="rounded-lg bg-black/20 p-2 border border-white/5">
                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-amber-400/80">Blocks</p>
                        <div className="flex flex-col gap-1.5">
                            {blocking.map((item) => (
                                <div
                                    key={item.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(item.id, false);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.stopPropagation();
                                            onSelect(item.id, false);
                                        }
                                    }}
                                    className="group relative flex flex-col gap-0.5 rounded border border-white/5 bg-white/5 px-2.5 py-2 hover:border-sky-400/30 hover:bg-white/10 transition-colors"
                                >
                                    {/* Expand Button */}
                                    <button
                                        type="button"
                                        className="absolute right-1 top-1 z-10 rounded p-1 text-text-muted/50 hover:bg-white/10 hover:text-sky-300 transition-colors hover:opacity-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelect(item.id, true);
                                        }}
                                        title="Open Details"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                                    </button>

                                    <div className="flex items-center gap-2 pr-5">
                                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(item.status)}`} />
                                        <span className="font-mono text-[9px] text-text-muted">{item.id}</span>
                                        <span className="line-clamp-1 text-[10px] font-medium text-text-body">{item.title}</span>
                                    </div>
                                    {item.epicTitle ? (
                                        <div className="pl-3.5 text-[9px] text-text-muted/60 truncate max-w-full pr-5">
                                            <span className="group-hover:text-sky-300/70 transition-colors">↳ {item.epicTitle}</span>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Footer Metadata: Assignee, Due Date */}
            <div className={`mt-3 flex w-full items-center justify-between border-t border-white/5 pt-3 text-[10px] text-text-muted/60`}>
                <div className="flex items-center gap-3">
                    {/* Assignee */}
                    <div className="flex items-center gap-1.5">
                        <span className="i-lucide-user h-3 w-3 opacity-70" />
                        <span>{issue.assignee ?? 'Unassigned'}</span>
                    </div>
                    {/* Due Date (if exists) */}
                    {issue.due_at ? (
                        <div className="flex items-center gap-1.5">
                            <span className="i-lucide-calendar h-3 w-3 opacity-70" />
                            <span>{new Date(issue.due_at as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

/**
 * Renders a responsive grid of task cards.
 * Uses auto-fill with minmax to prevent cards from being too narrow to read.
 */
export function TaskCardGrid({ tasks, selectedId, blockerDetailsMap, blocksDetailsMap, actionableIds, onSelect }: TaskCardGridProps) {
    // Show an empty state when no tasks exist in the selected epic
    if (tasks.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-text-muted/50">No tasks in this epic</p>
            </div>
        );
    }

    return (
        <div className="grid gap-3 overflow-y-auto overscroll-contain pr-1 custom-scrollbar grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
            {tasks.map((task) => (
                <TaskCard
                    key={task.id}
                    issue={task}
                    selected={selectedId === task.id}
                    blockers={blockerDetailsMap?.get(task.id) ?? []}
                    blocking={blocksDetailsMap?.get(task.id) ?? []}
                    isActionable={actionableIds?.has(task.id) ?? false}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
}
