# Phase 3: Agent-Based Orchestration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform BeadBoard from archetype-based to agent-based orchestration where the orchestrator spawns, coordinates, and manages numbered agent instances that users can see in real-time.

**Architecture:** 
- Rename "archetypes" to "agents" everywhere user-facing
- Agents = typed workers with specific prompts/configs (what archetypes were)
- Agent instances = running copies, numbered while active (e.g., "Engineer 01", "Engineer 02")
- Templates = named agent compositions (e.g., "Feature Dev" = Architect + 2x Engineer + Reviewer)
- Right panel shows active agent instances with status + numbers
- Orchestrator picks which agents to spawn based on task scope

**Tech Stack:** 
- Next.js, TypeScript, Pi SDK
- BeadBoard's existing beads/epics system
- Runtime console events for agent status

---

## Rename: Archetype → Agent

### Task 1: Rename in Code (Internal)

**Files:**
- Modify: `src/lib/types-swarm.ts` - rename `AgentArchetype` → `AgentType`
- Modify: `src/lib/server/beads-fs.ts` - update SEED_ARCHETYPES comments
- Modify: `src/lib/worker-session-manager.ts` - update type imports and comments

**Step 1: Rename AgentArchetype type**

```typescript
// src/lib/types-swarm.ts
export interface AgentType {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    capabilities: string[];
    color: string;
    icon?: string;
    createdAt: string;
    updatedAt: string;
    isBuiltIn: boolean;
}
```

**Step 2: Update worker-session-manager imports**

```typescript
// src/lib/worker-session-manager.ts line 4
import type { AgentType } from './types-swarm';
```

**Step 3: Commit**

```bash
git add src/lib/types-swarm.ts src/lib/worker-session-manager.ts
git commit -m "refactor: rename AgentArchetype → AgentType internally"
```

---

### Task 2: Rename in Tools (User-Facing)

**Files:**
- Modify: `src/tui/tools/bb-list-archetypes.ts` → rename to `bb-list-agents.ts`
- Modify: `src/tui/tools/bb-create-archetype.ts` → rename to `bb-create-agent.ts`
- Modify: `src/tui/tools/bb-update-archetype.ts` → rename to `bb-update-agent.ts`
- Modify: `src/tui/tools/bb-delete-archetype.ts` → rename to `bb-delete-agent.ts`
- Modify: `src/tui/tools/bb-spawn-worker.ts` - update archetype param description
- Modify: `src/lib/pi-daemon-adapter.ts` - update imports

**Step 1: Rename bb-list-archetypes.ts**

```typescript
// src/tui/tools/bb-list-agents.ts
import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { getAgentTypes } from '../../lib/server/beads-fs';

export function createListAgentsTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_list_agents',
    label: 'List Agent Types',
    description: 'List all available agent types. Returns id, name, description, capabilities for each. Agent types are the kinds of workers the orchestrator can spawn.',
    parameters: Type.Object({}),
    async execute() {
      // ... same as existing, but rename "archetype" → "agent" in output
    },
  };
}
```

**Step 2: Rename other archetype tools similarly**

Create new files with "agent" naming, delete old "archetype" files.

**Step 3: Update bb-spawn-worker.ts param description**

```typescript
// src/tui/tools/bb-spawn-worker.ts line 11
archetype: Type.Optional(Type.String({ 
  description: 'Agent type to spawn. Options: "architect", "engineer", "reviewer", "tester", "investigator", "shipper". Default: engineer.' 
})),
```

**Step 4: Update pi-daemon-adapter.ts imports**

```typescript
// src/lib/pi-daemon-adapter.ts - update import paths
import { createListAgentsTool } from '../tui/tools/bb-list-agents';
// ... update all 8 tool imports
```

**Step 5: Commit**

```bash
git add src/tui/tools/ src/lib/pi-daemon-adapter.ts
git commit -m "refactor: rename archetype tools → agent tools"
```

---

### Task 3: Rename in Database Seed

**Files:**
- Modify: `src/lib/server/beads-fs.ts` - rename SEED_ARCHETYPES → SEED_AGENTS

**Step 1: Rename constants**

```typescript
// src/lib/server/beads-fs.ts
const SEED_AGENTS: AgentType[] = [ /* same content */ ];
const SEED_TEMPLATES: SwarmTemplate[] = [ /* same content */ ];
```

**Step 2: Rename functions**

```typescript
export async function getAgentTypes(projectRoot: string = process.cwd()): Promise<AgentType[]> {
    // ... same implementation
}
```

**Step 3: Update callers**

```bash
grep -rn "getArchetypes" src/ | grep -v test
# Update each to getAgentTypes
```

**Step 4: Commit**

```bash
git add src/lib/server/beads-fs.ts
git commit -m "refactor: rename getArchetypes → getAgentTypes"
```

---

### Task 4: Rename in UI Components

**Files:**
- Modify: `src/components/swarm/archetype-inspector.tsx` → `agent-inspector.tsx`
- Modify: `src/components/swarm/telemetry-grid.tsx` - update archetype props
- Modify: Any other UI files referencing "archetype"

**Step 1: Rename archetype-inspector.tsx**

```bash
mv src/components/swarm/archetype-inspector.tsx src/components/swarm/agent-inspector.tsx
```

**Step 2: Update internal references**

```typescript
// In agent-inspector.tsx
// Change "Archetype" → "Agent" in all display text
```

**Step 3: Commit**

```bash
git add src/components/swarm/
git commit -m "refactor: rename archetype UI → agent UI"
```

---

## Agent Instance Display

### Task 5: Design Agent Instance Model

**Files:**
- Create: `src/lib/agent-instance.ts`

**Step 1: Define AgentInstance type**

```typescript
// src/lib/agent-instance.ts

export interface AgentInstance {
  id: string;                    // unique instance ID (e.g., "engineer-01-abc123")
  agentTypeId: string;           // what kind of agent (e.g., "engineer")
  displayName: string;           // e.g., "Engineer 01"
  status: 'spawning' | 'working' | 'idle' | 'completed' | 'failed';
  currentBeadId?: string;        // bead they're working on
  startedAt: string;
  completedAt?: string;
  result?: string;
  error?: string;
}

export interface AgentStatus {
  totalActive: number;
  byType: Record<string, number>;  // { "engineer": 2, "architect": 1 }
  instances: AgentInstance[];
}
```

**Step 2: Create helper functions**

```typescript
export function generateInstanceId(agentTypeId: string, existingCount: number): string {
  const suffix = String(existingCount + 1).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8);
  return `${agentTypeId}-${suffix}-${random}`;
}

export function getDisplayName(agentTypeId: string, instanceNumber: number, agentTypeName: string): string {
  const num = String(instanceNumber).padStart(2, '0');
  return `${agentTypeName} ${num}`;
}
```

**Step 3: Commit**

```bash
git add src/lib/agent-instance.ts
git commit -m "feat: add AgentInstance model for tracking running agents"
```

---

### Task 6: Integrate with Worker Session Manager

**Files:**
- Modify: `src/lib/worker-session-manager.ts`

**Step 1: Import AgentInstance**

```typescript
import { generateInstanceId, getDisplayName, type AgentInstance } from './agent-instance';
```

**Step 2: Add instance tracking to worker session**

```typescript
// In WorkerSession interface, add:
agentInstanceId: string;
agentTypeId: string;
displayName: string;
```

**Step 3: Generate instance ID when spawning**

```typescript
// In spawnWorker(), when creating worker:
const existingCount = [...this.workers.values()].filter(w => w.agentTypeId === archetype).length;
const agentType = archetype || 'engineer';
const agentTypeName = getAgentTypeName(agentType); // lookup name

worker.agentInstanceId = generateInstanceId(agentType, existingCount);
worker.agentTypeId = agentType;
worker.displayName = getDisplayName(agentType, existingCount + 1, agentTypeName);
```

**Step 4: Add AgentInstance to event emissions**

```typescript
// When emitting worker events, include instance info:
embeddedPiDaemon.appendWorkerEvent(projectRoot, worker.id, {
  kind: 'worker.spawned',
  title: `${worker.displayName} started`,
  detail: `Agent working on task ${taskId}`,
  status: 'working',
  metadata: {
    workerId: worker.id,
    agentInstanceId: worker.agentInstanceId,
    agentTypeId: worker.agentTypeId,
    displayName: worker.displayName,
    taskId,
  },
});
```

**Step 5: Commit**

```bash
git add src/lib/worker-session-manager.ts
git commit -m "feat: track agent instances with numbered display names"
```

---

### Task 7: Create Agent Status Panel

**Files:**
- Create: `src/components/agents/agent-status-panel.tsx`

**Step 1: Define AgentStatusPanel component**

```typescript
// src/components/agents/agent-status-panel.tsx
'use client';

import { useEffect, useState } from 'react';
import { AgentInstance, type AgentStatus } from '../../lib/agent-instance';

interface AgentStatusPanelProps {
  projectRoot: string;
}

export function AgentStatusPanel({ projectRoot }: AgentStatusPanelProps) {
  const [status, setStatus] = useState<AgentStatus | null>(null);

  useEffect(() => {
    // Poll for agent status updates
    const poll = setInterval(async () => {
      const res = await fetch(`/api/runtime/agents?projectRoot=${encodeURIComponent(projectRoot)}`);
      const data = await res.json();
      if (data.ok) setStatus(data.status);
    }, 2000);
    return () => clearInterval(poll);
  }, [projectRoot]);

  if (!status) return <div className="text-[var(--text-tertiary)]">Loading agents...</div>;

  return (
    <div className="space-y-3">
      {/* Active Agents Section */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          Active Agents ({status.totalActive})
        </h3>
        
        {status.instances.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] italic">No active agents</p>
        ) : (
          <div className="space-y-2">
            {status.instances.map(instance => (
              <AgentInstanceCard key={instance.id} instance={instance} />
            ))}
          </div>
        )}
      </div>

      {/* Available Agents Section */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          Available Agents
        </h3>
        <AgentTypeList byType={status.byType} />
      </div>
    </div>
  );
}

function AgentInstanceCard({ instance }: { instance: AgentInstance }) {
  const statusColors = {
    spawning: 'bg-yellow-500',
    working: 'bg-cyan-500',
    idle: 'bg-gray-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded bg-[var(--surface-quaternary)]">
      <div className={`w-2 h-2 rounded-full ${statusColors[instance.status]}`} />
      <span className="text-sm font-medium">{instance.displayName}</span>
      {instance.currentBeadId && (
        <span className="text-xs text-[var(--text-tertiary)]">
          → {instance.currentBeadId}
        </span>
      )}
    </div>
  );
}
```

**Step 2: Create API endpoint for agent status**

```typescript
// src/app/api/runtime/agents/route.ts
import { NextResponse } from 'next/server';
import { workerSessionManager } from '../../../../lib/worker-session-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');
  
  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot required' });
  }

  const workers = workerSessionManager.listWorkers(projectRoot);
  
  const instances = workers.map(w => ({
    id: w.agentInstanceId,
    agentTypeId: w.agentTypeId,
    displayName: w.displayName,
    status: w.status,
    currentBeadId: w.currentBeadId,
    startedAt: w.createdAt,
  }));

  const byType: Record<string, number> = {};
  for (const w of workers) {
    byType[w.agentTypeId] = (byType[w.agentTypeId] || 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    status: {
      totalActive: workers.length,
      byType,
      instances,
    },
  });
}
```

**Step 3: Commit**

```bash
git add src/components/agents/ src/app/api/runtime/agents/
git commit -m "feat: add agent status panel and API"
```

---

## Orchestrator Behavior

### Task 8: Update System Prompt for Agent-Based Thinking

**Files:**
- Modify: `src/tui/system-prompt.ts` - update orchestrator prompt

**Step 1: Update the prompt template**

```typescript
// Add this section to the system prompt:

## Agent System

You can spawn agent workers to accomplish tasks in parallel. Agents are typed workers with specific capabilities:

- **architect**: System design, work decomposition, technical decisions
- **engineer**: Implementation, coding, testing, debugging
- **reviewer**: Code review, quality analysis (read-only, does not modify code)
- **tester**: Test design and implementation
- **investigator**: Debugging, root cause analysis (read-only unless implementing fix)
- **shipper**: Deployment, CI/CD, release management

### Spawning Agents

Use `bb_spawn_worker` to spawn an agent for a specific task/bead. You can spawn multiple agents in parallel.

### Agent Instances

When you spawn an agent, it gets a numbered instance (e.g., "Engineer 01", "Engineer 02"). The right panel shows all active agent instances with their status.

### Templates

Templates are named compositions of agents:
- **feature-dev**: architect + 2x engineer + reviewer + tester
- **bug-fix**: investigator + engineer + tester
- **greenfield**: architect + 3x engineer + tester + shipper

Use templates for large efforts (epics). For small tasks, spawn individual agents directly.

### Deviation

If you modify or ignore a template, use `bb_record_deviation` to explain why.
```

**Step 2: Commit**

```bash
git add src/tui/system-prompt.ts
git commit -m "feat: update orchestrator prompt for agent-based thinking"
```

---

### Task 9: Add Template Selection Tool

**Files:**
- Create: `src/tui/tools/bb-spawn-template.ts`

**Step 1: Create spawn-template tool**

```typescript
import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { getTemplates } from '../../lib/server/beads-fs';
import { workerSessionManager } from '../../lib/worker-session-manager';

export function createSpawnTemplateTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_spawn_template',
    label: 'Spawn Template Team',
    description: 'Spawn a team of agents based on a template. Creates an epic with beads assigned to appropriate agent types. Use for larger efforts.',
    parameters: Type.Object({
      template_id: Type.String({ description: 'Template ID to use (e.g., "feature-dev", "bug-fix", "greenfield", "full-squad")' }),
      epic_title: Type.String({ description: 'Title for the epic/task being worked on' }),
      epic_description: Type.Optional(Type.String({ description: 'Detailed description of what needs to be done' })),
    }),
    async execute(_toolCallId, params) {
      const { template_id, epic_title, epic_description } = params;

      // Load template
      const templates = await getTemplates(projectRoot);
      const template = templates.find(t => t.id === template_id);
      
      if (!template) {
        return {
          content: [{ type: 'text', text: `Template "${template_id}" not found. Available: ${templates.map(t => t.id).join(', ')}` }],
          isError: true,
        };
      }

      // For each agent in template, spawn a worker
      const spawned = [];
      for (const member of template.team) {
        for (let i = 0; i < member.count; i++) {
          const worker = await workerSessionManager.spawnWorker({
            projectRoot,
            taskId: `${epic_title}-${member.archetypeId}-${i+1}`,
            taskContext: epic_description || `Part of ${epic_title} using ${template.name} template`,
            archetype: member.archetypeId,
          });
          spawned.push(worker);
        }
      }

      return {
        content: [{
          type: 'text',
          text: `Spawned ${spawned.length} agents from template "${template.name}"!\n\n` +
            template.team.map(m => `- ${m.count}x ${m.archetypeId}`).join('\n') + '\n\n' +
            `Active agents: ${spawned.map(s => s.displayName).join(', ')}`
        }],
        details: { template, spawned: spawned.map(s => ({ id: s.id, displayName: s.displayName })) },
      };
    },
  };
}
```

**Step 2: Register in pi-daemon-adapter.ts**

```typescript
import { createSpawnTemplateTool } from '../tui/tools/bb-spawn-template';

// In createTools():
tools.push({ tool: createSpawnTemplateTool(projectRoot) });
```

**Step 3: Commit**

```bash
git add src/tui/tools/bb-spawn-template.ts src/lib/pi-daemon-adapter.ts
git commit -m "feat: add template spawning tool"
```

---

### Task 10: Integration Tests

**Files:**
- Create: `tests/integration/agent-spawning.test.ts`

**Step 1: Write integration test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Agent Spawning', () => {
  const projectRoot = process.cwd();

  it('spawns agent with correct instance ID', async () => {
    const { workerSessionManager } = await import('../../src/lib/worker-session-manager');
    
    const worker = await workerSessionManager.spawnWorker({
      projectRoot,
      taskId: 'test-task-1',
      taskContext: 'Test task',
      archetype: 'engineer',
    });

    expect(worker.displayName).toMatch(/Engineer \d+/);
    expect(worker.agentTypeId).toBe('engineer');
    expect(worker.agentInstanceId).toBeDefined();
  });

  it('numbers instances correctly', async () => {
    const { workerSessionManager } = await import('../../src/lib/worker-session-manager');
    
    // Spawn 3 engineers
    const workers = [];
    for (let i = 0; i < 3; i++) {
      workers.push(await workerSessionManager.spawnWorker({
        projectRoot,
        taskId: `test-task-${i}`,
        taskContext: 'Test',
        archetype: 'engineer',
      }));
    }

    // Check numbering
    const engineerWorkers = workers.filter(w => w.agentTypeId === 'engineer');
    const numbers = engineerWorkers.map(w => w.displayName);
    expect(numbers).toContain('Engineer 01');
    expect(numbers).toContain('Engineer 02');
    expect(numbers).toContain('Engineer 03');
  });

  it('spawns from template', async () => {
    const { workerSessionManager } = await import('../../src/lib/worker-session-manager');
    const { getTemplates } = await import('../../src/lib/server/beads-fs');
    
    const templates = await getTemplates(projectRoot);
    const featureDev = templates.find(t => t.id === 'feature-dev');
    
    expect(featureDev).toBeDefined();
    // Should spawn 5 agents: 1 architect + 2 engineer + 1 reviewer + 1 tester
    expect(featureDev.team.reduce((sum, m) => sum + m.count, 0)).toBe(5);
  });
});
```

**Step 2: Run tests**

```bash
cd /home/clawdbot/clawd/repos/beadboard && npx vitest run tests/integration/agent-spawning.test.ts
```

**Step 3: Commit**

```bash
git add tests/integration/agent-spawning.test.ts
git commit -m "test: add agent spawning integration tests"
```

---

## Agent-Bead Relationship

### Task 11: Add Agent Assignment to Beads

**Files:**
- Modify: `src/lib/types.ts` - add `agentTypeId` to BeadIssue
- Modify: `src/lib/server/beads-fs.ts` - update bead creation/queries
- Create: `src/tui/tools/bb-assign-agent.ts` - assign agent to bead
- Modify: `src/components/social/social-card.tsx` - show agent badge

**Step 1: Add agentTypeId to BeadIssue type**

```typescript
// src/lib/types.ts - in BeadIssue interface
export interface BeadIssue {
  // ... existing fields
  agentTypeId?: string;        // Which agent type is assigned
  agentInstanceId?: string;    // Which specific instance (if running)
}
```

**Step 2: Create bb_assign_agent tool**

```typescript
// src/tui/tools/bb-assign-agent.ts
import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';

export function createAssignAgentTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_assign_agent',
    label: 'Assign Agent to Bead',
    description: 'Assign an agent type to a bead. This signals which kind of agent should work on this task.',
    parameters: Type.Object({
      bead_id: Type.String({ description: 'Bead ID to assign agent to' }),
      agent_type: Type.String({ description: 'Agent type ID (e.g., "engineer", "architect", "reviewer")' }),
    }),
    async execute(_toolCallId, params) {
      const { bead_id, agent_type } = params;

      // Update bead with agent type
      // This writes to .beads/issues.jsonl via the beads system
      
      return {
        content: [{
          type: 'text',
          text: `Assigned ${agent_type} to bead ${bead_id}. When an agent of this type is spawned, it will pick up this bead.`,
        }],
        details: { bead_id, agent_type },
      };
    },
  };
}
```

**Step 3: Update social card to show agent badge**

```typescript
// In social-card.tsx, add agent badge display
{issue.agentTypeId && (
  <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
       style={{ backgroundColor: `${agentColor}20`, color: agentColor }}>
    <span className="font-medium">{issue.agentTypeId}</span>
  </div>
)}
```

**Step 4: Commit**

```bash
git add src/lib/types.ts src/tui/tools/bb-assign-agent.ts src/components/social/
git commit -m "feat: add agent assignment to beads"
```

---

## Orchestrator Decision Logic

### Task 12: Implement Orchestrator Decision Tree

**Files:**
- Modify: `src/tui/system-prompt.ts` - add decision tree to prompt
- Modify: `src/tui/tools/bb-spawn-worker.ts` - add scope analysis hint

**Step 1: Add decision tree to system prompt**

```typescript
// In system-prompt.ts, add this section:

## Task Scope Decision Tree

Before spawning agents, assess task scope:

### Small Task (Single Agent)
- Bug fix with known cause
- Single file change
- Quick refactor
- Single test addition

**Action:** Spawn 1 agent directly. Example: `bb_spawn_worker` with `archetype: "engineer"`

### Medium Task (2-3 Agents)
- Feature with clear design
- Bug investigation + fix
- Code review + fixes

**Action:** Spawn 2-3 agents based on template or custom composition.

### Large Task (Use Template)
- New feature from scratch
- System redesign
- Multi-component changes

**Action:** Use `bb_spawn_template` with appropriate template:
- `feature-dev` for new features
- `bug-fix` for debugging issues
- `greenfield` for new projects
- `full-squad` for complex multi-domain work

### Epic Creation
If the task requires multiple beads with dependencies:
1. Use `bb_create_epic` to create the epic
2. Use `bb_create` to create child beads
3. Assign agent types to each bead with `bb_assign_agent`
4. Spawn agents to work on unblocked beads

**Example Flow:**
```
User: "Build user authentication system"

Orchestrator:
1. "This is a large task. Creating epic 'User Authentication'."
2. Creates epic + decomposes into beads:
   - BEAD-001: Design auth schema [architect]
   - BEAD-002: Implement JWT service [engineer]
   - BEAD-003: Implement refresh tokens [engineer]
   - BEAD-004: Write auth tests [tester]
   - BEAD-005: Review implementation [reviewer]
3. Spawns Architect 01 to start on BEAD-001
4. When BEAD-001 done, spawns Engineer 01 and 02 for BEAD-002 and BEAD-003
5. And so on...
```
```

**Step 2: Commit**

```bash
git add src/tui/system-prompt.ts
git commit -m "feat: add orchestrator decision tree for agent spawning"
```

---

## Right Panel Integration

### Task 13: Wire Agent Panel into Right Panel

**Files:**
- Modify: `src/components/shared/right-panel.tsx` - add agents tab
- Modify: `src/components/activity/contextual-right-panel.tsx` - include agent status
- Modify: `src/hooks/use-url-state.ts` - add agents tab state

**Step 1: Add agents tab to right panel**

```typescript
// In right-panel.tsx, add tab system
const TABS = ['details', 'agents', 'activity'] as const;
type RightPanelTab = typeof TABS[number];

export function RightPanel({ issues, selectedTask, ... }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('details');

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--border-subtle)]">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm ${
              activeTab === tab 
                ? 'border-b-2 border-cyan-500 text-[var(--text-primary)]' 
                : 'text-[var(--text-tertiary)]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'details' && <TaskDetails task={selectedTask} />}
        {activeTab === 'agents' && <AgentStatusPanel projectRoot={projectRoot} />}
        {activeTab === 'activity' && <ActivityFeed />}
      </div>
    </div>
  );
}
```

**Step 2: Update ContextualRightPanel**

```typescript
// Include AgentStatusPanel when showing swarm/epic context
{contextType === 'swarm' && (
  <div className="space-y-4">
    <AgentStatusPanel projectRoot={projectRoot} />
    {/* ... other swarm context */}
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/components/shared/right-panel.tsx src/components/activity/contextual-right-panel.tsx
git commit -m "feat: wire agent status panel into right panel tabs"
```

---

## Agent State Persistence

### Task 14: Persist Agent Instances to Disk

**Files:**
- Create: `src/lib/agent-persistence.ts`
- Modify: `src/lib/worker-session-manager.ts` - load/save on changes
- Create: `src/app/api/runtime/agents/history/route.ts`

**Step 1: Create persistence layer**

```typescript
// src/lib/agent-persistence.ts
import fs from 'fs/promises';
import path from 'path';
import type { AgentInstance } from './agent-instance';

const AGENTS_FILE = (projectRoot: string) => path.join(projectRoot, '.beads', 'agents.jsonl');

export async function loadAgentInstances(projectRoot: string): Promise<AgentInstance[]> {
  try {
    const content = await fs.readFile(AGENTS_FILE(projectRoot), 'utf-8');
    return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

export async function saveAgentInstance(projectRoot: string, instance: AgentInstance): Promise<void> {
  const line = JSON.stringify(instance) + '\n';
  await fs.appendFile(AGENTS_FILE(projectRoot), line, 'utf-8');
}

export async function updateAgentInstance(projectRoot: string, instance: AgentInstance): Promise<void> {
  // Load all, update the matching one, rewrite
  const instances = await loadAgentInstances(projectRoot);
  const idx = instances.findIndex(i => i.id === instance.id);
  if (idx >= 0) {
    instances[idx] = instance;
    await fs.writeFile(
      AGENTS_FILE(projectRoot),
      instances.map(i => JSON.stringify(i)).join('\n') + '\n',
      'utf-8'
    );
  }
}

export async function getActiveInstances(projectRoot: string): Promise<AgentInstance[]> {
  const all = await loadAgentInstances(projectRoot);
  return all.filter(i => i.status === 'working' || i.status === 'spawning' || i.status === 'idle');
}

export async function getRecentInstances(projectRoot: string, limit = 20): Promise<AgentInstance[]> {
  const all = await loadAgentInstances(projectRoot);
  return all
    .filter(i => i.status === 'completed' || i.status === 'failed')
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    .slice(0, limit);
}
```

**Step 2: Integrate with worker-session-manager**

```typescript
// In worker-session-manager.ts
import { saveAgentInstance, updateAgentInstance } from './agent-persistence';

// After spawning worker:
await saveAgentInstance(projectRoot, {
  id: worker.agentInstanceId,
  agentTypeId: worker.agentTypeId,
  displayName: worker.displayName,
  status: worker.status,
  startedAt: worker.createdAt,
});

// On status change:
await updateAgentInstance(projectRoot, instance);
```

**Step 3: Create history API endpoint**

```typescript
// src/app/api/runtime/agents/history/route.ts
import { NextResponse } from 'next/server';
import { getRecentInstances } from '../../../../../lib/agent-persistence';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');
  
  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot required' });
  }

  const recent = await getRecentInstances(projectRoot, 50);
  return NextResponse.json({ ok: true, instances: recent });
}
```

**Step 4: Commit**

```bash
git add src/lib/agent-persistence.ts src/lib/worker-session-manager.ts src/app/api/runtime/agents/history/
git commit -m "feat: persist agent instances to disk"
```

---

## Agent History

### Task 15: Show Completed Agents in Panel

**Files:**
- Modify: `src/components/agents/agent-status-panel.tsx` - add history section
- Create: `src/components/agents/agent-history-list.tsx`

**Step 1: Add history section to AgentStatusPanel**

```typescript
// In agent-status-panel.tsx, add after active agents:

const [history, setHistory] = useState<AgentInstance[]>([]);

// Load history
useEffect(() => {
  const loadHistory = async () => {
    const res = await fetch(`/api/runtime/agents/history?projectRoot=${encodeURIComponent(projectRoot)}`);
    const data = await res.json();
    if (data.ok) setHistory(data.instances);
  };
  loadHistory();
  const interval = setInterval(loadHistory, 10000);
  return () => clearInterval(interval);
}, [projectRoot]);

// In render:
<div>
  <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
    Recent Completions ({history.length})
  </h3>
  <div className="space-y-1 max-h-40 overflow-auto">
    {history.slice(0, 10).map(instance => (
      <div key={instance.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-[var(--surface-tertiary)]">
        <span className={instance.status === 'completed' ? 'text-green-400' : 'text-red-400'}>
          {instance.status === 'completed' ? '✓' : '✗'}
        </span>
        <span className="font-medium">{instance.displayName}</span>
        {instance.currentBeadId && (
          <span className="text-[var(--text-tertiary)]">→ {instance.currentBeadId}</span>
        )}
      </div>
    ))}
  </div>
</div>
```

**Step 2: Commit**

```bash
git add src/components/agents/
git commit -m "feat: show completed agent history in status panel"
```

---

## Updated Files Summary

| File | Action |
|------|--------|
| **Rename (Tasks 1-4)** ||
| `src/lib/types-swarm.ts` | Modify: rename AgentArchetype → AgentType |
| `src/lib/server/beads-fs.ts` | Modify: rename getArchetypes → getAgentTypes |
| `src/tui/tools/bb-list-agents.ts` | Create (rename from bb-list-archetypes) |
| `src/tui/tools/bb-create-agent.ts` | Create (rename) |
| `src/tui/tools/bb-update-agent.ts` | Create (rename) |
| `src/tui/tools/bb-delete-agent.ts` | Create (rename) |
| `src/tui/tools/bb-list-archetypes.ts` | Delete |
| `src/tui/tools/bb-create-archetype.ts` | Delete |
| `src/tui/tools/bb-update-archetype.ts` | Delete |
| `src/tui/tools/bb-delete-archetype.ts` | Delete |
| `src/lib/pi-daemon-adapter.ts` | Modify: update imports |
| `src/components/swarm/agent-inspector.tsx` | Create (rename) |
| `src/components/swarm/archetype-inspector.tsx` | Delete |
| **Agent Instances (Tasks 5-7)** ||
| `src/lib/agent-instance.ts` | Create |
| `src/lib/worker-session-manager.ts` | Modify: add instance tracking |
| `src/components/agents/agent-status-panel.tsx` | Create |
| `src/app/api/runtime/agents/route.ts` | Create |
| **Orchestrator (Tasks 8-9)** ||
| `src/tui/system-prompt.ts` | Modify: update prompt + decision tree |
| `src/tui/tools/bb-spawn-template.ts` | Create |
| `src/tui/tools/bb-spawn-worker.ts` | Modify: update descriptions |
| **Tests (Task 10)** ||
| `tests/integration/agent-spawning.test.ts` | Create |
| **Agent-Bead (Task 11)** ||
| `src/lib/types.ts` | Modify: add agentTypeId to BeadIssue |
| `src/tui/tools/bb-assign-agent.ts` | Create |
| `src/components/social/social-card.tsx` | Modify: show agent badge |
| **Decision Tree (Task 12)** ||
| (included in Task 8) | |
| **Right Panel (Task 13)** ||
| `src/components/shared/right-panel.tsx` | Modify: add agents tab |
| `src/components/activity/contextual-right-panel.tsx` | Modify: include agents |
| **Persistence (Task 14)** ||
| `src/lib/agent-persistence.ts` | Create |
| `src/app/api/runtime/agents/history/route.ts` | Create |
| **History (Task 15)** ||
| `src/components/agents/agent-history-list.tsx` | Create |

**Total: 26 files (14 create, 10 modify, 5 delete)**

---

## Estimated Effort

**10-12 hours**

| Phase | Tasks | Effort |
|-------|-------|--------|
| Rename | 1-4 | 2h |
| Agent Instances | 5-7 | 2h |
| Orchestrator | 8-9 | 1.5h |
| Tests | 10 | 1h |
| Agent-Bead | 11 | 1.5h |
| Decision Tree | 12 | 0.5h |
| Right Panel | 13 | 1h |
| Persistence | 14 | 1.5h |
| History | 15 | 1h |

---

## Success Criteria

- [ ] "Archetype" renamed to "Agent" in all user-facing text
- [ ] Agent tools work: list, create, update, delete
- [ ] Spawning a worker creates numbered instance (Engineer 01, etc.)
- [ ] Right panel has Agents tab showing active + history
- [ ] Template spawning spawns correct number of agents
- [ ] Orchestrator uses decision tree for scope assessment
- [ ] Beads can have agentTypeId assigned
- [ ] Agent instances persist across restarts
- [ ] History shows recent completions
- [ ] Tests pass

---

## Plan Complete

**Saved to:** `docs/plans/2026-03-07-phase-3-agent-orchestration.md`

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
