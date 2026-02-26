'use client';

import React from 'react';
import type { BeadIssue } from '../../lib/types';
import { ActivityPanel } from './activity-panel';
import { SwarmCommandFeed } from './swarm-command-feed';

export interface ContextualRightPanelProps {
    epicId?: string | null;
    issues: BeadIssue[];
    projectRoot: string;
}

export function ContextualRightPanel({ epicId, issues, projectRoot }: ContextualRightPanelProps) {
    if (epicId) {
        return (
            <SwarmCommandFeed
                epicId={epicId}
                issues={issues}
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
