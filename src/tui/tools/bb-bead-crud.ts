import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Bead CRUD tools that wrap the `bd` CLI.
 * These allow the orchestrator and workers to create, update, and close beads.
 */

export function createBeadCrudTools(projectRoot: string): ToolDefinition[] {
  return [
    // bb_create - Create a new bead
    {
      name: 'bb_create',
      label: 'Create Bead',
      description: `Create a new bead (task/epic) for tracking work. Returns the bead ID.

Examples:
- Create a task: bb_create(title="Fix login bug", description="Users can't log in with SSO", type="task")
- Create an epic: bb_create(title="User Profile Feature", type="epic", priority=1)
- With labels: bb_create(title="Security audit", labels=["security", "urgent"])`,
      parameters: Type.Object({
        title: Type.String({ description: 'Bead title (concise summary)' }),
        description: Type.Optional(Type.String({ description: 'Detailed description of the work' })),
        type: Type.Optional(Type.String({ 
          description: 'Bead type: task (default), epic, wisp, note',
          default: 'task' 
        })),
        priority: Type.Optional(Type.Number({ 
          description: 'Priority: 0 (urgent), 1 (high), 2 (medium), 3 (low). Default: 2' 
        })),
        labels: Type.Optional(Type.Array(Type.String(), { 
          description: 'Labels to apply (e.g., ["bug", "frontend"])' 
        })),
        parent: Type.Optional(Type.String({ 
          description: 'Parent bead ID if this is a child task' 
        })),
      }),
      async execute(_toolCallId, params: unknown): Promise<any> {
        const { title, description, type, priority, labels, parent } = params as {
          title: string;
          description?: string;
          type?: string;
          priority?: number;
          labels?: string[];
          parent?: string;
        };

        if (!title?.trim()) {
          return {
            content: [{ type: 'text', text: 'Title is required to create a bead.' }],
            isError: true,
          };
        }

        try {
          const args = ['create', title];
          
          if (description) {
            args.push('--description', description);
          }
          if (type) {
            args.push('--type', type);
          }
          if (priority !== undefined) {
            args.push('--priority', String(priority));
          }
          if (labels && labels.length > 0) {
            args.push('--label', labels.join(','));
          }
          if (parent) {
            args.push('--parent', parent);
          }

          const { stdout: output } = await execFileAsync('bd', args, {
            cwd: projectRoot,
            encoding: 'utf-8',
            timeout: 10000,
          });

          // bd create outputs the bead ID
          const beadId = output.trim().split('\n').pop()?.trim();

          return {
            content: [{ 
              type: 'text', 
              text: `✓ Created bead: ${beadId}

Title: ${title}
Type: ${type || 'task'}
Priority: ${priority ?? 2}

Use bb_update to add details or assign an agent. Use bb_spawn_worker to start work on this bead.` 
            }],
            details: { beadId, title, type: type || 'task' },
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: 'text', text: `Failed to create bead: ${message}` }],
            isError: true,
          };
        }
      },
    },

    // bb_update - Update a bead
    {
      name: 'bb_update',
      label: 'Update Bead',
      description: `Update a bead's fields: status, assignee, notes, etc.

Examples:
- Claim a bead: bb_update(id="bead-001", status="in_progress", assignee="Engineer 01")
- Add notes: bb_update(id="bead-001", notes="Found the bug in auth.ts line 42")
- Mark blocked: bb_update(id="bead-001", status="blocked", notes="Waiting for API key")`,
      parameters: Type.Object({
        id: Type.String({ description: 'Bead ID to update' }),
        status: Type.Optional(Type.String({ 
          description: 'New status: open, in_progress, blocked, review, done, closed' 
        })),
        assignee: Type.Optional(Type.String({ 
          description: 'Agent assigned to this bead (e.g., "Engineer 01")' 
        })),
        notes: Type.Optional(Type.String({ 
          description: 'Notes to append to the bead (use for progress updates)' 
        })),
        priority: Type.Optional(Type.Number({ description: 'Update priority' })),
        title: Type.Optional(Type.String({ description: 'Update title' })),
        description: Type.Optional(Type.String({ description: 'Update description' })),
      }),
      async execute(_toolCallId, params: unknown): Promise<any> {
        const { id, status, assignee, notes, priority, title, description } = params as {
          id: string;
          status?: string;
          assignee?: string;
          notes?: string;
          priority?: number;
          title?: string;
          description?: string;
        };

        if (!id) {
          return {
            content: [{ type: 'text', text: 'Bead ID is required.' }],
            isError: true,
          };
        }

        try {
          const args = ['update', id];
          
          if (status) {
            args.push('--status', status);
          }
          if (assignee) {
            args.push('--assignee', assignee);
          }
          if (notes) {
            args.push('--notes', notes);
          }
          if (priority !== undefined) {
            args.push('--priority', String(priority));
          }
          if (title) {
            args.push('--title', title);
          }
          if (description) {
            args.push('--description', description);
          }

          await execFileAsync('bd', args, {
            cwd: projectRoot,
            encoding: 'utf-8',
            timeout: 10000,
          });

          const changes = [status && `status=${status}`, assignee && `assignee=${assignee}`, notes && 'notes added']
            .filter(Boolean)
            .join(', ');

          return {
            content: [{ 
              type: 'text', 
              text: `✓ Updated ${id}: ${changes || 'no changes'}` 
            }],
            details: { beadId: id, status, assignee },
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: 'text', text: `Failed to update bead: ${message}` }],
            isError: true,
          };
        }
      },
    },

    // bb_close - Close a bead
    {
      name: 'bb_close',
      label: 'Close Bead',
      description: `Close a bead as completed or with a reason.

Examples:
- Complete: bb_close(id="bead-001", reason="Fixed the login bug by updating auth.ts")
- Wontfix: bb_close(id="bead-002", reason="Not reproducible")`,
      parameters: Type.Object({
        id: Type.String({ description: 'Bead ID to close' }),
        reason: Type.String({ description: 'Reason for closing (what was done or why wontfix)' }),
      }),
      async execute(_toolCallId, params: unknown): Promise<any> {
        const { id, reason } = params as { id: string; reason: string };

        if (!id || !reason) {
          return {
            content: [{ type: 'text', text: 'Both id and reason are required.' }],
            isError: true,
          };
        }

        try {
          await execFileAsync('bd', ['close', id, '--reason', reason], {
            cwd: projectRoot,
            encoding: 'utf-8',
            timeout: 10000,
          });

          return {
            content: [{ 
              type: 'text', 
              text: `✓ Closed ${id}: ${reason}` 
            }],
            details: { beadId: id, reason },
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: 'text', text: `Failed to close bead: ${message}` }],
            isError: true,
          };
        }
      },
    },

    // bb_show - Show bead details
    {
      name: 'bb_show',
      label: 'Show Bead',
      description: 'Get details about a specific bead including status, assignee, notes, and dependencies.',
      parameters: Type.Object({
        id: Type.String({ description: 'Bead ID to show' }),
      }),
      async execute(_toolCallId, params: unknown): Promise<any> {
        const { id } = params as { id: string };

        if (!id) {
          return {
            content: [{ type: 'text', text: 'Bead ID is required.' }],
            isError: true,
          };
        }

        try {
          const { stdout: output } = await execFileAsync('bd', ['show', id], {
            cwd: projectRoot,
            encoding: 'utf-8',
            timeout: 10000,
          });

          return {
            content: [{ type: 'text', text: output }],
            details: { beadId: id },
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: 'text', text: `Failed to show bead: ${message}` }],
            isError: true,
          };
        }
      },
    },

    // bb_ready - List beads ready for work
    {
      name: 'bb_ready',
      label: 'List Ready Beads',
      description: 'List beads that are ready to be worked on (open status, no blockers).',
      parameters: Type.Object({}),
      async execute(_toolCallId, _params: unknown): Promise<any> {
        try {
          const { stdout: output } = await execFileAsync('bd', ['ready'], {
            cwd: projectRoot,
            encoding: 'utf-8',
            timeout: 10000,
          });

          if (!output.trim()) {
            return {
              content: [{ type: 'text', text: 'No beads ready for work.' }],
            };
          }

          return {
            content: [{ type: 'text', text: `Ready beads:\n${output}` }],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: 'text', text: `Failed to list ready beads: ${message}` }],
            isError: true,
          };
        }
      },
    },
  ];
}
