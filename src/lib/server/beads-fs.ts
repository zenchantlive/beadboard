import fs from 'fs/promises';
import path from 'path';
import { AgentArchetype, SwarmTemplate } from '../types-swarm';

const ARCHE_DIR = path.join(process.cwd(), '.beads', 'archetypes');
const TEMPLATE_DIR = path.join(process.cwd(), '.beads', 'templates');

export function slugify(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export type SaveArchetypeInput = Partial<AgentArchetype> & {
    name: string;
    description: string;
    systemPrompt: string;
    capabilities: string[];
    color: string;
};

export async function saveArchetype(input: SaveArchetypeInput): Promise<AgentArchetype> {
    await fs.mkdir(ARCHE_DIR, { recursive: true });

    const id = input.id || slugify(input.name);
    const now = new Date().toISOString();

    let isBuiltIn = input.isBuiltIn ?? false;
    let createdAt = input.createdAt || now;

    try {
        const existingContent = await fs.readFile(path.join(ARCHE_DIR, `${id}.json`), 'utf-8');
        const existing = JSON.parse(existingContent);
        if (existing.isBuiltIn) {
            isBuiltIn = true; // Protect built-in status
        }
        if (existing.createdAt) {
            createdAt = existing.createdAt;
        }
    } catch {
        // File doesn't exist, which is fine
    }

    const archetype: AgentArchetype = {
        id,
        name: input.name,
        description: input.description,
        systemPrompt: input.systemPrompt,
        capabilities: input.capabilities,
        color: input.color,
        createdAt,
        updatedAt: now,
        isBuiltIn
    };

    await fs.writeFile(
        path.join(ARCHE_DIR, `${id}.json`),
        JSON.stringify(archetype, null, 2)
    );

    return archetype;
}

export async function deleteArchetype(id: string): Promise<void> {
    const filePath = path.join(ARCHE_DIR, `${id}.json`);

    let archetype: AgentArchetype;
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        archetype = JSON.parse(content);
    } catch {
        throw new Error(`Archetype not found: ${id}`);
    }

    if (archetype.isBuiltIn) {
        throw new Error(`Cannot delete built-in archetype: ${id}`);
    }

    await fs.unlink(filePath);
}

const SEED_ARCHETYPES: AgentArchetype[] = [
    {
        id: 'architect',
        name: 'System Architect',
        description: 'Designs complex system structures and writes detailed implementation plans.',
        systemPrompt: 'You are a staff-level software architect focused on high-level system design.',
        capabilities: ['planning', 'design_docs', 'arch_review'],
        color: '#3b82f6',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isBuiltIn: true
    },
    {
        id: 'coder',
        name: 'Implementation Engineer',
        description: 'Translates plans into precise, type-safe, and tested code.',
        systemPrompt: 'You are a senior software engineer focused on execution and clean code.',
        capabilities: ['coding', 'refactoring', 'testing'],
        color: '#10b981',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isBuiltIn: true
    }
];

export async function getArchetypes(): Promise<AgentArchetype[]> {
    try {
        await fs.mkdir(ARCHE_DIR, { recursive: true });
        const files = await fs.readdir(ARCHE_DIR);

        if (files.filter(f => f.endsWith('.json')).length === 0) {
            // Seed defaults
            for (const arch of SEED_ARCHETYPES) {
                await fs.writeFile(path.join(ARCHE_DIR, `${arch.id}.json`), JSON.stringify(arch, null, 2));
            }
            return SEED_ARCHETYPES;
        }

        const archetypes: AgentArchetype[] = [];
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const content = await fs.readFile(path.join(ARCHE_DIR, file), 'utf-8');
                const parsed = JSON.parse(content);
                archetypes.push({
                    ...parsed,
                    id: file.replace('.json', '')
                });
            } catch (err) {
                console.error(`Failed to parse archetype file: ${file}`, err);
            }
        }

        return archetypes;
    } catch (e) {
        console.error('Error in getArchetypes:', e);
        return [];
    }
}

const SEED_TEMPLATES: SwarmTemplate[] = [
    {
        id: 'standard-app',
        name: 'Standard Application Swarm',
        description: 'A balanced team of an Architect and two Coders for standard feature development.',
        team: [
            { archetypeId: 'architect', count: 1 },
            { archetypeId: 'coder', count: 2 }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isBuiltIn: true
    }
];

export async function getTemplates(): Promise<SwarmTemplate[]> {
    try {
        await fs.mkdir(TEMPLATE_DIR, { recursive: true });
        const files = await fs.readdir(TEMPLATE_DIR);

        if (files.filter(f => f.endsWith('.json')).length === 0) {
            for (const tpl of SEED_TEMPLATES) {
                await fs.writeFile(path.join(TEMPLATE_DIR, `${tpl.id}.json`), JSON.stringify(tpl, null, 2));
            }
            return SEED_TEMPLATES;
        }

        const templates: SwarmTemplate[] = [];
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const content = await fs.readFile(path.join(TEMPLATE_DIR, file), 'utf-8');
                const parsed = JSON.parse(content);
                templates.push({
                    ...parsed,
                    id: file.replace('.json', '')
                });
            } catch (err) {
                console.error(`Failed to parse template file: ${file}`, err);
            }
        }

        return templates;
    } catch (e) {
        console.error('Error in getTemplates:', e);
        return [];
    }
}

export type SaveTemplateInput = Partial<SwarmTemplate> & {
    name: string;
    description: string;
    team: { archetypeId: string; count: number }[];
};

export async function saveTemplate(input: SaveTemplateInput): Promise<SwarmTemplate> {
    await fs.mkdir(TEMPLATE_DIR, { recursive: true });

    const archetypes = await getArchetypes();
    const validArchetypeIds = new Set(archetypes.map(a => a.id));

    for (const member of input.team) {
        if (!validArchetypeIds.has(member.archetypeId)) {
            throw new Error(`Invalid archetype ID in team: ${member.archetypeId}`);
        }
    }

    const id = input.id || slugify(input.name);
    const now = new Date().toISOString();

    let isBuiltIn = input.isBuiltIn ?? false;
    let createdAt = input.createdAt || now;

    try {
        const existingContent = await fs.readFile(path.join(TEMPLATE_DIR, `${id}.json`), 'utf-8');
        const existing = JSON.parse(existingContent);
        if (existing.isBuiltIn) {
            isBuiltIn = true; // Protect built-in status
        }
        if (existing.createdAt) {
            createdAt = existing.createdAt;
        }
    } catch {
        // File doesn't exist, which is fine
    }

    const template: SwarmTemplate = {
        id,
        name: input.name,
        description: input.description,
        team: input.team,
        protoFormula: input.protoFormula,
        createdAt,
        updatedAt: now,
        isBuiltIn
    };

    await fs.writeFile(
        path.join(TEMPLATE_DIR, `${id}.json`),
        JSON.stringify(template, null, 2)
    );

    return template;
}

export async function deleteTemplate(id: string): Promise<void> {
    const filePath = path.join(TEMPLATE_DIR, `${id}.json`);

    let template: SwarmTemplate;
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        template = JSON.parse(content);
    } catch {
        throw new Error(`Template not found: ${id}`);
    }

    if (template.isBuiltIn) {
        throw new Error(`Cannot delete built-in template: ${id}`);
    }

    await fs.unlink(filePath);
}
