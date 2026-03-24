import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { registerAgent, extendActivityLease } from '../../lib/agent-registry';

export function createPresenceTools(): ToolDefinition[] {
  return [
    {
      name: 'bb_update_presence',
      label: 'Update Presence',
      description: 'Register or extend your presence lease in the BeadBoard agent registry so the frontend knows you are alive.',
      parameters: Type.Object({
        agent: Type.String({ description: 'Your agent ID (e.g., orchestrator)' }),
        role: Type.String({ description: 'Your role (e.g., orchestrator, worker)' }),
        display: Type.Optional(Type.String({ description: 'Friendly display name' })),
      }),
      async execute(_toolCallId, params: any) {
        try {
          // Attempt to register/update
          const result = await registerAgent({
            name: params.agent,
            role: params.role,
            display: params.display,
            forceUpdate: true,
          });

          if (!result.ok) {
            // Fallback to just lease extension if register fails or acts weird
            await extendActivityLease({ agent: params.agent });
          }

          return {
            content: [{ type: 'text', text: `Presence updated for ${params.agent}.` }],
            details: {},
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true, details: {} };
        }
      },
    },
  ];
}
