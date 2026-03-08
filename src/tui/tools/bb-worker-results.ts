import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { workerSessionManager } from '../../lib/worker-session-manager';
import { execFileSync } from 'child_process';

/**
 * Get results from completed workers.
 * 
 * For each completed worker, returns:
 * - Worker metadata (display name, type, status)
 * - Bead summary (from close reason)
 * - Suggestion to read actual files for verification
 */
export function createWorkerResultsTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_worker_results',
    label: 'Get Worker Results',
    description: `Get results from completed workers. Shows bead summary and suggests files to read.

Usage:
- bb_worker_results() - get all completed worker results
- bb_worker_results(worker_ids: ["worker-123", "worker-456"]) - specific workers

After getting results, READ THE ACTUAL FILES to verify and understand the work.
The bead summary is high-level; the files show the real implementation.`,
    parameters: Type.Object({
      worker_ids: Type.Optional(Type.Array(Type.String(), {
        description: 'Optional: specific worker IDs to get results for. If not provided, returns all completed workers.'
      })),
    }),
    async execute(_toolCallId: string, params: unknown): Promise<any> {
      const { worker_ids } = params as { worker_ids?: string[] };

      try {
        const workers = workerSessionManager.getAllWorkers();
        
        // Filter to completed workers
        let completedWorkers = workers.filter(w => w.status === 'completed' || w.status === 'failed');
        
        // Filter to specific IDs if provided
        if (worker_ids && worker_ids.length > 0) {
          completedWorkers = completedWorkers.filter(w => worker_ids.includes(w.id));
        }

        if (completedWorkers.length === 0) {
          return {
            content: [{ type: 'text', text: 'No completed workers found. Use bb_worker_status to see active workers.' }],
          };
        }

        // Build results by reading beads
        const results: string[] = [];
        
        for (const worker of completedWorkers) {
          const statusIcon = worker.status === 'completed' ? '✓' : '✗';
          const errorSection = worker.error ? `\n   Error: ${worker.error}` : '';
          
          // Try to read the bead for summary
          let beadSummary = '';
          if (worker.beadId) {
            try {
              const beadOutput = execFileSync('bd', ['show', worker.beadId], {
                cwd: projectRoot,
                encoding: 'utf-8',
                timeout: 5000,
              });
              
              // Extract close reason or notes
              const lines = beadOutput.split('\n');
              const closeReasonLine = lines.find(l => l.toLowerCase().includes('close') || l.toLowerCase().includes('reason'));
              const notesLine = lines.find(l => l.toLowerCase().includes('notes'));
              
              if (closeReasonLine) {
                beadSummary = `\n   Summary: ${closeReasonLine.split(':').slice(1).join(':').trim()}`;
              } else if (notesLine) {
                beadSummary = `\n   Notes: ${notesLine.split(':').slice(1).join(':').trim()}`;
              }
            } catch {
              beadSummary = `\n   Bead: ${worker.beadId} (could not read details)`;
            }
          }

          results.push(`${statusIcon} **${worker.displayName || worker.id}** (${worker.agentTypeId || 'default'})
   Status: ${worker.status}
   Bead: ${worker.beadId || 'none'}${beadSummary}${errorSection}`);
        }

        const summary = `## Worker Results (${completedWorkers.length} completed)

${results.join('\n\n')}

---
**Next step:** Read the actual files the workers touched to verify and understand the implementation. Use the read tool on relevant files.`;

        return {
          content: [{ type: 'text', text: summary }],
          details: {
            workers: completedWorkers.map(w => ({
              id: w.id,
              displayName: w.displayName,
              beadId: w.beadId,
              status: w.status,
              agentTypeId: w.agentTypeId,
            })),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to get worker results: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
