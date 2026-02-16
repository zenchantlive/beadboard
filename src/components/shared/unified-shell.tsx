'use client';

import type { BeadIssue } from '../../lib/types';
import type { ProjectScopeOption } from '../../lib/project-scope';
import { TopBar } from './top-bar';
import { LeftPanel } from './left-panel';
import { RightPanel } from './right-panel';
import { MobileNav } from './mobile-nav';
import { useUrlState } from '../../hooks/use-url-state';
import { GraphView } from '../graph/graph-view';

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
  const { view, taskId, setTaskId, graphTab, setGraphTab, panel } = useUrlState();

  const handleGraphSelect = (id: string) => {
    setTaskId(id);
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

    return (
      <div className="p-4" style={{ color: 'var(--color-text-secondary)' }}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {view === 'social' && 'Social View'}
            {view === 'swarm' && 'Swarm View'}
          </h2>
          <p className="text-sm mt-2">
            {view === 'social' && 'Activity feed with blocks/unlocks coming soon'}
            {view === 'swarm' && 'Team health dashboard coming soon'}
          </p>
        </div>
      </div>
    );
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

        {/* RIGHT PANEL: 17rem detail strip */}
        <RightPanel isOpen={panel === 'open'} />
      </div>

      {/* MOBILE NAV: Bottom tab bar */}
      <MobileNav />
    </div>
  );
}
