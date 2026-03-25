import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { readIssuesFromDisk } from '../../lib/read-issues';

export function createDoltReadTool(projectRoot: string): ToolDefinition {
  return {
    name: 'bb_dolt_read_issues',
    label: 'Read Project Tasks',
    description: 'Read the current project tasks (BeadBoard issues) from the Dolt backend. Always use this to check task state before acting.',
    parameters: Type.Object({
      limit: Type.Optional(Type.Number({ description: 'Max number of tasks to return' })),
    }),
    async execute(_toolCallId, params: any) {
      try {
        const issues = await readIssuesFromDisk({ projectRoot });
        const sliced = params.limit ? issues.slice(0, params.limit) : issues;
        
        // Strip out some heavy metadata to keep context clean
        const compactIssues = sliced.map((i) => ({
          id: i.id,
          title: i.title,
          status: i.status,
          priority: i.priority,
          issue_type: i.issue_type,
          assignee: i.assignee,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(compactIssues, null, 2),
            },
          ],
          details: {
            total: issues.length,
            returned: compactIssues.length,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to read tasks: ${message}` }],
          isError: true,
          details: {},
        };
      }
    },
  };
}
