import type { MutationStatus, UpdateMutationPayload } from './mutations';
import type { BeadIssue } from './types';

export interface EditableIssueDraft {
  title: string;
  description: string;
  status: MutationStatus;
  priority: number;
  issueType: string;
  assignee: string;
  owner: string;
  labelsInput: string;
}

export type EditableIssueFieldErrors = Partial<Record<keyof EditableIssueDraft, string>>;

export type EditState = 'pristine' | 'dirty' | 'saving' | 'error';

export function parseLabelsInput(labelsInput: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const rawPart of labelsInput.split(',')) {
    const part = rawPart.trim();
    if (!part || seen.has(part)) {
      continue;
    }
    seen.add(part);
    labels.push(part);
  }
  return labels;
}

export function buildEditableIssueDraft(issue: BeadIssue): EditableIssueDraft {
  const editableStatus: MutationStatus =
    issue.status === 'open' ||
    issue.status === 'in_progress' ||
    issue.status === 'blocked' ||
    issue.status === 'deferred' ||
    issue.status === 'closed'
      ? issue.status
      : 'open';

  return {
    title: issue.title,
    description: issue.description ?? '',
    status: editableStatus,
    priority: issue.priority,
    issueType: issue.issue_type,
    assignee: issue.assignee ?? '',
    owner: issue.owner ?? '',
    labelsInput: issue.labels.map((label) => label.trim()).filter(Boolean).join(', '),
  };
}

export function validateEditableIssueDraft(draft: EditableIssueDraft): { ok: true; errors: {} } | { ok: false; errors: EditableIssueFieldErrors } {
  const errors: EditableIssueFieldErrors = {};
  if (!draft.title.trim()) {
    errors.title = 'Title is required.';
  }
  if (!Number.isInteger(draft.priority) || draft.priority < 0 || draft.priority > 4) {
    errors.priority = 'Priority must be between 0 and 4.';
  }
  if (!['open', 'in_progress', 'blocked', 'deferred', 'closed'].includes(draft.status)) {
    errors.status = 'Status must be open, in progress, blocked, deferred, or closed.';
  }
  if (!draft.issueType.trim()) {
    errors.issueType = 'Issue type is required.';
  }

  const parts = draft.labelsInput.split(',').map((part) => part.trim());
  if (parts.some((part) => part.length === 0) && draft.labelsInput.trim().length > 0) {
    errors.labelsInput = 'Labels must be comma-separated non-empty values.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, errors: {} };
}

function normalizeNullable(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function labelsChanged(current: string[], next: string[]): boolean {
  if (current.length !== next.length) {
    return true;
  }
  for (let i = 0; i < current.length; i += 1) {
    if (current[i] !== next[i]) {
      return true;
    }
  }
  return false;
}

export function buildIssueUpdatePayload(
  issue: BeadIssue,
  draft: EditableIssueDraft,
  projectRoot: string,
): UpdateMutationPayload | null {
  const nextTitle = draft.title.trim();
  const nextDescription = draft.description.trim();
  const nextAssignee = normalizeNullable(draft.assignee);
  const nextIssueType = draft.issueType.trim();
  const nextLabels = parseLabelsInput(draft.labelsInput);

  const payload: UpdateMutationPayload = {
    projectRoot,
    id: issue.id,
  };

  if (nextTitle !== issue.title) {
    payload.title = nextTitle;
  }

  if (nextDescription !== (issue.description ?? '')) {
    payload.description = nextDescription;
  }

  if (draft.priority !== issue.priority) {
    payload.priority = draft.priority;
  }

  if (draft.status !== issue.status) {
    payload.status = draft.status;
  }

  if (nextIssueType !== issue.issue_type) {
    payload.issueType = nextIssueType;
  }

  if (nextAssignee !== (issue.assignee ?? undefined)) {
    payload.assignee = nextAssignee;
  }

  if (labelsChanged(issue.labels, nextLabels)) {
    payload.labels = nextLabels;
  }

  if (
    payload.title === undefined &&
    payload.description === undefined &&
    payload.status === undefined &&
    payload.priority === undefined &&
    payload.issueType === undefined &&
    payload.assignee === undefined &&
    payload.labels === undefined
  ) {
    return null;
  }

  return payload;
}

export function classifyEditState(input: { dirty: boolean; saving: boolean; error: string | null }): EditState {
  if (input.saving) {
    return 'saving';
  }
  if (input.error) {
    return 'error';
  }
  if (input.dirty) {
    return 'dirty';
  }
  return 'pristine';
}
