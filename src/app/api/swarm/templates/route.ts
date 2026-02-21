import { NextResponse } from 'next/server';
import { getTemplates } from '../../../../lib/server/beads-fs';

export async function GET() {
    const data = await getTemplates();
    return NextResponse.json(data);
}
