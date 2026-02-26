import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
    try {
        const { beadId, archetypeId } = await request.json();

        if (!beadId || !archetypeId) {
            return NextResponse.json({ error: 'Missing beadId or archetypeId' }, { status: 400 });
        }

        // Use bd CLI to add the archetype label. We leave it 'open' because Prep just assigns the agent.
        const cmd = `bd label add ${beadId} "agent:${archetypeId}"`;
        const { stdout, stderr } = await execAsync(cmd);

        if (stderr && !stderr.includes('Warning')) {
            console.error('bd label add stderr:', stderr);
        }

        return NextResponse.json({ success: true, message: `Prepped ${beadId} for ${archetypeId}`, output: stdout });

    } catch (error: any) {
        console.error('Prep task failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { beadId, archetypeId } = await request.json();

        if (!beadId) {
            return NextResponse.json({ error: 'Missing beadId' }, { status: 400 });
        }

        // Remove the agent: label
        // If archetypeId is provided, remove specific label, otherwise remove any agent: label
        const labelToRemove = archetypeId ? `agent:${archetypeId}` : 'agent:';
        const cmd = `bd label remove ${beadId} "${labelToRemove}"`;
        const { stdout, stderr } = await execAsync(cmd);

        if (stderr && !stderr.includes('Warning')) {
            console.error('bd label remove stderr:', stderr);
        }

        return NextResponse.json({ success: true, message: `Removed assignment from ${beadId}`, output: stdout });

    } catch (error: any) {
        console.error('Remove assignment failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
