/**
 * Type declarations for Pi SDK packages that are loaded dynamically at runtime.
 * These packages are not installed as dev dependencies — the SDK is bootstrapped
 * into a managed directory and imported via dynamic import() at runtime.
 */

declare module '@sinclair/typebox' {
  export const Type: {
    Object: (props: Record<string, unknown>) => unknown;
    String: (opts?: Record<string, unknown>) => unknown;
    Optional: (schema: unknown) => unknown;
    Number: (opts?: Record<string, unknown>) => unknown;
    Boolean: (opts?: Record<string, unknown>) => unknown;
    Array: (items: unknown, opts?: Record<string, unknown>) => unknown;
    Literal: (value: unknown) => unknown;
    Union: (items: unknown[]) => unknown;
  };
}

declare module '@mariozechner/pi-coding-agent' {
  export interface AgentToolResult {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
    details?: Record<string, unknown>;
  }

  export interface ToolDefinition {
    name: string;
    label: string;
    description: string;
    parameters: unknown;
    execute(
      toolCallId: string,
      params: unknown,
      signal?: AbortSignal,
      onUpdate?: (update: unknown) => void,
      ctx?: ExtensionContext,
    ): Promise<AgentToolResult>;
  }

  export interface ExtensionContext {
    cwd: string;
    [key: string]: unknown;
  }
}
