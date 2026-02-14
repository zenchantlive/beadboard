import { create } from 'zustand';
import type { ActivityEvent, ActivityEventKind } from '../../lib/activity';

export interface TimelineState {
  events: ActivityEvent[];
  filterProject: string | null;
  filterActor: string | null;
  filterKind: ActivityEventKind | null;
  
  // Selection states for Sessions UI
  selectedAgentId: string | null;
  selectedTaskId: string | null;
  
  addEvent: (event: ActivityEvent) => void;
  setHistory: (events: ActivityEvent[]) => void;
  setFilterProject: (projectId: string | null) => void;
  setFilterActor: (actor: string | null) => void;
  setFilterKind: (kind: ActivityEventKind | null) => void;
  
  // Selection actions
  setSelectedAgentId: (agentId: string | null) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  backToAgent: () => void;
  
  clear: () => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  events: [],
  filterProject: null,
  filterActor: null,
  filterKind: null,
  
  selectedAgentId: null,
  selectedTaskId: null,

  addEvent: (event) => set((state) => {
    // Avoid duplicates
    if (state.events.some(e => e.id === event.id)) {
      return state;
    }
    return { events: [event, ...state.events] };
  }),

  setHistory: (history) => set((state) => {
    const existingIds = new Set(state.events.map(e => e.id));
    const newEvents = history.filter(e => !existingIds.has(e.id));
    // Merge and sort by timestamp desc
    const merged = [...state.events, ...newEvents].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return { events: merged };
  }),

  setFilterProject: (projectId) => set({ filterProject: projectId }),
  setFilterActor: (actor) => set({ filterActor: actor }),
  setFilterKind: (kind) => set({ filterKind: kind }),
  
  setSelectedAgentId: (agentId) => set({ 
    selectedAgentId: agentId,
    // When selecting a new agent, clear task selection to show agent scorecard
    selectedTaskId: null 
  }),
  
  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),
  
  backToAgent: () => set({ selectedTaskId: null }),
  
  clear: () => set({ 
    events: [], 
    selectedAgentId: null, 
    selectedTaskId: null,
    filterProject: null,
    filterActor: null,
    filterKind: null
  }),
}));