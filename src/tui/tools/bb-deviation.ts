import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { embeddedPiDaemon } from '../../lib/embedded-daemon';

export function createDeviationTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_record_deviation',
    label: 'Record Template Deviation',
    description: 'Log when and why you are deviating from a standard mission template (e.g., adding an extra worker, skipping an archetype, changing the flow).',
    parameters: Type.Object({
      reason: Type.String({ description: 'Why the deviation was necessary' }),
      deviation_type: Type.String({ description: 'What kind of deviation (e.g., "extra_worker", "missing_archetype", "custom_flow")' }),
      details: Type.Optional(Type.String({ description: 'Additional context about the deviation' })),
    }),
    async execute(_toolCallId, params: any) {
      try {
        // We use the existing daemon event system to record this
        embeddedPiDaemon.appendEvent(projectRoot, {
          kind: 'deviation',
          title: `Deviation [${params.deviation_type}]`,
          detail: params.reason,
          status: 'info',
        });

        return {
          content: [{ type: 'text', text: 'Deviation recorded successfully.' }],
          details: {},
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to record deviation: ${message}` }],
          isError: true,
          details: {},
        };
      }
    },
  };
}
