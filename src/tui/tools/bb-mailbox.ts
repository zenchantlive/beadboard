import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { inboxAgentMessages, sendAgentMessage, ackAgentMessage } from '../../lib/agent-mail';

export function createMailboxTools(): ToolDefinition[] {
  return [
    {
      name: 'bb_read_inbox',
      label: 'Read Mailbox',
      description: 'Read incoming coordination messages (HANDOFF, BLOCKED, INFO) for an agent.',
      parameters: Type.Object({
        agent: Type.String({ description: 'The agent ID to read messages for (usually yourself)' }),
        state: Type.Optional(Type.String({ description: 'Filter by state: unread, read, acked' })),
        limit: Type.Optional(Type.Number({ description: 'Max messages to return' })),
      }),
      async execute(_toolCallId, params: any) {
        try {
          const result = await inboxAgentMessages({
            agent: params.agent,
            state: params.state,
            limit: params.limit,
          });
          
          if (!result.ok) {
            return { content: [{ type: 'text', text: `Failed: ${result.error?.message}` }], isError: true, details: {} };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
            details: {},
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true, details: {} };
        }
      },
    },
    {
      name: 'bb_send_message',
      label: 'Send Message',
      description: 'Send a coordination message to another agent or broadcast. Use for HANDOFF or reporting BLOCKED states.',
      parameters: Type.Object({
        from: Type.String({ description: 'Your agent ID' }),
        to: Type.String({ description: 'Recipient agent ID (or broadcast)' }),
        bead: Type.String({ description: 'The task/bead ID this relates to' }),
        category: Type.String({ description: 'One of: HANDOFF, BLOCKED, DECISION, INFO' }),
        subject: Type.String({ description: 'Short summary' }),
        body: Type.String({ description: 'Detailed message body' }),
      }),
      async execute(_toolCallId, params: any) {
        try {
          const result = await sendAgentMessage({
            from: params.from,
            to: params.to,
            bead: params.bead,
            category: params.category,
            subject: params.subject,
            body: params.body,
          });

          if (!result.ok) {
            return { content: [{ type: 'text', text: `Failed: ${result.error?.message}` }], isError: true, details: {} };
          }

          return {
            content: [{ type: 'text', text: `Message sent successfully. ID: ${result.data?.message_id}` }],
            details: {},
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true, details: {} };
        }
      },
    },
    {
      name: 'bb_ack_message',
      label: 'Acknowledge Message',
      description: 'Acknowledge a required message (like a HANDOFF or BLOCKED notification) to signal you have received it.',
      parameters: Type.Object({
        agent: Type.String({ description: 'Your agent ID' }),
        messageId: Type.String({ description: 'The ID of the message to acknowledge' }),
      }),
      async execute(_toolCallId, params: any) {
        try {
          const result = await ackAgentMessage({
            agent: params.agent,
            message: params.messageId,
          });

          if (!result.ok) {
            return { content: [{ type: 'text', text: `Failed: ${result.error?.message}` }], isError: true, details: {} };
          }

          return {
            content: [{ type: 'text', text: `Message ${params.messageId} acknowledged successfully.` }],
            details: {},
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true, details: {} };
        }
      },
    }
  ];
}
