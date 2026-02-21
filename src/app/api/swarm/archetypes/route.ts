import { NextResponse } from 'next/server';
import { getArchetypes } from '../../../../lib/server/beads-fs';

export async function GET() {
    const data = await getArchetypes();
    return NextResponse.json(data);
}
