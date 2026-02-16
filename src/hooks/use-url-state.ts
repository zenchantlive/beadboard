'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export type ViewType = 'social' | 'graph' | 'swarm';
export type PanelState = 'open' | 'closed';
export type GraphTabType = 'flow' | 'overview';

export interface UrlState {
  view: ViewType;
  setView: (v: ViewType) => void;
  taskId: string | null;
  setTaskId: (id: string | null) => void;
  swarmId: string | null;
  setSwarmId: (id: string | null) => void;
  panel: PanelState;
  togglePanel: () => void;
  graphTab: GraphTabType;
  setGraphTab: (tab: GraphTabType) => void;
  clearSelection: () => void;
}

const DEFAULT_VIEW: ViewType = 'social';
const DEFAULT_PANEL: PanelState = 'closed';
const DEFAULT_GRAPH_TAB: GraphTabType = 'flow';

const VALID_VIEWS: ViewType[] = ['social', 'graph', 'swarm'];
const VALID_PANELS: PanelState[] = ['open', 'closed'];
const VALID_GRAPH_TABS: GraphTabType[] = ['flow', 'overview'];

export function parseUrlState(searchParams: URLSearchParams): {
  view: ViewType;
  taskId: string | null;
  swarmId: string | null;
  panel: PanelState;
  graphTab: GraphTabType;
} {
  const viewParam = searchParams.get('view');
  const view: ViewType = viewParam && VALID_VIEWS.includes(viewParam as ViewType) 
    ? (viewParam as ViewType) 
    : DEFAULT_VIEW;

  const taskId = searchParams.get('task');
  const swarmId = searchParams.get('swarm');

  const panelParam = searchParams.get('panel');
  const panel: PanelState = panelParam && VALID_PANELS.includes(panelParam as PanelState)
    ? (panelParam as PanelState)
    : DEFAULT_PANEL;

  const graphTabParam = searchParams.get('graphTab');
  const graphTab: GraphTabType = graphTabParam && VALID_GRAPH_TABS.includes(graphTabParam as GraphTabType)
    ? (graphTabParam as GraphTabType)
    : DEFAULT_GRAPH_TAB;

  return { view, taskId, swarmId, panel, graphTab };
}

export function buildUrlParams(
  searchParams: URLSearchParams,
  updates: Record<string, string | null>
): string {
  const sp = new URLSearchParams(searchParams.toString());
  
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') {
      sp.delete(key);
    } else {
      sp.set(key, value);
    }
  }
  
  const str = sp.toString();
  return str ? `/?${str}` : '/';
}

export function useUrlState(): UrlState {
  const searchParams = useSearchParams();
  const router = useRouter();

  const state = useMemo(() => parseUrlState(searchParams), [searchParams]);

  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const newUrl = buildUrlParams(searchParams, updates);
    router.push(newUrl, { scroll: false });
  }, [searchParams, router]);

  const setView = useCallback((v: ViewType) => {
    updateUrl({ view: v });
  }, [updateUrl]);

  const setTaskId = useCallback((id: string | null) => {
    updateUrl({ task: id });
  }, [updateUrl]);

  const setSwarmId = useCallback((id: string | null) => {
    updateUrl({ swarm: id });
  }, [updateUrl]);

  const togglePanel = useCallback(() => {
    const newPanel = state.panel === 'open' ? 'closed' : 'open';
    updateUrl({ panel: newPanel });
  }, [state.panel, updateUrl]);

  const setGraphTab = useCallback((tab: GraphTabType) => {
    updateUrl({ graphTab: tab });
  }, [updateUrl]);

  const clearSelection = useCallback(() => {
    updateUrl({ task: null, swarm: null, panel: null, graphTab: null });
  }, [updateUrl]);

  return {
    view: state.view,
    setView,
    taskId: state.taskId,
    setTaskId,
    swarmId: state.swarmId,
    setSwarmId,
    panel: state.panel,
    togglePanel,
    graphTab: state.graphTab,
    setGraphTab,
    clearSelection,
  };
}

export default useUrlState;
