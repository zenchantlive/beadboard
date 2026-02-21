export interface AgentArchetype {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    capabilities: string[];
    color: string;
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
    createdAt: string;
    updatedAt: string;
    isBuiltIn: boolean;
}
