import type {
  BeadIssue,
  BeadStatus,
  BeadDependencyType,
  BeadIssueType,
  BeadDependency,
  ParseableBeadIssue,
} from '../../src/lib/types';

const status: BeadStatus = 'open';
const depType: BeadDependencyType = 'blocks';
const issueType: BeadIssueType = 'task';

const dependency: BeadDependency = {
  type: depType,
  target: 'bb-123',
};

const issue: BeadIssue = {
  id: 'bb-123',
  title: 'Test issue',
  status,
  priority: 0,
  issue_type: issueType,
  description: 'schema contract',
  assignee: 'agent',
  templateId: null,
  owner: 'owner@example.com',
  labels: ['test'],
  dependencies: [dependency],
  created_at: '2026-02-12T00:00:00Z',
  updated_at: '2026-02-12T00:00:00Z',
  closed_at: null,
  close_reason: null,
  closed_by_session: null,
  created_by: 'zenchantlive',
  due_at: null,
  estimated_minutes: null,
  external_ref: null,
  metadata: {},
};

const parseable: ParseableBeadIssue = {
  id: issue.id,
  title: issue.title,
};

if (!parseable.id || !parseable.title) {
  throw new Error('invalid parseable issue contract');
}
