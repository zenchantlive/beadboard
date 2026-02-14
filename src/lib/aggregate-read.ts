import type { BeadDependency, BeadIssueWithProject } from './types';
import type { ProjectScopeOption } from './project-scope';
import { readIssuesFromDisk } from './read-issues';

function scopeIssueId(projectKey: string, issueId: string): string {
  if (issueId.includes('::')) {
    return issueId;
  }
  return `${projectKey}::${issueId}`;
}

function remapDependencies(
  dependencies: BeadDependency[],
  scopedIssueByOriginalId: Map<string, string>,
): BeadDependency[] {
  return dependencies.map((dependency) => ({
    ...dependency,
    target: scopedIssueByOriginalId.get(dependency.target) ?? dependency.target,
  }));
}

function scopeIssuesForProject(
  project: ProjectScopeOption,
  issues: BeadIssueWithProject[],
): BeadIssueWithProject[] {
  const scopedIssueByOriginalId = new Map<string, string>();
  for (const issue of issues) {
    scopedIssueByOriginalId.set(issue.id, scopeIssueId(project.key, issue.id));
  }

  return issues.map((issue) => {
    const scopedId = scopedIssueByOriginalId.get(issue.id) ?? scopeIssueId(project.key, issue.id);
    return {
      ...issue,
      id: scopedId,
      dependencies: remapDependencies(issue.dependencies, scopedIssueByOriginalId),
      metadata: {
        ...issue.metadata,
        original_id: issue.id,
        project_key: project.key,
      },
      project: {
        ...issue.project,
        key: project.key,
      },
    };
  });
}

export async function readIssuesForScope(options: {
  mode: 'single' | 'aggregate';
  selected: ProjectScopeOption;
  scopeOptions: ProjectScopeOption[];
  preferBd?: boolean;
}): Promise<BeadIssueWithProject[]> {
  if (options.mode === 'single') {
    return readIssuesFromDisk({
      projectRoot: options.selected.root,
      projectSource: options.selected.source,
      preferBd: options.preferBd,
    });
  }

  const result = await Promise.all(
    options.scopeOptions.map(async (project) => {
      const issues = await readIssuesFromDisk({
        projectRoot: project.root,
        projectSource: project.source,
        preferBd: options.preferBd,
      });
      return scopeIssuesForProject(project, issues);
    }),
  );
  return result.flat();
}
