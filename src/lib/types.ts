export const BEAD_STATUSES = [
  'open',
  'in_progress',
  'blocked',
  'deferred',
  'closed',
  'tombstone',
  'pinned',
  'hooked',
] as const;

export type BeadStatus = (typeof BEAD_STATUSES)[number];

export const BEAD_DEPENDENCY_TYPES = [
  'blocks',
  'parent',
  'relates_to',
  'duplicates',
  'supersedes',
  'replies_to',
] as const;

export type BeadDependencyType = (typeof BEAD_DEPENDENCY_TYPES)[number];

export const CORE_ISSUE_TYPES = ['task', 'bug', 'feature', 'epic', 'chore'] as const;

export type CoreIssueType = (typeof CORE_ISSUE_TYPES)[number];
export type BeadIssueType = CoreIssueType | (string & {});

export interface BeadDependency {
  type: BeadDependencyType;
  target: string;
}

export interface BeadIssue {
  id: string;
  title: string;
  description: string | null;
  status: BeadStatus;
  priority: number;
  issue_type: BeadIssueType;
  assignee: string | null;
  owner: string | null;
  labels: string[];
  dependencies: BeadDependency[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  close_reason: string | null;
  closed_by_session: string | null;
  created_by: string | null;
  due_at: string | null;
  estimated_minutes: number | null;
  external_ref: string | null;
  metadata: Record<string, unknown>;
}

export interface ParseableBeadIssue extends Partial<BeadIssue> {
  id: string;
  title: string;
}

export type ProjectSource = 'local' | 'registry' | 'scanner';

export interface ProjectContext {
  key: string;
  root: string;
  displayPath: string;
  name: string;
  source: ProjectSource;
  addedAt: string | null;
}

export type BeadIssueWithProject = BeadIssue & { project: ProjectContext };
