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
import { ActivityPanel } from '../activity/activity-panel';

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
  const { view, taskId, setTaskId, swarmId, setSwarmId, graphTab, setGraphTab, panel, drawer, setDrawer, epicId, setEpicId } = useUrlState();

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

  // Chat Mode Logic: If a card is selected (drawer='open'), we show Chat + Mini Activity Rail
  const isChatOpen = drawer === 'open' && (!!taskId || !!swarmId);
  const drawerTitle = selectedSocialCard?.title || selectedSwarmCard?.title || '';
  const drawerId = taskId || swarmId || '';

  // Right Panel Content Logic
  // - Chat Mode: Main = Chat, Rail = Activity(Collapsed)
  // - Default: Main = Activity, Rail = None
  const rightPanelMain = isChatOpen ? (
    <ThreadDrawer
      isOpen={true} // Always "open" inside the panel
      onClose={handleCloseDrawer}
      title={drawerTitle}
      id={drawerId}
      embedded={true} // New prop to tell ThreadDrawer it's embedded, not an overlay
    />
  ) : (
    <ActivityPanel issues={issues} />
  );

  const rightPanelRail = isChatOpen ? (
    <ActivityPanel issues={issues} collapsed={true} />
  ) : undefined;

  // Grid Layout: Expand Right Panel width when Chat is open
  const rightPanelWidth = isChatOpen ? '26rem' : '17rem';

  const renderMiddleContent = () => {
    // Filter issues by Epic if selected (Global Filter)
    const filteredIssues = epicId 
      ? issues.filter(issue => {
          if (issue.issue_type === 'epic') return issue.id === epicId;
          const parent = issue.dependencies.find(d => d.type === 'parent');
          return parent?.target === epicId;
        })
      : issues;

    if (view === 'graph') {
      return (
        <GraphView
          beads={filteredIssues}
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
          issues={filteredIssues}
          selectedId={taskId ?? undefined}
          onSelect={handleCardSelect}
        />
      );
    }

    if (view === 'swarm') {
      return (
        <SwarmPage
          issues={filteredIssues}
          selectedId={swarmId ?? undefined}
          onSelect={handleCardSelect}
        />
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--color-bg-base)' }} data-testid="unified-shell">
      {/* TOP BAR: 3rem fixed */}
      <TopBar />

      {/* MAIN AREA: CSS Grid [18rem | 1fr | RightPanel] */}
      {/* Increased Left Panel width to 18rem per redesign request */}
      <div 
        className="flex-1 grid overflow-hidden transition-all duration-300"
        style={{ gridTemplateColumns: `18rem 1fr ${rightPanelWidth}` }}
        data-testid="main-area"
      >
        {/* LEFT PANEL: 18rem channel tree */}
        <LeftPanel 
          issues={issues} 
          selectedEpicId={epicId}
          onEpicSelect={setEpicId}
        />

        {/* MIDDLE CONTENT: flex-1 */}
        <div className="relative overflow-hidden bg-black/10 shadow-inner" data-testid="middle-content">
          {renderMiddleContent()}
        </div>

        {/* RIGHT PANEL: Dynamic Content + Optional Rail */}
        <RightPanel isOpen={panel === 'open'} rail={rightPanelRail}>
          {rightPanelMain}
        </RightPanel>
      </div>

      {/* MOBILE NAV: Bottom tab bar */}
      <MobileNav />
    </div>
  );
}
