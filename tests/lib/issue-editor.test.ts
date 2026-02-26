import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEditableIssueDraft,
  buildIssueUpdatePayload,
  classifyEditState,
  parseLabelsInput,
  validateEditableIssueDraft,
  type EditableIssueDraft,
} from '../../src/lib/issue-editor';
import type { BeadIssue } from '../../src/lib/types';

function makeIssue(overrides: Partial<BeadIssue> = {}): BeadIssue {
  const has = (key: keyof BeadIssue) => Object.prototype.hasOwnProperty.call(overrides, key);
  return {
    id: overrides.id ?? 'bb-101',
    title: overrides.title ?? 'Implement shared edit surface',
    description: has('description') ? (overrides.description as string | null) : 'First line',
    status: overrides.status ?? 'open',
    priority: overrides.priority ?? 2,
    issue_type: overrides.issue_type ?? 'task',
    assignee: has('assignee') ? (overrides.assignee as string | null) : null,
    templateId: null,
    owner: has('owner') ? (overrides.owner as string | null) : null,
    labels: overrides.labels ?? ['ux', 'graph'],
    dependencies: overrides.dependencies ?? [],
    created_at: overrides.created_at ?? '2026-02-13T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-02-13T00:00:00.000Z',
    closed_at: overrides.closed_at ?? null,
    close_reason: overrides.close_reason ?? null,
    closed_by_session: overrides.closed_by_session ?? null,
    created_by: overrides.created_by ?? 'zenchantlive',
    due_at: overrides.due_at ?? null,
    estimated_minutes: overrides.estimated_minutes ?? null,
    external_ref: overrides.external_ref ?? null,
    metadata: overrides.metadata ?? {},
  };
}

test('buildEditableIssueDraft normalizes nullable issue fields', () => {
  const issue = makeIssue({
    description: null,
    assignee: null,
    owner: null,
    labels: ['graph', ' ux ', ''],
  });

  const draft = buildEditableIssueDraft(issue);

  assert.equal(draft.title, issue.title);
  assert.equal(draft.description, '');
  assert.equal(draft.status, issue.status);
  assert.equal(draft.assignee, '');
  assert.equal(draft.owner, '');
  assert.equal(draft.labelsInput, 'graph, ux');
});

test('validateEditableIssueDraft returns validation errors for invalid input', () => {
  const draft = {
    title: '   ',
    description: 'desc',
    status: 'tombstone',
    priority: 7,
    issueType: '',
    assignee: 'dev-a',
    owner: '',
    labelsInput: 'ok, , invalid',
  } as unknown as EditableIssueDraft;

  const result = validateEditableIssueDraft(draft);

  assert.equal(result.ok, false);
  assert.equal(result.errors.title, 'Title is required.');
  assert.equal(result.errors.status, 'Status must be open, in progress, blocked, deferred, or closed.');
  assert.equal(result.errors.priority, 'Priority must be between 0 and 4.');
  assert.equal(result.errors.issueType, 'Issue type is required.');
  assert.equal(result.errors.labelsInput, 'Labels must be comma-separated non-empty values.');
});

test('buildIssueUpdatePayload includes only changed mutable fields', () => {
  const issue = makeIssue({
    title: 'Old title',
    description: 'Old description',
    priority: 2,
    issue_type: 'task',
    assignee: 'old-assignee',
    labels: ['legacy'],
    owner: 'owner-a',
  });
  const draft: EditableIssueDraft = {
    title: 'New title',
    description: 'Old description',
    status: 'in_progress',
    priority: 1,
    issueType: 'feature',
    assignee: 'new-assignee',
    owner: 'owner-b',
    labelsInput: 'legacy,ui',
  };

  const payload = buildIssueUpdatePayload(issue, draft, 'C:/repo');

  assert.deepEqual(payload, {
    projectRoot: 'C:/repo',
    id: issue.id,
    title: 'New title',
    status: 'in_progress',
    priority: 1,
    issueType: 'feature',
    assignee: 'new-assignee',
    labels: ['legacy', 'ui'],
  });
});

test('buildIssueUpdatePayload returns null when no mutable fields changed', () => {
  const issue = makeIssue({
    title: 'Same title',
    description: 'Same description',
    status: 'open',
    priority: 2,
    issue_type: 'task',
    assignee: null,
    owner: 'owner-a',
    labels: ['a', 'b'],
  });
  const draft = buildEditableIssueDraft(issue);

  const payload = buildIssueUpdatePayload(issue, draft, 'C:/repo');

  assert.equal(payload, null);
});

test('parseLabelsInput deduplicates, trims, and preserves order', () => {
  assert.deepEqual(parseLabelsInput(' alpha, beta,alpha, gamma , ,beta'), ['alpha', 'beta', 'gamma']);
});

test('classifyEditState derives ui state from dirty/saving/error flags', () => {
  assert.equal(classifyEditState({ dirty: false, saving: false, error: null }), 'pristine');
  assert.equal(classifyEditState({ dirty: true, saving: false, error: null }), 'dirty');
  assert.equal(classifyEditState({ dirty: true, saving: true, error: null }), 'saving');
  assert.equal(classifyEditState({ dirty: true, saving: false, error: 'boom' }), 'error');
});
