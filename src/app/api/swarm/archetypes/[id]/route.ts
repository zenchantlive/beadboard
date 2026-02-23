import { NextRequest, NextResponse } from 'next/server';
import { saveArchetype, deleteArchetype } from '../../../../../lib/server/beads-fs';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        // Validation
        if (!body.name || !body.systemPrompt) {
            return NextResponse.json(
                { error: 'name and systemPrompt are required' },
                { status: 400 }
            );
        }

        const archetype = await saveArchetype({
            id,
            name: body.name,
            description: body.description || '',
            systemPrompt: body.systemPrompt,
            capabilities: body.capabilities || [],
            color: body.color || '#3b82f6',
            createdAt: body.createdAt,
            isBuiltIn: body.isBuiltIn
        });

        return NextResponse.json(archetype);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update archetype' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await deleteArchetype(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete archetype';
        const status = message.includes('built-in') ? 403 : 404;
        return NextResponse.json({ error: message }, { status });
    }
}
