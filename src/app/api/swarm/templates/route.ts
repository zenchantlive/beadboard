import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, saveTemplate } from '../../../../lib/server/beads-fs';

export const dynamic = 'force-dynamic';

export async function GET() {
    const data = await getTemplates();
    return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
    try {
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
            name: body.name,
            description: body.description || '',
            team: body.team,
            protoFormula: body.protoFormula
        });

        return NextResponse.json(template, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create template' },
            { status: 500 }
        );
    }
}
