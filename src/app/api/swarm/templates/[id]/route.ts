import { NextRequest, NextResponse } from 'next/server';
import { saveTemplate, deleteTemplate } from '../../../../../lib/server/beads-fs';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        // Validation
        if (!body.name) {
            return NextResponse.json(
                { error: 'name is required' },
                { status: 400 }
            );
        }
        
        if (!body.team || !Array.isArray(body.team) || body.team.length === 0) {
            return NextResponse.json(
                { error: 'team must be a non-empty array' },
                { status: 400 }
            );
        }

        const template = await saveTemplate({
            id,
            name: body.name,
            description: body.description || '',
            team: body.team,
            protoFormula: body.protoFormula,
            createdAt: body.createdAt,
            isBuiltIn: body.isBuiltIn
        });

        return NextResponse.json(template);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update template' },
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
        await deleteTemplate(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete template';
        const status = message.includes('built-in') ? 403 : 404;
        return NextResponse.json({ error: message }, { status });
    }
}
