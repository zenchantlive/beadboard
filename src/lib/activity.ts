import type { BeadIssueWithProject } from './types';

/**
 * 16 transition types for timeline activity events,
 * as required by the bb-xhm.1 event model specification.
 */
export type ActivityEventKind =
  | 'created'
  | 'closed'
  | 'reopened'
  | 'status_changed'
  | 'priority_changed'
  | 'assignee_changed'
  | 'type_changed'
  | 'title_changed'
  | 'description_changed'
  | 'labels_changed'
  | 'dependency_added'
  | 'dependency_removed'
  | 'comment_added'
  | 'due_date_changed'
  | 'estimate_changed'
  | 'field_changed';

/**
 * Represents a discrete change or action derived from bead snapshots or interactions.
 */
export interface ActivityEvent {
  /** Unique identity for the event instance (likely UUID) */
  id: string;
  
  /** The type of transition that occurred */
  kind: ActivityEventKind;
  
  /** The issue this event belongs to */
  beadId: string;
  
  /** Display title of the issue at the time of the event */
  beadTitle: string;
  
  /** The project key this issue belongs to */
  projectId: string;
  
  /** Human-readable project name */
  projectName: string;
  
  /** ISO8601 timestamp of when the event was detected or recorded */
  timestamp: string;
  
  /** The actor who performed the action (assignee, owner, or session ID) */
  actor: string | null;
  
  /** Data payload describing the change */
  payload: {
    /** The specific field name that changed (for property updates) */
    field?: string;
    
    /** The previous value before the transition */
    from?: any;
    
    /** The new value after the transition */
    to?: any;
    
    /** Optional context message (e.g. comment text or close reason) */
    message?: string;
  };
}

/**
 * A pair of snapshots used by the diffing engine to derive ActivityEvents.
 */
export interface SnapshotDiff {
  previous: BeadIssueWithProject | null;
  current: BeadIssueWithProject;
}
