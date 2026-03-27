import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extendActivityLease,
  listAgents,
  registerAgent,
  showAgent,
} from '../../src/lib/agent-registry';

type FakeBdResult = {
  success: boolean;
  classification: null;
  command: string;
  args: string[];
  cwd: string;
  stdout: string;
  stderr: string;
  code: number | null;
  durationMs: number;
  error: string | null;
};

type FakeAgent = {
  id: string;
  title: string;
  labels: string[];
  agent_state: string;
  created_at: string;
  last_activity: string;
};

function ok(stdout: unknown, args: string[]): FakeBdResult {
  return {
    success: true,
    classification: null,
    command: 'bd',
    args,
    cwd: '/tmp/fake-project',
    stdout: typeof stdout === 'string' ? stdout : JSON.stringify(stdout),
    stderr: '',
    code: 0,
    durationMs: 0,
    error: null,
  };
}

function fail(args: string[], error: string): FakeBdResult {
  return {
    success: false,
    classification: null,
    command: 'bd',
    args,
    cwd: '/tmp/fake-project',
    stdout: '',
    stderr: error,
    code: 1,
    durationMs: 0,
    error,
  };
}

function createFakeBdRunner(initialNow = '2026-02-13T23:55:00.000Z') {
  const agents = new Map<string, FakeAgent>();

  return async ({
    args,
  }: {
    projectRoot: string;
    args: string[];
    timeoutMs?: number;
    explicitBdPath?: string | null;
    stdinText?: string;
  }): Promise<FakeBdResult> => {
    if (args[0] === 'agent' && args[1] === 'show') {
      const agent = agents.get(args[2]);
      if (!agent) return fail(args, 'not found');
      return ok(
        {
          agent_state: agent.agent_state,
          hook_bead: null,
          id: agent.id,
          last_activity: agent.last_activity,
          rig: null,
          role_bead: null,
          role_type: null,
          title: agent.title,
        },
        args,
      );
    }

    if (args[0] === 'agent' && args[1] === 'state') {
      const beadId = args[2];
      const nextState = args[3];
      const existing = agents.get(beadId);
      const createdAt = existing?.created_at ?? initialNow;
      agents.set(beadId, {
        id: beadId,
        title: existing?.title ?? `Agent: ${beadId.replace(/^bb-/, '')}`,
        labels: existing?.labels ?? [],
        agent_state: nextState,
        created_at: createdAt,
        last_activity: createdAt,
      });
      return ok({ ok: true }, args);
    }

    if (args[0] === 'update') {
      const beadId = args[1];
      const existing = agents.get(beadId);
      if (!existing) return fail(args, 'not found');

      const titleIdx = args.indexOf('--title');
      const title = titleIdx !== -1 ? args[titleIdx + 1] : existing.title;

      const setLabels: string[] = [];
      for (let i = 0; i < args.length; i += 1) {
        if (args[i] === '--set-labels') {
          setLabels.push(args[i + 1]);
        }
      }

      const addLabels: string[] = [];
      for (let i = 0; i < args.length; i += 1) {
        if (args[i] === '--add-label') {
          addLabels.push(args[i + 1]);
        }
      }

      const labels = setLabels.length > 0 ? setLabels : [...existing.labels, ...addLabels];
      agents.set(beadId, {
        ...existing,
        title,
        labels,
      });
      return ok({ ok: true }, args);
    }

    if (args[0] === 'list') {
      const labelIdx = args.indexOf('--label');
      const label = labelIdx !== -1 ? args[labelIdx + 1] : null;
      const data = [...agents.values()]
        .filter((agent) => !label || agent.labels.includes(label))
        .map((agent) => ({
          id: agent.id,
          title: agent.title,
          status: 'open',
          priority: 0,
          issue_type: 'task',
          created_at: agent.created_at,
          created_by: 'test',
          updated_at: agent.last_activity,
          labels: agent.labels,
          agent_state: agent.agent_state,
          last_activity: agent.last_activity,
        }));
      return ok(data, args);
    }

    if (args[0] === 'admin' && args[1] === 'flush') {
      return ok({ ok: true }, args);
    }

    if (args[0] === 'create') {
      const idIdx = args.indexOf('--id');
      const titleIdx = args.indexOf('--title');
      const descIdx = args.indexOf('--description');
      const beadId = idIdx !== -1 ? args[idIdx + 1] : 'bb-agent';
      const title = titleIdx !== -1 ? args[titleIdx + 1] : `Agent: ${beadId.replace(/^bb-/, '')}`;
      const createdAt = initialNow;

      agents.set(beadId, {
        id: beadId,
        title,
        labels: [],
        agent_state: 'idle',
        created_at: createdAt,
        last_activity: createdAt,
      });

      return ok({
        id: beadId,
        title,
        description: descIdx !== -1 ? args[descIdx + 1] : '',
      }, args);
    }

    return fail(args, `Unhandled fake bd command: ${args.join(' ')}`);
  };
}

test('registerAgent creates stable metadata file with idle status', async () => {
  const runBd = createFakeBdRunner();
  const now = '2026-02-13T23:55:00.000Z';

  const result = await registerAgent(
    {
      name: 'agent-ui-1',
      display: 'UI Agent 1',
      role: 'ui',
    },
    { now: () => now, projectRoot: '/tmp/fake-project', runBd },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.agent_id, 'agent-ui-1');
  assert.equal(result.data?.status, 'idle');
  assert.equal(result.data?.role, 'ui');
  assert.equal(result.data?.agent_type_id, 'ui');
  assert.equal(result.data?.agent_instance_id, 'agent-ui-1');
  assert.equal(result.data?.identity_kind, 'runtime-instance');
});

test('registerAgent rejects duplicate id without --force-update', async () => {
  const runBd = createFakeBdRunner();

  await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { projectRoot: '/tmp/fake-project', runBd });
  const duplicate = await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { projectRoot: '/tmp/fake-project', runBd });

  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error?.code, 'DUPLICATE_AGENT_ID');
});

test('registerAgent force update mutates display/role but keeps created_at', async () => {
  const runBd = createFakeBdRunner();
  const createdAt = '2026-02-13T23:55:00.000Z';

  const first = await registerAgent(
    { name: 'agent-ui-1', display: 'UI Agent', role: 'ui' },
    { now: () => createdAt, projectRoot: '/tmp/fake-project', runBd },
  );
  assert.equal(first.ok, true);

  const updated = await registerAgent(
    { name: 'agent-ui-1', display: 'Frontend Agent', role: 'frontend', forceUpdate: true },
    { projectRoot: '/tmp/fake-project', runBd },
  );

  assert.equal(updated.ok, true);
  assert.equal(updated.data?.display_name, 'Frontend Agent');
  assert.equal(updated.data?.role, 'frontend');
  assert.equal(updated.data?.created_at, createdAt);
  assert.equal(updated.data?.agent_type_id, 'frontend');
  assert.equal(updated.data?.agent_instance_id, 'agent-ui-1');
});

test('listAgents sorts and filters by role/status', async () => {
  const runBd = createFakeBdRunner();

  await registerAgent({ name: 'agent-b', role: 'backend' }, { projectRoot: '/tmp/fake-project', runBd });
  await registerAgent({ name: 'agent-a', role: 'ui' }, { projectRoot: '/tmp/fake-project', runBd });

  const all = await listAgents({}, { projectRoot: '/tmp/fake-project', runBd });
  assert.equal(all.ok, true);
  assert.deepEqual(all.data?.map((agent) => agent.agent_id), ['agent-a', 'agent-b']);

  const byRole = await listAgents({ role: 'ui' }, { projectRoot: '/tmp/fake-project', runBd });
  assert.deepEqual(byRole.data?.map((agent) => agent.agent_id), ['agent-a']);
});

test('showAgent returns registered agent details', async () => {
  const runBd = createFakeBdRunner();
  await registerAgent({ name: 'agent-ui-show', role: 'ui' }, { projectRoot: '/tmp/fake-project', runBd });

  const shown = await showAgent({ agent: 'agent-ui-show' }, { projectRoot: '/tmp/fake-project', runBd });
  assert.equal(shown.ok, true);
  assert.equal(shown.data?.agent_id, 'agent-ui-show');
  assert.equal(shown.data?.status, 'idle');
  assert.equal(shown.data?.role, 'ui');
});

test('extendActivityLease succeeds for registered agent', async () => {
  const runBd = createFakeBdRunner();
  await registerAgent({ name: 'agent-ui-pulse', role: 'ui' }, { projectRoot: '/tmp/fake-project', runBd });

  const pulse = await extendActivityLease({ agent: 'agent-ui-pulse' }, { projectRoot: '/tmp/fake-project', runBd });
  assert.equal(pulse.ok, true);
  assert.equal(pulse.command, 'agent activity-lease');
});
