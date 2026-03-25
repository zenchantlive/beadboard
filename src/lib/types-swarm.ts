export interface AgentType {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    capabilities: string[];
    color: string;
    /** Optional emoji or icon identifier. If not set, displays first letter of name. */
    icon?: string;
    createdAt: string;
    updatedAt: string;
    isBuiltIn: boolean;
}

/** @deprecated Use AgentType instead. Kept for backward compatibility. */
export type AgentArchetype = AgentType;

export interface SwarmTemplate {
    id: string;
    name: string;
    description: string;
    /** Team composition. Use agentTypeId (archetypeId is deprecated but still supported for backward compat) */
    team: { agentTypeId: string; count: number }[];
    protoFormula?: string;
    /** Color for template display. Defaults to amber if not set. */
    color?: string;
    /** Optional emoji or icon identifier. If not set, displays first letter of name. */
    icon?: string;
    createdAt: string;
    updatedAt: string;
    isBuiltIn: boolean;
}

/** @deprecated Internal type for backward compatibility when reading old template files */
export interface LegacySwarmTemplate {
    id: string;
    name: string;
    description: string;
    team: { archetypeId: string; count: number }[];
    protoFormula?: string;
    color?: string;
    icon?: string;
    createdAt: string;
    updatedAt: string;
    isBuiltIn: boolean;
}
