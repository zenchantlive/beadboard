# Phase 2: Archetype Execution Configs

**Date:** 2026-03-06
**Status:** Ready for implementation
**PRD Reference:** `docs/plans/2026-03-05-embedded-pi-prd.md`
**Depends on:** Phase 1 (Worker Spawning) ✅

---

## Goal

1. Link existing archetype system to worker behavior
2. Give orchestrator CRUD tools for archetypes and templates

---

## Current State

- **Frontend** has full archetype system:
  - Schema: `AgentArchetype` with `id`, `name`, `systemPrompt`, `capabilities[]`, `color`
  - Storage: `.beads/archetypes/*.json`
  - UI: `archetype-inspector.tsx` for create/edit/clone
  - Seed archetypes: architect, coder, reviewer, tester, researcher
- **Templates** also exist:
  - Schema: `SwarmTemplate` with `team: { archetypeId, count }[]`
  - Storage: `.beads/templates/*.json`
- **Backend** (`beads-fs.ts`) has all CRUD functions
- **Worker spawning** passes `archetype` but doesn't use it
- **Orchestrator** has NO tools to manage archetypes/templates

---

## Target State

- Orchestrator can CRUD archetypes and templates via tools
- Workers load archetype config and behave accordingly:
  - `capabilities` → which tools worker gets
  - `systemPrompt` → injected into worker prompt

---

## Capability → Tool Mapping

| Capability | Tools Granted |
|------------|---------------|
| `coding`, `implementation` | read, bash, edit, write, dolt-read |
| `planning`, `design_docs` | read, dolt-read (read-only) |
| `review`, `arch_review` | read, dolt-read (read-only) |
| `testing` | read, bash, edit, write, dolt-read |
| `research` | read, dolt-read, bash (limited) |
| All others | read, dolt-read (default read-only) |

**Rule:** If `capabilities` includes `coding` or `implementation` or `testing` → full tools. Otherwise → read-only.

---

## Implementation

### Task 1: Create Archetype CRUD Tools

**File:** `src/tui/tools/bb-list-archetypes.ts`

```typescript
import { createTool } from '@mariozechner/pi-coding-agent';
import { getArchetypes } from '../../lib/server/beads-fs';

export function bbListArchetypes(projectRoot: string) {
  return createTool('bb_list_archetypes', {
    description: 'List all available archetypes. Returns id, name, description, capabilities for each.',
    parameters: {},
    handler: async () => {
      const archetypes = await getArchetypes();
      return {
        archetypes: archetypes.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          capabilities: a.capabilities,
          color: a.color,
          isBuiltIn: a.isBuiltIn,
        })),
      };
    },
  });
}
```

**File:** `src/tui/tools/bb-create-archetype.ts`

```typescript
import { createTool } from '@mariozechner/pi-coding-agent';
import { saveArchetype } from '../../lib/server/beads-fs';
import { z } from 'zod';

export function bbCreateArchetype(projectRoot: string) {
  return createTool('bb_create_archetype', {
    description: 'Create a new archetype. Requires name, description, systemPrompt, capabilities, color.',
    parameters: z.object({
      name: z.string().describe('Display name for the archetype'),
      description: z.string().describe('What this archetype does'),
      systemPrompt: z.string().describe('System prompt injected into workers with this archetype'),
      capabilities: z.array(z.string()).describe('List of capabilities (e.g., ["coding", "testing"])'),
      color: z.string().default('#3b82f6').describe('Hex color for display'),
    }),
    handler: async (params) => {
      const archetype = await saveArchetype({
        name: params.name,
        description: params.description,
        systemPrompt: params.systemPrompt,
        capabilities: params.capabilities,
        color: params.color,
        isBuiltIn: false,
      });
      return { ok: true, archetype };
    },
  });
}
```

**File:** `src/tui/tools/bb-update-archetype.ts`

```typescript
import { createTool } from '@mariozechner/pi-coding-agent';
import { saveArchetype } from '../../lib/server/beads-fs';
import { z } from 'zod';

export function bbUpdateArchetype(projectRoot: string) {
  return createTool('bb_update_archetype', {
    description: 'Update an existing archetype. Cannot modify built-in archetypes.',
    parameters: z.object({
      id: z.string().describe('Archetype ID to update'),
      name: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
      systemPrompt: z.string().optional().describe('New system prompt'),
      capabilities: z.array(z.string()).optional().describe('New capabilities list'),
      color: z.string().optional().describe('New hex color'),
    }),
    handler: async (params) => {
      const archetype = await saveArchetype({
        id: params.id,
        name: params.name ?? '',
        description: params.description ?? '',
        systemPrompt: params.systemPrompt ?? '',
        capabilities: params.capabilities ?? [],
        color: params.color ?? '#3b82f6',
      });
      return { ok: true, archetype };
    },
  });
}
```

**File:** `src/tui/tools/bb-delete-archetype.ts`

```typescript
import { createTool } from '@mariozechner/pi-coding-agent';
import { deleteArchetype } from '../../lib/server/beads-fs';
import { z } from 'zod';

export function bbDeleteArchetype(projectRoot: string) {
  return createTool('bb_delete_archetype', {
    description: 'Delete an archetype. Cannot delete built-in archetypes.',
    parameters: z.object({
      id: z.string().describe('Archetype ID to delete'),
    }),
    handler: async (params) => {
      await deleteArchetype(params.id);
      return { ok: true, deletedId: params.id };
    },
  });
}
```

---

### Task 2: Create Template CRUD Tools

**File:** `src/tui/tools/bb-list-templates.ts`

```typescript
import { createTool } from '@mariozechner/pi-coding-agent';
import { getTemplates } from '../../lib/server/beads-fs';

export function bbListTemplates(projectRoot: string) {
  return createTool('bb_list_templates', {
    description: 'List all swarm templates. Returns team composition for each.',
    parameters: {},
    handler: async () => {
      const templates = await getTemplates();
      return {
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          team: t.team,
          isBuiltIn: t.isBuiltIn,
        })),
      };
    },
  });
}
```

**File:** `src/tui/tools/bb-create-template.ts`

```typescript
import { createTool } from '@mariozechner/pi-coding-agent';
import { saveTemplate } from '../../lib/server/beads-fs';
import { z } from 'zod';

export function bbCreateTemplate(projectRoot: string) {
  return createTool('bb_create_template', {
    description: 'Create a new swarm template. Defines team composition by archetype.',
    parameters: z.object({
      name: z.string().describe('Display name for the template'),
      description: z.string().describe('What this template is for'),
      team: z.array(z.object({
        archetypeId: z.string().describe('Archetype ID'),
        count: z.number().describe('Number of workers with this archetype'),
      })).describe('Team composition'),
      color: z.string().default('#f59e0b').describe('Hex color for display'),
    }),
    handler: async (params) => {
      const template = await saveTemplate({
        name: params.name,
        description: params.description,
        team: params.team,
        color: params.color,
        isBuiltIn: false,
      });
      return { ok: true, template };
    },
  });
}
```

**File:** `src/tui/tools/bb-update-template.ts`

```typescript
import { createTool } from '@mariozechner/pi-coding-agent';
import { saveTemplate } from '../../lib/server/beads-fs';
import { z } from 'zod';

export function bbUpdateTemplate(projectRoot: string) {
  return createTool('bb_update_template', {
    description: 'Update an existing swarm template.',
    parameters: z.object({
      id: z.string().describe('Template ID to update'),
      name: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
      team: z.array(z.object({
        archetypeId: z.string(),
        count: z.number(),
      })).optional().describe('New team composition'),
      color: z.string().optional().describe('New hex color'),
    }),
    handler: async (params) => {
      const template = await saveTemplate({
        id: params.id,
        name: params.name ?? '',
        description: params.description ?? '',
        team: params.team ?? [],
        color: params.color ?? '#f59e0b',
      });
      return { ok: true, template };
    },
  });
}
```

**File:** `src/tui/tools/bb-delete-template.ts`

```typescript
import { createTool } from '@mariozechner/pi-coding-agent';
import { deleteTemplate } from '../../lib/server/beads-fs';
import { z } from 'zod';

export function bbDeleteTemplate(projectRoot: string) {
  return createTool('bb_delete_template', {
    description: 'Delete a swarm template. Cannot delete built-in templates.',
    parameters: z.object({
      id: z.string().describe('Template ID to delete'),
    }),
    handler: async (params) => {
      await deleteTemplate(params.id);
      return { ok: true, deletedId: params.id };
    },
  });
}
```

---

### Task 3: Link Archetype to Worker Behavior

**File:** `src/lib/worker-session-manager.ts`

**Changes:**

1. Import archetype loading:
```typescript
import { getArchetypes, type AgentArchetype } from './server/beads-fs';
```

2. Add capability → tool mapping:
```typescript
function getToolsForCapabilities(capabilities: string[]): {
  allowEdit: boolean;
  allowWrite: boolean;
  allowBash: boolean;
} {
  const fullAccess = ['coding', 'implementation', 'testing'];
  const hasFullAccess = capabilities.some(c => fullAccess.includes(c));

  if (hasFullAccess) {
    return { allowEdit: true, allowWrite: true, allowBash: true };
  }

  // Read-only for planning, review, research
  return { allowEdit: false, allowWrite: false, allowBash: false };
}
```

3. Load archetype in `createWorkerSession`:
```typescript
async createWorkerSession(
  worker: WorkerInfo,
  taskContext: string,
  archetypeId?: string
): Promise<void> {
  // Load archetype config
  let archetype: AgentArchetype | undefined;
  if (archetypeId) {
    const archetypes = await getArchetypes();
    archetype = archetypes.find(a => a.id === archetypeId);
  }

  const capabilities = archetype?.capabilities ?? [];
  const toolAccess = getToolsForCapabilities(capabilities);

  // Build tools based on capabilities
  const tools = [];
  tools.push(this.sdk.createReadTool(this.projectRoot));
  tools.push(this.sdk.createMailboxTool(this.projectRoot));
  tools.push(this.sdk.createPresenceTool(this.projectRoot));

  if (toolAccess.allowBash) {
    tools.push(this.sdk.createBashTool(this.projectRoot));
  }
  if (toolAccess.allowEdit) {
    tools.push(this.sdk.createEditTool(this.projectRoot));
  }
  if (toolAccess.allowWrite) {
    tools.push(this.sdk.createWriteTool(this.projectRoot));
  }

  // Always allow dolt-read for context
  const { createDoltReadTool } = await import('../tui/tools/bb-dolt-read');
  tools.push(createDoltReadTool(this.projectRoot));

  // Build prompt with archetype system prompt
  const systemPrompt = this.buildWorkerPrompt(
    worker.taskId,
    taskContext,
    archetype?.systemPrompt
  );

  // ... rest of session creation
}
```

4. Update `buildWorkerPrompt` to accept optional archetype prompt:
```typescript
buildWorkerPrompt(taskId: string, taskContext: string, archetypePrompt?: string): string {
  return `You are a BeadBoard worker agent.

Task ID: ${taskId}

${taskContext}

${archetypePrompt ? `## Your Specialization\n\n${archetypePrompt}` : ''}

## Instructions

Complete your assigned task. Report progress. Ask for help if blocked.
`;
}
```

---

### Task 4: Register Tools in Orchestrator

**File:** `src/lib/pi-daemon-adapter.ts`

**Changes:**

Add imports and register tools:
```typescript
import { bbListArchetypes } from '../tui/tools/bb-list-archetypes';
import { bbCreateArchetype } from '../tui/tools/bb-create-archetype';
import { bbUpdateArchetype } from '../tui/tools/bb-update-archetype';
import { bbDeleteArchetype } from '../tui/tools/bb-delete-archetype';
import { bbListTemplates } from '../tui/tools/bb-list-templates';
import { bbCreateTemplate } from '../tui/tools/bb-create-template';
import { bbUpdateTemplate } from '../tui/tools/bb-update-template';
import { bbDeleteTemplate } from '../tui/tools/bb-delete-template';

// In createTools():
tools.push(
  bbListArchetypes(this.projectRoot),
  bbCreateArchetype(this.projectRoot),
  bbUpdateArchetype(this.projectRoot),
  bbDeleteArchetype(this.projectRoot),
  bbListTemplates(this.projectRoot),
  bbCreateTemplate(this.projectRoot),
  bbUpdateTemplate(this.projectRoot),
  bbDeleteTemplate(this.projectRoot),
);
```

---

### Task 5: Tests

**File:** `tests/tui/tools/bb-archetype-crud.test.ts`

Test:
- List archetypes returns seed data
- Create archetype saves to `.beads/archetypes/`
- Update archetype modifies file
- Delete archetype removes file
- Cannot delete built-in archetypes

**File:** `tests/tui/tools/bb-template-crud.test.ts`

Test:
- List templates returns seed data
- Create template saves to `.beads/templates/`
- Update template modifies file
- Delete template removes file
- Cannot delete built-in templates

**File:** `tests/lib/worker-session-manager.test.ts`

Test:
- Coder archetype gets full tools
- Reviewer archetype gets read-only tools
- Unknown archetype defaults to read-only
- Archetype prompt injected into system prompt

---

## Files Summary

| File | Action |
|------|--------|
| `src/tui/tools/bb-list-archetypes.ts` | Create |
| `src/tui/tools/bb-create-archetype.ts` | Create |
| `src/tui/tools/bb-update-archetype.ts` | Create |
| `src/tui/tools/bb-delete-archetype.ts` | Create |
| `src/tui/tools/bb-list-templates.ts` | Create |
| `src/tui/tools/bb-create-template.ts` | Create |
| `src/tui/tools/bb-update-template.ts` | Create |
| `src/tui/tools/bb-delete-template.ts` | Create |
| `src/lib/worker-session-manager.ts` | Edit |
| `src/lib/pi-daemon-adapter.ts` | Edit |
| `tests/tui/tools/bb-archetype-crud.test.ts` | Create |
| `tests/tui/tools/bb-template-crud.test.ts` | Create |
| `tests/lib/worker-session-manager.test.ts` | Create |

---

## Estimated Effort

2-3 hours

---

## Success Criteria

- [ ] Orchestrator can list/create/update/delete archetypes
- [ ] Orchestrator can list/create/update/delete templates
- [ ] Worker with coder archetype gets edit/write/bash tools
- [ ] Worker with reviewer archetype gets read-only tools
- [ ] Archetype systemPrompt injected into worker prompt
- [ ] All tests pass

---

## Future Enhancements (Not Now)

- Fine-grained capability → tool mapping config
- Custom tool sets per archetype
- Model selection per archetype
- Archetype inheritance
