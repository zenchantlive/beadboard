'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export type ViewType = 'social' | 'graph' | 'swarm' | 'activity';
export type PanelState = 'open' | 'closed';
export type DrawerState = 'open' | 'closed';
export type GraphTabType = 'flow' | 'overview';

export interface UrlState {
  view: ViewType;
  setView: (v: ViewType) => void;
  taskId: string | null;
  setTaskId: (id: string | null, openDrawer?: boolean) => void;
  swarmId: string | null;
  setSwarmId: (id: string | null, openDrawer?: boolean) => void;
  agentId: string | null;
  setAgentId: (id: string | null) => void;
  epicId: string | null;
  setEpicId: (id: string | null) => void;
  leftPanel: PanelState;
  setLeftPanel: (state: PanelState) => void;
  toggleLeftPanel: () => void;
  rightPanel: PanelState;
  setRightPanel: (state: PanelState) => void;
  toggleRightPanel: () => void;
  blockedOnly: boolean;
  setBlockedOnly: (enabled: boolean) => void;
  toggleBlockedOnly: () => void;
  panel: PanelState;
  togglePanel: () => void;
  drawer: DrawerState;
  setDrawer: (state: DrawerState) => void;
  graphTab: GraphTabType;
  setGraphTab: (tab: GraphTabType) => void;
  clearSelection: () => void;
}

const DEFAULT_VIEW: ViewType = 'social';
const DEFAULT_LEFT_PANEL: PanelState = 'open';
const DEFAULT_RIGHT_PANEL: PanelState = 'open';
const DEFAULT_DRAWER: DrawerState = 'closed';
const DEFAULT_GRAPH_TAB: GraphTabType = 'flow';

const VALID_VIEWS: ViewType[] = ['social', 'graph', 'swarm', 'activity'];
const VALID_PANELS: PanelState[] = ['open', 'closed'];
const VALID_DRAWERS: DrawerState[] = ['open', 'closed'];
const VALID_GRAPH_TABS: GraphTabType[] = ['flow', 'overview'];

const PANEL_STORAGE_KEYS = {
  left: 'bb.ui.leftPanel',
  right: 'bb.ui.rightPanel',
} as const;

interface PanelDefaults {
  leftPanel: PanelState;
  rightPanel: PanelState;
}

function parsePanelValue(value: string | null): PanelState | null {
  if (!value || !VALID_PANELS.includes(value as PanelState)) {
    return null;
  }
  return value as PanelState;
}

function readStoredPanelState(key: string, fallback: PanelState): PanelState {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = window.localStorage.getItem(key);
  return parsePanelValue(value) ?? fallback;
}

function isBlockedEnabled(value: string | null): boolean {
  return value === '1' || value === 'true';
}

export function parseUrlState(
  searchParams: URLSearchParams,
  defaults: PanelDefaults = {
    leftPanel: DEFAULT_LEFT_PANEL,
    rightPanel: DEFAULT_RIGHT_PANEL,
  }
): {
  view: ViewType;
  taskId: string | null;
  swarmId: string | null;
  agentId: string | null;
  epicId: string | null;
  leftPanel: PanelState;
  rightPanel: PanelState;
  blockedOnly: boolean;
  panel: PanelState;
  drawer: DrawerState;
  graphTab: GraphTabType;
} {
  const viewParam = searchParams.get('view');
  const view: ViewType = viewParam && VALID_VIEWS.includes(viewParam as ViewType) 
    ? (viewParam as ViewType) 
    : DEFAULT_VIEW;

  const taskId = searchParams.get('task');
  const swarmId = searchParams.get('swarm');
  const agentId = searchParams.get('agent');
  const epicId = searchParams.get('epic');

  const leftPanelFromUrl = parsePanelValue(searchParams.get('left'));
  const rightPanelFromUrl = parsePanelValue(searchParams.get('right'));
  const legacyPanel = parsePanelValue(searchParams.get('panel'));

  const leftPanel = leftPanelFromUrl ?? defaults.leftPanel;
  const rightPanel = rightPanelFromUrl ?? legacyPanel ?? defaults.rightPanel;
  const panel = rightPanel;

  const blockedOnly = isBlockedEnabled(searchParams.get('blocked'));

  const drawerParam = searchParams.get('drawer');
  const drawer: DrawerState = drawerParam && VALID_DRAWERS.includes(drawerParam as DrawerState)
    ? (drawerParam as DrawerState)
    : DEFAULT_DRAWER;

  const graphTabParam = searchParams.get('graphTab');
  const graphTab: GraphTabType = graphTabParam && VALID_GRAPH_TABS.includes(graphTabParam as GraphTabType)
    ? (graphTabParam as GraphTabType)
    : DEFAULT_GRAPH_TAB;

  return { view, taskId, swarmId, agentId, epicId, leftPanel, rightPanel, blockedOnly, panel, drawer, graphTab };
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
  const [panelDefaults, setPanelDefaults] = useState<PanelDefaults>({
    leftPanel: DEFAULT_LEFT_PANEL,
    rightPanel: DEFAULT_RIGHT_PANEL,
  });

  useEffect(() => {
    setPanelDefaults({
      leftPanel: readStoredPanelState(PANEL_STORAGE_KEYS.left, DEFAULT_LEFT_PANEL),
      rightPanel: readStoredPanelState(PANEL_STORAGE_KEYS.right, DEFAULT_RIGHT_PANEL),
    });
  }, []);

  const state = useMemo(() => parseUrlState(searchParams, panelDefaults), [searchParams, panelDefaults]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(PANEL_STORAGE_KEYS.left, state.leftPanel);
    window.localStorage.setItem(PANEL_STORAGE_KEYS.right, state.rightPanel);
  }, [state.leftPanel, state.rightPanel]);

  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const newUrl = buildUrlParams(searchParams, updates);
    router.push(newUrl, { scroll: false });
  }, [searchParams, router]);

  const setView = useCallback((v: ViewType) => {
    updateUrl({ view: v });
  }, [updateUrl]);

  const setLeftPanel = useCallback((next: PanelState) => {
    updateUrl({ left: next });
  }, [updateUrl]);

  const toggleLeftPanel = useCallback(() => {
    setLeftPanel(state.leftPanel === 'open' ? 'closed' : 'open');
  }, [setLeftPanel, state.leftPanel]);

  const setRightPanel = useCallback((next: PanelState) => {
    // Keep legacy `panel` in sync while migrating to explicit `right`.
    updateUrl({ right: next, panel: next });
  }, [updateUrl]);

  const toggleRightPanel = useCallback(() => {
    setRightPanel(state.rightPanel === 'open' ? 'closed' : 'open');
  }, [setRightPanel, state.rightPanel]);

  const setBlockedOnly = useCallback((enabled: boolean) => {
    updateUrl({ blocked: enabled ? '1' : null });
  }, [updateUrl]);

  const toggleBlockedOnly = useCallback(() => {
    setBlockedOnly(!state.blockedOnly);
  }, [setBlockedOnly, state.blockedOnly]);

  const setTaskId = useCallback((id: string | null, openDrawer?: boolean) => {
    const right = id ? 'open' : null;
    const drawer = openDrawer ? 'open' : null;
    // Clear swarm when setting task
    updateUrl({ task: id, swarm: null, right, panel: right, drawer });
  }, [updateUrl]);

  const setSwarmId = useCallback((id: string | null, openDrawer?: boolean) => {
    const right = id ? 'open' : null;
    const drawer = openDrawer ? 'open' : null;
    // Clear task when setting swarm
    updateUrl({ swarm: id, task: null, right, panel: right, drawer });
  }, [updateUrl]);

  const setAgentId = useCallback((id: string | null) => {
    const right = id ? 'open' : null;
    updateUrl({ agent: id, right, panel: right });
  }, [updateUrl]);

  const setEpicId = useCallback((id: string | null) => {
    updateUrl({ epic: id });
  }, [updateUrl]);

  const togglePanel = toggleRightPanel;

  const setDrawer = useCallback((state: DrawerState) => {
    updateUrl({ drawer: state });
  }, [updateUrl]);

  const setGraphTab = useCallback((tab: GraphTabType) => {
    updateUrl({ graphTab: tab });
  }, [updateUrl]);

  const clearSelection = useCallback(() => {
    updateUrl({ task: null, swarm: null, epic: null, right: 'closed', panel: 'closed', drawer: 'closed' });
  }, [updateUrl]);

  return {
    view: state.view,
    setView,
    taskId: state.taskId,
    setTaskId,
    swarmId: state.swarmId,
    setSwarmId,
    agentId: state.agentId,
    setAgentId,
    epicId: state.epicId,
    setEpicId,
    leftPanel: state.leftPanel,
    setLeftPanel,
    toggleLeftPanel,
    rightPanel: state.rightPanel,
    setRightPanel,
    toggleRightPanel,
    blockedOnly: state.blockedOnly,
    setBlockedOnly,
    toggleBlockedOnly,
    panel: state.rightPanel,
    togglePanel,
    drawer: state.drawer,
    setDrawer,
    graphTab: state.graphTab,
    setGraphTab,
    clearSelection,
  };
}

export default useUrlState;
