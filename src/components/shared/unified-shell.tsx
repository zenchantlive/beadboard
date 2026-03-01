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
import { ResizeHandle } from './resize-handle';
import { useUrlState } from '../../hooks/use-url-state';
import { usePanelResize } from '../../hooks/use-panel-resize';
import { SmartDag } from '../graph/smart-dag';
import { SocialPage } from '../social/social-page';
import { buildSocialCards } from '../../lib/social-cards';
import { ContextualRightPanel } from '../activity/contextual-right-panel';
import { AssignmentPanel } from '../graph/assignment-panel';
import { useSwarmList } from '../../hooks/use-swarm-list';
import { useBeadsSubscription } from '../../hooks/use-beads-subscription';
import { useBdHealth } from '../../hooks/use-bd-health';

export interface UnifiedShellProps {
  issues: BeadIssue[];
  projectRoot: string;
  projectScopeKey: string;
  projectScopeOptions: ProjectScopeOption[];
  projectScopeMode: 'single' | 'aggregate';
}

export function UnifiedShell({
  issues: initialIssues,
  projectRoot,
  projectScopeOptions,
}: UnifiedShellProps) {
  const router = useRouter();
  const { view, taskId, setTaskId, swarmId, graphTab, panel, drawer, setDrawer, epicId, setEpicId, blockedOnly } = useUrlState();

  // Subscribe to SSE for real-time updates on ALL views
  const { issues } = useBeadsSubscription(initialIssues, projectRoot);

  const [filters, setFilters] = useState<LeftPanelFilters>({
    query: '',
    status: 'all',
    priority: 'all',
    preset: 'all',
    hideClosed: true,
  });

  const [customRightPanel, setCustomRightPanel] = useState<React.ReactNode | null>(null);

  // Assign mode state for graph view
  const [assignMode, setAssignMode] = useState(false);
  const [selectedAssignIssue, setSelectedAssignIssue] = useState<BeadIssue | null>(null);

  const socialCards = useMemo(() => buildSocialCards(issues), [issues]);
  const { swarms: swarmCards } = useSwarmList(projectRoot);
  const bdHealth = useBdHealth(projectRoot);

  const selectedSocialCard = taskId ? socialCards.find(c => c.id === taskId) : null;
  const selectedSwarmCard = swarmId ? swarmCards.find(c => c.swarmId === swarmId) : null;
  const selectedIssue = taskId ? issues.find((issue) => issue.id === taskId) ?? null : null;

  const handleGraphSelect = useMemo(() => (id: string) => {
    // Toggle: clicking the same node again closes the conversation panel
    if (taskId === id) {
      setTaskId(null);
    } else {
      setTaskId(id);
    }
    setCustomRightPanel(null);
  }, [taskId, setTaskId]);

  const handleCardSelect = useMemo(() => (id: string) => {
    if (view === 'social') {
      setTaskId(id, true);
    }
  }, [view, setTaskId]);

  const handleCloseDrawer = useMemo(() => () => {
    setDrawer('closed');
  }, [setDrawer]);

  // Handle assign mode change from SmartDag
  const handleAssignModeChange = useMemo(() => (mode: boolean) => {
    setAssignMode(mode);
    if (!mode) {
      setSelectedAssignIssue(null);
    }
  }, []);

  // Handle selected issue change from SmartDag (for assignment panel)
  const handleSelectedIssueChange = useMemo(() => (issue: BeadIssue | null) => {
    setSelectedAssignIssue(issue);
  }, []);

  // Chat Mode Logic: If a card is selected (drawer='open'), we show Chat popup
  const isChatOpen = drawer === 'open' && (!!taskId || !!swarmId || !!epicId);
  const selectedEpic = epicId ? issues.find((issue) => issue.id === epicId && issue.issue_type === 'epic') ?? null : null;
  const drawerTitle = selectedSocialCard?.title || selectedSwarmCard?.title || selectedEpic?.title || '';
  const drawerId = taskId || swarmId || epicId || '';
  const selectedItem = selectedEpic ?? selectedIssue;

  // Panel resize hook
  const { leftWidth, rightWidth, handleLeftResize, handleRightResize } = usePanelResize();

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
        <SmartDag
          issues={filteredIssues}
          epicId={epicId}
          selectedTaskId={taskId ?? undefined}
          onSelectTask={handleGraphSelect}
          projectRoot={projectRoot}
          hideClosed={graphTab !== 'flow'}
          onAssignModeChange={handleAssignModeChange}
          onSelectedIssueChange={handleSelectedIssueChange}
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
          blockedOnly={blockedOnly}
        />
      );
    }

    return null;
  };

  // Render right panel content based on view and assign mode
  const renderRightPanelContent = () => {
    if (customRightPanel) {
      return customRightPanel;
    }

    // Show AssignmentPanel when in graph view with assign mode enabled
    if (view === 'graph' && assignMode) {
      return (
        <AssignmentPanel
          selectedIssue={selectedAssignIssue}
          projectRoot={projectRoot}
          issues={issues}
          epicId={epicId ?? undefined}
          onIssueUpdated={async () => { router.refresh(); }}
        />
      );
    }

    // Default: ContextualRightPanel
    return <ContextualRightPanel epicId={epicId} taskId={taskId} swarmId={swarmId} issues={issues} projectRoot={projectRoot} />;
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--surface-backdrop)]" data-testid="unified-shell">
      {/* TOP BAR: 3rem fixed */}
      <TopBar
        totalTasks={issues.filter(i => i.issue_type !== 'epic').length}
        criticalAlerts={issues.filter(i => i.status === 'blocked').length}
        busyCount={issues.filter(i => i.status === 'in_progress').length}
        idleCount={0}
      />
      {!bdHealth.loading && !bdHealth.healthy ? (
        <div className="border-b border-amber-500/35 bg-amber-500/12 px-4 py-2 text-xs text-amber-100">
          <span className="font-semibold">BD setup issue:</span> {bdHealth.message}
        </div>
      ) : null}

      {/* MAIN AREA: Flex layout for resizable panels */}
      <div
        className="flex-1 flex overflow-hidden"
        data-testid="main-area"
      >
        {/* LEFT PANEL */}
        <div style={{ width: leftWidth }} className="flex-shrink-0 overflow-hidden">
          <LeftPanel
            issues={issues}
            selectedEpicId={epicId}
            onEpicSelect={setEpicId}
            onEpicEdit={(id) => { setEpicId(id); setDrawer('open'); }}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        {/* RESIZE HANDLE: Left */}
        <ResizeHandle direction="left" onResize={handleLeftResize} />

        {/* MIDDLE CONTENT: flex-1 */}
        <div className="flex-1 relative overflow-hidden bg-[var(--surface-secondary)]" data-testid="middle-content">
          {renderMiddleContent()}
        </div>

        {/* RESIZE HANDLE: Right */}
        <ResizeHandle direction="right" onResize={handleRightResize} />

        {/* RIGHT PANEL: always visible, content adapts to selection */}
        <div style={{ width: rightWidth }} className="flex-shrink-0 overflow-hidden">
          <RightPanel isOpen={true}>
            {renderRightPanelContent()}
          </RightPanel>
        </div>
      </div>

      {/* THREAD DRAWER: Popup overlay when a task is selected */}
      {isChatOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--alpha-black-medium)] p-4">
          <div className="h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] shadow-2xl">
            <ThreadDrawer
              isOpen={true}
              onClose={handleCloseDrawer}
              title={drawerTitle}
              id={drawerId}
              embedded={true}
              issue={selectedItem}
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
