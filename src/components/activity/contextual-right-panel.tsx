'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import type { BeadIssue } from '../../lib/types';
import { ActivityPanel } from './activity-panel';
import { SwarmCommandFeed } from './swarm-command-feed';
import { ThreadDrawer } from '../shared/thread-drawer';
import { MissionInspector } from '../mission/mission-inspector';
import { useSwarmList } from '../../hooks/use-swarm-list';
import { useUrlState } from '../../hooks/use-url-state';

export interface ContextualRightPanelProps {
    epicId?: string | null;
    taskId?: string | null;
    swarmId?: string | null;
    issues: BeadIssue[];
    projectRoot: string;
    actor?: string;
    onMinimize?: () => void;
}

export function ContextualRightPanel({ epicId, taskId, swarmId, issues, projectRoot, actor, onMinimize }: ContextualRightPanelProps) {
    const { setTaskId } = useUrlState();

    // Task conversation takes priority — user explicitly clicked the conversation icon
    if (taskId) {
        const selectedIssue = issues.find(i => i.id === taskId) ?? null;
        return (
            <ThreadDrawer
                isOpen={true}
                embedded={true}
                onClose={() => setTaskId(null)}
                title={selectedIssue?.title ?? taskId}
                id={taskId}
                issue={selectedIssue}
                projectRoot={projectRoot}
                actor={actor}
                onIssueUpdated={async () => {}}
            />
        );
    }

    if (epicId) {
        return (
            <div className="flex h-full flex-col overflow-hidden bg-[var(--surface-primary)]">
                {onMinimize && (
                    <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Epic Command Feed</span>
                        <button
                            type="button"
                            onClick={onMinimize}
                            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)]"
                            aria-label="Minimize to telemetry"
                            title="Minimize to telemetry"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-hidden">
                    <SwarmCommandFeed
                        epicId={epicId}
                        issues={issues}
                        projectRoot={projectRoot}
                    />
                </div>
            </div>
        );
    }

    if (swarmId) {
        return (
            <SwarmIdBranch
                swarmId={swarmId}
                projectRoot={projectRoot}
            />
        );
    }

    // Fallback to Global feed
    return (
        <div className="flex h-full flex-col overflow-hidden bg-[var(--surface-primary)]">
            {onMinimize && (
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Live Activity Feed</span>
                    <button
                        type="button"
                        onClick={onMinimize}
                        className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)]"
                        aria-label="Minimize to telemetry"
                        title="Minimize to telemetry"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-hidden">
                <ActivityPanel
                    issues={issues}
                    projectRoot={projectRoot}
                />
            </div>
        </div>
    );
}

// Inner component so hooks can be called conditionally via component boundary
function SwarmIdBranch({ swarmId, projectRoot }: { swarmId: string; projectRoot: string }) {
    const { setSwarmId } = useUrlState();
    const { swarms } = useSwarmList(projectRoot);
    const swarm = swarms.find(s => s.swarmId === swarmId);
    // Fall back to swarmId as title while swarm list loads
    const missionTitle = swarm?.title ?? swarmId;
    // TODO (follow-up): populate assignedAgents from swarm.agents once agent-registry is wired
    const assignedAgents = swarm?.agents ?? [];

    return (
        <MissionInspector
            missionId={swarmId}
            missionTitle={missionTitle}
            projectRoot={projectRoot}
            assignedAgents={assignedAgents}
            onClose={() => setSwarmId(null)}
            onAssign={async () => {}}
        />
    );
}
