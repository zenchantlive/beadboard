'use client';

/** The two available view tabs in the Workflow Explorer. */
export type WorkflowTab = 'tasks' | 'dependencies';

/** Props for the WorkflowTabs component. */
interface WorkflowTabsProps {
    /** The currently active tab. */
    activeTab: WorkflowTab;
    /** Callback fired when the user switches tabs. */
    onTabChange: (tab: WorkflowTab) => void;
}

/** Tab label and key pairs for rendering. */
const TAB_OPTIONS: { key: WorkflowTab; label: string }[] = [
    { key: 'tasks', label: 'Tasks' },
    { key: 'dependencies', label: 'Dependencies' },
];

/**
 * A two-tab switcher for toggling between the Tasks view and Dependencies view.
 * Uses a pill-style indicator that slides to the active tab.
 */
export function WorkflowTabs({ activeTab, onTabChange }: WorkflowTabsProps) {
    return (
        <div className="inline-flex items-center gap-1 rounded-xl border border-white/8 bg-white/[0.02] p-1">
            {TAB_OPTIONS.map((tab) => {
                // Determine if this tab is currently active
                const isActive = activeTab === tab.key;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                        className={`rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${isActive
                                ? 'bg-sky-400/10 text-sky-200 shadow-[0_2px_8px_rgba(56,189,248,0.1)]'
                                : 'text-text-muted/60 hover:text-text-body hover:bg-white/[0.04]'
                            }`}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
