/**
 * Re-export Pi SDK tool types for BeadBoard TUI tools.
 * 
 * We use ToolDefinition from the Pi SDK, which requires:
 * - name, label, description, parameters (TypeBox schema)
 * - execute(toolCallId, params, signal, onUpdate, ctx) => Promise<AgentToolResult>
 */
export type { ToolDefinition as CustomAgentTool, AgentToolResult, ExtensionContext } from '@mariozechner/pi-coding-agent';
export { Type } from '@sinclair/typebox';
