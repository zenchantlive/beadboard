import { UnifiedShell } from '../components/shared/unified-shell';
import { readIssuesForScope } from '../lib/aggregate-read';
import { resolveProjectScope } from '../lib/project-scope';
import { listProjects } from '../lib/registry';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
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
    skipAgentFilter: true,
  });
  
  return (
    <UnifiedShell
      issues={issues}
      projectRoot={scope.selected.root}
      projectScopeKey={scope.selected.key}
      projectScopeOptions={scope.options}
      projectScopeMode={scope.mode}
    />
  );
}
