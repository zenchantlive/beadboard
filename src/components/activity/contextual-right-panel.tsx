'use client';

import React from 'react';
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
}

export function ContextualRightPanel({ epicId, taskId, swarmId, issues, projectRoot }: ContextualRightPanelProps) {
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
                onIssueUpdated={async () => {}}
            />
        );
    }

    if (epicId) {
        return (
            <SwarmCommandFeed
                epicId={epicId}
                issues={issues}
                projectRoot={projectRoot}
            />
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
        <ActivityPanel
            issues={issues}
            projectRoot={projectRoot}
        />
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
