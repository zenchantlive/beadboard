export interface AgentArchetype {
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

export interface SwarmTemplate {
    id: string;
    name: string;
    description: string;
    team: { archetypeId: string; count: number }[];
    protoFormula?: string;
    /** Color for template display. Defaults to amber if not set. */
    color?: string;
    /** Optional emoji or icon identifier. If not set, displays first letter of name. */
    icon?: string;
    createdAt: string;
    updatedAt: string;
    isBuiltIn: boolean;
}
