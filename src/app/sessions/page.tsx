import { SessionsPage } from '../../components/sessions/sessions-page';
import type { SwarmGroup } from '../../components/sessions/sessions-header';
import { readIssuesForScope } from '../../lib/aggregate-read';
import { resolveProjectScope } from '../../lib/project-scope';
import { listProjects } from '../../lib/registry';
import { listAgents } from '../../lib/agent-registry';
import { getSwarmMembers } from '../../lib/swarm-molecules';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const requestedProjectKey = typeof params.project === 'string' ? params.project : null;
  const requestedMode = typeof params.mode === 'string' ? params.mode : null;
  const registryProjects = await listProjects();
  const agentsResult = await listAgents({});
  const agents = agentsResult.data ?? [];

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

  const epics = issues.filter(i => i.issue_type === 'epic');
  const epicsWithSwarm = epics.filter(
    i => (i.labels || []).some(l => l.startsWith('swarm:'))
  );

  const swarmGroups: SwarmGroup[] = [];
  const assignedAgentIds = new Set<string>();

  for (const epic of epicsWithSwarm) {
    const swarmLabel = epic.labels?.find(l => l.startsWith('swarm:'));
    if (!swarmLabel) continue;
    
    const swarmId = swarmLabel.replace('swarm:', '');
    const memberIds = await getSwarmMembers({ swarmId }, { projectRoot: scope.selected.root });

    const members = agents.filter(a => memberIds.includes(a.agent_id));
    members.forEach(a => assignedAgentIds.add(a.agent_id));

    if (members.length > 0) {
      swarmGroups.push({
        swarmId,
        swarmLabel: epic.id,
        members,
      });
    }
  }

  const unassignedAgents = agents.filter(a => !assignedAgentIds.has(a.agent_id));

  return (
    <SessionsPage
      issues={issues}
      agents={agents}
      projectRoot={scope.selected.root}
      projectScopeKey={scope.selected.key}
      projectScopeOptions={scope.options}
      projectScopeMode={scope.mode}
      swarmGroups={swarmGroups}
      unassignedAgents={unassignedAgents}
    />
  );
}
