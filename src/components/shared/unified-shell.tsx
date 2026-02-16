'use client';

import { useMemo } from 'react';
import type { BeadIssue } from '../../lib/types';
import type { ProjectScopeOption } from '../../lib/project-scope';
import { TopBar } from './top-bar';
import { LeftPanel } from './left-panel';
import { RightPanel } from './right-panel';
import { MobileNav } from './mobile-nav';
import { ThreadDrawer } from './thread-drawer';
import { useUrlState } from '../../hooks/use-url-state';
import { GraphView } from '../graph/graph-view';
import { SocialPage } from '../social/social-page';
import { SwarmPage } from '../swarm/swarm-page';
import { buildSocialCards } from '../../lib/social-cards';
import { buildSwarmCards } from '../../lib/swarm-cards';

export interface UnifiedShellProps {
  issues: BeadIssue[];
  projectRoot: string;
  projectScopeKey: string;
  projectScopeOptions: ProjectScopeOption[];
  projectScopeMode: 'single' | 'aggregate';
}

export function UnifiedShell({
  issues,
}: UnifiedShellProps) {
  const { view, taskId, setTaskId, swarmId, setSwarmId, graphTab, setGraphTab, panel, drawer, setDrawer } = useUrlState();

  const socialCards = useMemo(() => buildSocialCards(issues), [issues]);
  const swarmCards = useMemo(() => buildSwarmCards(issues), [issues]);

  const selectedSocialCard = taskId ? socialCards.find(c => c.id === taskId) : null;
  const selectedSwarmCard = swarmId ? swarmCards.find(c => c.swarmId === swarmId) : null;

  const handleGraphSelect = (id: string) => {
    setTaskId(id);
  };

  const handleCardSelect = (id: string) => {
    if (view === 'social') {
      setTaskId(id);
    } else if (view === 'swarm') {
      setSwarmId(id);
    }
    setDrawer('open');
  };

  const handleCloseDrawer = () => {
    setDrawer('closed');
  };

  // Thread drawer - shows when card selected
  const isDrawerOpen = drawer === 'open' && (!!taskId || !!swarmId);
  const drawerTitle = selectedSocialCard?.title || selectedSwarmCard?.title || '';
  const drawerId = taskId || swarmId || '';

  const renderRightPanel = () => {
    // TODO: Wire up ActivityPanel (bb-ui2.29) - for now show placeholder
    return (
      <div className="p-4 text-center text-text-muted text-sm">
        Activity Panel coming
        <br />
        <span className="text-xs">(bb-ui2.29)</span>
      </div>
    );
  };

  const renderMiddleContent = () => {
    if (view === 'graph') {
      return (
        <GraphView
          beads={issues}
          selectedId={taskId ?? undefined}
          onSelect={handleGraphSelect}
          graphTab={graphTab}
          onGraphTabChange={setGraphTab}
          hideClosed={false}
        />
      );
    }

    if (view === 'social') {
      return (
        <SocialPage
          issues={issues}
          selectedId={taskId ?? undefined}
          onSelect={setTaskId}
        />
      );
    }

    if (view === 'swarm') {
      return (
        <SwarmPage
          issues={issues}
          selectedId={swarmId ?? undefined}
          onSelect={setSwarmId}
        />
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--color-bg-base)' }} data-testid="unified-shell">
      {/* TOP BAR: 3rem fixed */}
      <TopBar />

      {/* MAIN AREA: CSS Grid [13rem | 1fr | 17rem] */}
      <div 
        className="flex-1 grid overflow-hidden"
        style={{ gridTemplateColumns: '13rem 1fr 17rem' }}
        data-testid="main-area"
      >
        {/* LEFT PANEL: 13rem channel tree */}
        <LeftPanel issues={issues} />

        {/* MIDDLE CONTENT: flex-1 */}
        <div className="overflow-y-auto" data-testid="middle-content">
          {renderMiddleContent()}
        </div>

        {/* RIGHT PANEL: 17rem - Always shows Activity (bb-ui2.29) */}
        <RightPanel isOpen={panel === 'open'}>
          {renderRightPanel()}
        </RightPanel>
      </div>

      {/* THREAD DRAWER: 24rem - Slides from right edge of middle when card selected */}
      <ThreadDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={drawerTitle}
        id={drawerId}
      />

      {/* MOBILE NAV: Bottom tab bar */}
      <MobileNav />
    </div>
  );
}
