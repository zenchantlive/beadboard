import { DependencyGraphPage } from '../../components/graph/dependency-graph-page';

export const dynamic = 'force-dynamic';
import { readIssuesForScope } from '../../lib/aggregate-read';
import { resolveProjectScope } from '../../lib/project-scope';
import { listProjects } from '../../lib/registry';

interface GraphPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GraphPage({ searchParams }: GraphPageProps) {
  const params = (await searchParams) ?? {};
  const requestedProjectKey = typeof params.project === 'string' ? params.project : null;
  const requestedMode = typeof params.mode === 'string' ? params.mode : null;
  const registryProjects = await listProjects();
  const scope = resolveProjectScope({
    currentProjectRoot: process.cwd(),
    registryProjects,
    requestedProjectKey,
    requestedMode,
  });

  const issues = await readIssuesForScope({
    mode: scope.mode,
    selected: scope.selected,
    scopeOptions: scope.options,
    preferBd: true,
  });
  return (
    <DependencyGraphPage
      issues={issues}
      projectRoot={scope.selected.root}
      projectScopeKey={scope.selected.key}
      projectScopeOptions={scope.options}
      projectScopeMode={scope.mode}
    />
  );
}
