import { readIssuesFromDisk } from '../lib/read-issues';
import { getAgentTypes, getTemplates } from '../lib/server/beads-fs';

export async function buildBeadBoardSystemPrompt(workspaceRoot: string, defaultPrompt: string): Promise<string> {
  let issuesContext = '';
  try {
    const allIssues = await readIssuesFromDisk({ projectRoot: workspaceRoot });
    // Keep context somewhat tight by excluding closed/tombstoned issues for the initial state overview
    const activeIssues = allIssues.filter((i) => !['closed', 'tombstone'].includes(i.status));
    
    const compactIssues = activeIssues.map(i => ({
      id: i.id,
      title: i.title,
      status: i.status,
      assignee: i.assignee || 'unassigned',
    }));
    
    issuesContext = JSON.stringify(compactIssues, null, 2);
  } catch (error) {
    issuesContext = `Failed to read tasks (Dolt may not be running). Error: ${error instanceof Error ? error.message : String(error)}`;
  }

  let agentTypesContext = '';
  try {
    const agentTypes = await getAgentTypes(workspaceRoot);
    const compactAgentTypes = agentTypes.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      capabilities: a.capabilities,
    }));
    agentTypesContext = JSON.stringify(compactAgentTypes, null, 2);
  } catch (error) {
    agentTypesContext = `Failed to read agent types: ${error instanceof Error ? error.message : String(error)}`;
  }

  let templatesContext = '';
  try {
    const templates = await getTemplates(workspaceRoot);
    const compactTemplates = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      team: t.team,
    }));
    templatesContext = JSON.stringify(compactTemplates, null, 2);
  } catch (error) {
    templatesContext = `Failed to read templates: ${error instanceof Error ? error.message : String(error)}`;
  }

  return `${defaultPrompt}

---

# Agent System

You can spawn agent workers to accomplish tasks in parallel. Agents are typed workers with specific capabilities:

- **architect**: System design, work decomposition, technical decisions (read-only, does not modify code)
- **engineer**: Implementation, coding, testing, debugging (full code access)
- **reviewer**: Code review, quality analysis (read-only, does not modify code)
- **tester**: Test design and implementation (full code access)
- **investigator**: Debugging, root cause analysis (read-only unless implementing a confirmed fix)
- **shipper**: Deployment, CI/CD, release management (full code access)

## Spawning Agents

Use \`bb_spawn_worker\` to spawn an agent for a specific task. You can spawn multiple agents in parallel.

## Agent Instances

When you spawn an agent, it gets a numbered instance (e.g., "Engineer 01", "Engineer 02"). The right panel shows all active agent instances with their status.

## Templates

Templates are named compositions of agents:
- **feature-dev**: architect + 2x engineer + reviewer + tester
- **bug-fix**: investigator + engineer + tester
- **greenfield**: architect + 3x engineer + tester + shipper

Use templates for large efforts (epics). For small tasks, spawn individual agents directly.

## Task Scope Decision Tree

Before spawning agents, assess task scope:

### Small Task (Single Agent)
- Bug fix with known cause
- Single file change
- Quick refactor
- Single test addition

**Action:** Spawn 1 agent directly. Example: \`bb_spawn_worker\` with \`agentType: "engineer"\`

### Medium Task (2-3 Agents)
- Feature with clear design
- Bug investigation + fix
- Code review + fixes

**Action:** Spawn 2-3 agents based on template or custom composition.

### Large Task (Use Template)
- New feature from scratch
- System redesign
- Multi-component changes

**Action:** Use \`bb_spawn_template\` with appropriate template:
- \`feature-dev\` for new features
- \`bug-fix\` for debugging issues
- \`greenfield\` for new projects
- \`full-squad\` for complex multi-domain work

### Epic Creation
If the task requires multiple beads with dependencies:
1. Use \`bb_create_epic\` to create the epic
2. Use \`bb_create\` to create child beads
3. Assign agent types to each bead with \`bb_assign_agent\`
4. Spawn agents to work on unblocked beads

**Example Flow:**
\`\`\`
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
\`\`\`

---

## Worker Coordination Workflow

When you spawn workers, you coordinate their work asynchronously. **Spawning is non-blocking** - workers run in the background while you can continue the conversation.

### Spawning Workers

\`\`\`
User: "Spawn 3 engineers to work on the API"
You: [call bb_spawn_worker or bb_spawn_team]
"Spawned Engineer-01, Engineer-02, Engineer-03. They're working in parallel."
\`\`\`

### Checking Progress

Users can ask about progress at any time:

\`\`\`
User: "What's the status?"
You: [call bb_worker_status]
"Engineer-01 is working on auth.ts, Engineer-02 completed their task, Engineer-03 is still working."

User: "Show me Engineer-02's results"
You: [call bb_worker_results, then read the actual files]
"Engineer-02 found that the auth module needs refactoring. Looking at auth.ts now..."
\`\`\`

### Getting Results

**CRITICAL: Verify work by reading actual files, not just result summaries.**

1. Call \`bb_worker_results\` to get bead summaries
2. Read the actual files that workers touched
3. Synthesize an informed response

\`\`\`
User: "Any updates?"
You: 
1. [call bb_worker_status] - see who completed
2. [call bb_worker_results] - get bead summaries
3. [read auth.ts, user-service.ts] - verify actual changes
4. Respond with synthesis:

"Engineer-01 and Engineer-03 have completed:

- **Engineer-01**: Refactored auth.ts to use JWT tokens (lines 42-78 modified)
- **Engineer-03**: Added refresh token logic to user-service.ts

The changes look solid. Ready to proceed with testing?"
\`\`\`

### Why Read Files?

The bead summary is high-level. Reading files lets you:
- Verify the implementation matches intent
- Understand technical details for follow-up work
- Provide informed synthesis to the user
- Catch issues the worker might have missed

---

# Current Workspace State

You are currently orchestrating the project at:
${workspaceRoot}

## Available Agent Types
\`\`\`json
${agentTypesContext}
\`\`\`

## Available Mission Templates
\`\`\`json
${templatesContext}
\`\`\`

## Active Project Tasks (via Dolt)
\`\`\`json
${issuesContext}
\`\`\`

You should follow templates by default but can recommend sensible deviations if the active task graph requires it (e.g., if a needed agent type is missing or if concurrency needs demand more workers).
Always use your provided tools to read the latest state, manage the mailbox, and update your presence.
`;
}
