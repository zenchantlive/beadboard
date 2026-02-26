import { NextRequest, NextResponse } from 'next/server';
import { getArchetypes, saveArchetype } from '../../../../lib/server/beads-fs';

export const dynamic = 'force-dynamic';

export async function GET() {
    const data = await getArchetypes();
    return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validation
        if (!body.name || !body.systemPrompt) {
            return NextResponse.json(
                { error: 'name and systemPrompt are required' },
                { status: 400 }
            );
        }

        const archetype = await saveArchetype({
            name: body.name,
            description: body.description || '',
            systemPrompt: body.systemPrompt,
            capabilities: body.capabilities || [],
            color: body.color || '#3b82f6'
        });

        return NextResponse.json(archetype, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create archetype' },
            { status: 500 }
        );
    }
}
