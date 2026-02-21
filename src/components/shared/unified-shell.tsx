'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BeadIssue } from '../../lib/types';
import type { ProjectScopeOption } from '../../lib/project-scope';
import { TopBar } from './top-bar';
import { LeftPanel, type LeftPanelFilters } from './left-panel';
import { RightPanel } from './right-panel';
import { MobileNav } from './mobile-nav';
import { ThreadDrawer } from './thread-drawer';
import { useUrlState } from '../../hooks/use-url-state';
import { GraphView } from '../graph/graph-view';
import { SocialPage } from '../social/social-page';
import { SwarmWorkspace } from '../swarm/swarm-workspace';
import { SwarmMissionPicker } from '../swarm/swarm-mission-picker';
import { buildSocialCards } from '../../lib/social-cards';
import { ActivityPanel } from '../activity/activity-panel';
import { useSwarmList } from '../../hooks/use-swarm-list';

export interface UnifiedShellProps {
  issues: BeadIssue[];
  projectRoot: string;
  projectScopeKey: string;
  projectScopeOptions: ProjectScopeOption[];
  projectScopeMode: 'single' | 'aggregate';
}

export function UnifiedShell({
  issues,
  projectRoot,
  projectScopeOptions,
}: UnifiedShellProps) {
  const router = useRouter();
  const { view, taskId, setTaskId, swarmId, setSwarmId, graphTab, setGraphTab, panel, drawer, setDrawer, epicId, setEpicId } = useUrlState();

  const [filters, setFilters] = useState<LeftPanelFilters>({
    query: '',
    status: 'all',
    priority: 'all',
    preset: 'all',
    hideClosed: true,
  });

  const [customRightPanel, setCustomRightPanel] = useState<React.ReactNode | null>(null);

  const socialCards = useMemo(() => buildSocialCards(issues), [issues]);
  const { swarms: swarmCards } = useSwarmList(projectRoot);

  const selectedSocialCard = taskId ? socialCards.find(c => c.id === taskId) : null;
  const selectedSwarmCard = swarmId ? swarmCards.find(c => c.swarmId === swarmId) : null;
  const selectedIssue = taskId ? issues.find((issue) => issue.id === taskId) ?? null : null;

  const handleGraphSelect = useMemo(() => (id: string) => {
    setTaskId(id);
    setCustomRightPanel(null); // Reset when switching context
  }, [setTaskId]);

  const handleCardSelect = useMemo(() => (id: string) => {
    if (view === 'social') {
      setTaskId(id, true);
    } else if (view === 'swarm') {
      setSwarmId(id, true);
      // SwarmPage will handle setting the panel content via effect or prop
    }
  }, [view, setTaskId, setSwarmId]);

  const handleCloseDrawer = useMemo(() => () => {
    setDrawer('closed');
  }, [setDrawer]);

  // Chat Mode Logic: If a card is selected (drawer='open'), we show Chat popup
  const isChatOpen = drawer === 'open' && (!!taskId || !!swarmId);
  const drawerTitle = selectedSocialCard?.title || selectedSwarmCard?.title || '';
  const drawerId = taskId || swarmId || '';

  // Grid Layout: Fixed width for right panel (activity only)
  const rightPanelWidth = '17rem';

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
          projectScopeOptions={projectScopeOptions}
        />
      );
    }

    if (view === 'swarm') {
      return (
        <SwarmWorkspace
          selectedMissionId={swarmId ?? undefined}
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
        style={{ gridTemplateColumns: `20rem 1fr ${rightPanelWidth}` }}
        data-testid="main-area"
      >
        {/* LEFT PANEL: 20rem generic tree or 20rem swarm mission picker */}
        {view === 'swarm' ? (
          <div className="border-r bg-[var(--color-bg-base)] h-full overflow-y-auto">
            <SwarmMissionPicker />
          </div>
        ) : (
          <LeftPanel
            issues={issues}
            selectedEpicId={epicId}
            onEpicSelect={setEpicId}
            filters={filters}
            onFiltersChange={setFilters}
          />
        )}

        {/* MIDDLE CONTENT: flex-1 */}
        <div className="relative overflow-hidden bg-black/10 shadow-inner" data-testid="middle-content">
          {renderMiddleContent()}
        </div>

        {/* RIGHT PANEL: Activity or Custom */}
        <RightPanel isOpen={panel === 'open'}>
          {customRightPanel || <ActivityPanel issues={issues} />}
        </RightPanel>
      </div>

      {/* THREAD DRAWER: Popup overlay when a task is selected */}
      {isChatOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-bg-card)] shadow-2xl">
            <ThreadDrawer
              isOpen={true}
              onClose={handleCloseDrawer}
              title={drawerTitle}
              id={drawerId}
              embedded={true}
              issue={selectedIssue}
              projectRoot={projectRoot}
              onIssueUpdated={async () => {
                router.refresh();
              }}
            />
          </div>
        </div>
      ) : null}

      {/* MOBILE NAV: Bottom tab bar */}
      <MobileNav />
    </div>
  );
}
