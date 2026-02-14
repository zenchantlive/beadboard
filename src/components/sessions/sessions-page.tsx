'use client';

import { useState, useMemo } from 'react';
import { useBeadsSubscription } from '../../hooks/use-beads-subscription';
import { useSessionFeed } from '../../hooks/use-session-feed';
import { useTimelineStore } from '../timeline/timeline-store';
import type { BeadIssue } from '../../lib/types';
import type { ProjectScopeOption } from '../../lib/project-scope';
import type { AgentRecord } from '../../lib/agent-registry';
import { EpicChipStrip } from '../shared/epic-chip-strip';
import { SessionTaskFeed } from './session-task-feed';
import { ConversationDrawer } from './conversation-drawer';
import { SessionsHeader } from './sessions-header';

interface SessionsPageProps {
  issues: BeadIssue[];
  agents: AgentRecord[];
  projectRoot: string;
  projectScopeKey: string;
  projectScopeOptions: ProjectScopeOption[];
  projectScopeMode: 'single' | 'aggregate';
}

export function SessionsPage({
  issues: initialIssues,
  agents,
  projectRoot,
  projectScopeKey,
  projectScopeOptions,
  projectScopeMode,
}: SessionsPageProps) {
  // 2. Session-specific feed
  const { feed, incursions, livenessMap, loading, refresh: refreshFeed, stats } = useSessionFeed(projectRoot);

  const { 
    selectedAgentId, 
    selectedTaskId, 
    setSelectedAgentId, 
    setSelectedTaskId,
    backToAgent
  } = useTimelineStore();

  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Basic subscription for SSE invalidation
  const { refresh: refreshIssues, issues: localIssues } = useBeadsSubscription(initialIssues, projectRoot, {
    onUpdate: () => {
      console.log('[Sessions] SSE update detected. Scheduling silent refresh...');
      // Small delay to ensure backend files are flushed
      setTimeout(() => {
        void refreshFeed({ silent: true });
        setRefreshTrigger(prev => prev + 1);
      }, 150);
    }
  });

  const epics = initialIssues.filter(i => i.issue_type === 'epic');
  const beadCounts = new Map(feed.map(b => [b.epic.id, b.tasks.length]));

  const selectedBead = useMemo(() => 
    localIssues.find(i => i.id === selectedTaskId) || null,
    [localIssues, selectedTaskId]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#070709]">
      <SessionsHeader 
        agents={agents}
        activeAgentId={selectedAgentId}
        onSelectAgent={setSelectedAgentId}
        projectScopeKey={projectScopeKey}
        projectScopeMode={projectScopeMode}
        projectScopeOptions={projectScopeOptions}
        stats={stats}
        livenessMap={livenessMap}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Activity Matrix */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto max-w-[90rem] px-[2rem] py-[2rem]">
            <div className="mb-[2rem] overflow-x-auto pb-[0.5rem] no-scrollbar">
              <EpicChipStrip
                epics={epics}
                selectedEpicId={selectedEpicId}
                beadCounts={beadCounts}
                onSelect={setSelectedEpicId}
              />
            </div>

            {loading ? (
              <div className="flex h-[30rem] items-center justify-center text-text-muted">
                <span className="animate-pulse tracking-[0.1em] uppercase text-[0.75rem] font-bold">
                  Synchronizing mission data...
                </span>
              </div>
            ) : (
              <SessionTaskFeed 
                feed={feed} 
                incursions={incursions}
                selectedEpicId={selectedEpicId} 
                onSelectTask={setSelectedTaskId}
                highlightTaskId={selectedTaskId}
              />
            )}
          </div>
        </main>

        {/* Integrated Context Sidebar (Desktop Only) */}
        <aside className={`hidden xl:block transition-all duration-500 ease-in-out border-l border-white/5 bg-[#0b0c10]/40 backdrop-blur-3xl overflow-hidden relative ${
          (selectedTaskId || selectedAgentId) ? 'w-[28rem] opacity-100' : 'w-0 opacity-0 border-l-0'
        }`}>
           <ConversationDrawer
              beadId={selectedTaskId}
              bead={selectedBead}
              agentId={selectedAgentId}
              open={Boolean(selectedTaskId || selectedAgentId)}
              onClose={() => {
                  setSelectedTaskId(null);
                  setSelectedAgentId(null);
              }}
              projectRoot={projectRoot}
              onActivity={() => {
                  void refreshIssues();
                  void refreshFeed();
              }}
              showAgentContext={Boolean(selectedAgentId && selectedTaskId)}
              onBackToAgent={backToAgent}
              embedded={true}
              refreshTrigger={refreshTrigger}
            />
        </aside>
      </div>

      {/* Mobile/Tablet Drawer (fallback for small screens) */}
      <div className="xl:hidden">
        <ConversationDrawer
          beadId={selectedTaskId}
          bead={selectedBead}
          agentId={selectedAgentId}
          open={Boolean(selectedTaskId || selectedAgentId)}
          onClose={() => {
              setSelectedTaskId(null);
              setSelectedAgentId(null);
          }}
          projectRoot={projectRoot}
          onActivity={() => {
              void refreshIssues();
              void refreshFeed();
          }}
          showAgentContext={Boolean(selectedAgentId && selectedTaskId)}
          onBackToAgent={backToAgent}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
}