import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { getTemplates, getAgentTypes } from '../../lib/server/beads-fs';
import { workerSessionManager } from '../../lib/worker-session-manager';

/**
 * Generate a task ID from natural language.
 */
function generateTaskId(description: string): string {
  const slug = description
    .toLowerCase()
    .slice(0, 40)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const ts = Date.now().toString(36).slice(-4);
  return `${slug}-${ts}`;
}

/**
 * Auto-select template based on task description keywords.
 */
function autoSelectTemplate(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('bug') || desc.includes('fix') || desc.includes('error') || desc.includes('fail')) {
    return 'bug-fix';
  }
  if (desc.includes('review') || desc.includes('audit')) {
    return 'code-review';
  }
  if (desc.includes('investigate') || desc.includes('research') || desc.includes('analyze')) {
    return 'investigation';
  }
  if (desc.includes('refactor') || desc.includes('clean') || desc.includes('improve')) {
    return 'refactor';
  }
  if (desc.includes('deploy') || desc.includes('release') || desc.includes('ship')) {
    return 'release';
  }
  if (desc.includes('new project') || desc.includes('from scratch') || desc.includes('greenfield')) {
    return 'greenfield';
  }
  // Default for features and general work
  return 'feature-dev';
}

export function createSpawnTemplateTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_spawn_team',
    label: 'Spawn Agent Team',
    description: `Spawn a team of agents using a template. Use for larger tasks that need multiple specialists.

Examples:
- "Build a user authentication system"
- "Investigate and fix the payment processing bug"
- "Review and improve the API layer"

Available templates:
- feature-dev: Architect + 2 Engineers + Reviewer + Tester (new features)
- bug-fix: Investigator + Engineer + Tester (debugging)
- code-review: Reviewer + Engineer (code review)
- investigation: Investigator + Tester (research/analysis)
- refactor: Architect + 2 Engineers + Tester (code improvement)
- release: Tester + Reviewer + Shipper (deployment)
- greenfield: Full team for new projects
- full-squad: All agent types for complex work`,
    parameters: Type.Object({
      description: Type.String({ 
        description: 'What you want the team to accomplish. Be specific about scope and goals.' 
      }),
      template: Type.Optional(Type.String({ 
        description: 'Template name. If not provided, one will be selected based on your description.' 
      })),
    }),
    async execute(_toolCallId: string, params: unknown): Promise<any> {
      const { description, template } = params as {
        description: string;
        template?: string;
      };

      if (!description || typeof description !== 'string') {
        return {
          content: [{ type: 'text', text: 'Please describe what you want the team to accomplish.' }],
          isError: true,
        };
      }

      // Auto-select template if not provided
      const templateId = template || autoSelectTemplate(description);

      // Load template
      const templates = await getTemplates(projectRoot);
      const selectedTemplate = templates.find(t => t.id === templateId);
      
      if (!selectedTemplate) {
        return {
          content: [{ 
            type: 'text', 
            text: `Template "${templateId}" not found. Available: ${templates.map(t => t.id).join(', ')}` 
          }],
          isError: true,
        };
      }

      // Load agent types
      const agentTypes = await getAgentTypes(projectRoot);
      const agentTypeMap = new Map(agentTypes.map(a => [a.id, a]));

      // Generate task ID
      const taskId = generateTaskId(description);

      // Spawn workers for each team member
      const spawned: Array<{ id: string; displayName?: string; agentTypeId: string }> = [];
      const spawnErrors: string[] = [];
      
      for (const member of selectedTemplate.team) {
        const agentType = agentTypeMap.get(member.agentTypeId);
        if (!agentType) {
          spawnErrors.push(`Unknown agent type: ${member.agentTypeId}`);
          continue;
        }
        
        for (let i = 0; i < member.count; i++) {
          try {
            const worker = await workerSessionManager.spawnWorker({
              projectRoot,
              taskId: `${taskId}-${member.agentTypeId}-${i + 1}`,
              taskContext: description,
              agentType: member.agentTypeId,
            });
            spawned.push({
              id: worker.id,
              displayName: worker.displayName,
              agentTypeId: member.agentTypeId,
            });
          } catch (error) {
            spawnErrors.push(`Failed to spawn ${member.agentTypeId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // Build result
      const teamDesc = selectedTemplate.team.map(m => `${m.count}×${m.agentTypeId}`).join(' + ');
      const names = spawned.map(s => s.displayName).filter(Boolean).join(', ');
      
      let message = `✓ Spawned ${spawned.length} agents using "${selectedTemplate.name}"\n\n`;
      message += `Team: ${teamDesc}\n`;
      message += `Active: ${names}\n\n`;
      message += `Goal: "${description.slice(0, 80)}${description.length > 80 ? '...' : ''}"`;
      
      if (spawnErrors.length > 0) {
        message += `\n\nErrors:\n${spawnErrors.map(e => `- ${e}`).join('\n')}`;
      }

      return {
        content: [{ type: 'text', text: message }],
        details: { 
          template: { id: selectedTemplate.id, name: selectedTemplate.name },
          taskId,
          spawned: spawned.map(s => ({ id: s.id, displayName: s.displayName })),
          errors: spawnErrors.length > 0 ? spawnErrors : undefined,
        },
      };
    },
  };
}
