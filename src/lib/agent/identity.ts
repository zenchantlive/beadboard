import type { BeadIssue } from '../types';

export const LEGACY_AGENT_LABEL = 'gt:agent';
export const RUNTIME_INSTANCE_LABEL = 'agent-lifecycle:runtime-instance';
export const AGENT_TYPE_LABEL_PREFIX = 'agent-type:';
export const AGENT_INSTANCE_LABEL_PREFIX = 'agent-instance:';

export function normalizeAgentHandle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function toAgentBeadId(name: string): string {
  const normalized = normalizeAgentHandle(name);
  return normalized.startsWith('bb-') ? normalized : `bb-${normalized}`;
}

export function fromAgentBeadId(id: string): string {
  return id.startsWith('bb-') ? id.slice(3) : id;
}

export function extractAgentDisplayName(
  issue: Pick<BeadIssue, 'id' | 'title' | 'labels' | 'assignee'>,
): string {
  const instanceLabel = extractAgentInstanceLabel(issue.labels);
  if (instanceLabel) return instanceLabel;

  const titleMatch = issue.title.match(/^Agent:\s*(.+)$/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  const legacyAgentLabel = issue.labels.find((label) => label.startsWith('agent:'));
  if (legacyAgentLabel) return legacyAgentLabel.replace(/^agent:/, '');

  if (issue.assignee) return fromAgentBeadId(issue.assignee);
  return fromAgentBeadId(issue.id);
}

export function extractAgentTypeLabel(labels: readonly string[]): string | null {
  const label = labels.find((item) => item.startsWith(AGENT_TYPE_LABEL_PREFIX));
  return label ? label.slice(AGENT_TYPE_LABEL_PREFIX.length) : null;
}

export function extractAgentInstanceLabel(labels: readonly string[]): string | null {
  const label = labels.find((item) => item.startsWith(AGENT_INSTANCE_LABEL_PREFIX));
  return label ? label.slice(AGENT_INSTANCE_LABEL_PREFIX.length) : null;
}

export function isRuntimeAgentIssue(issue: Pick<BeadIssue, 'issue_type' | 'labels'>): boolean {
  return issue.issue_type === 'agent'
    || issue.labels.includes(LEGACY_AGENT_LABEL)
    || issue.labels.includes(RUNTIME_INSTANCE_LABEL);
}

export function isRuntimeAgentLabels(labels: readonly string[]): boolean {
  return labels.includes(LEGACY_AGENT_LABEL) || labels.includes(RUNTIME_INSTANCE_LABEL);
}
