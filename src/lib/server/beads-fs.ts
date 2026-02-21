import fs from 'fs/promises';
import path from 'path';
import { AgentArchetype, SwarmTemplate } from '../types-swarm';

const ARCHE_DIR = path.join(process.cwd(), '.beads', 'archetypes');
const TEMPLATE_DIR = path.join(process.cwd(), '.beads', 'templates');

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
