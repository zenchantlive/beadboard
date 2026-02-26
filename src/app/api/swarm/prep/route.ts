import { NextResponse } from 'next/server';
import { runBdCommand } from '../../../../lib/bridge';
import { issuesEventBus } from '../../../../lib/realtime';

interface PrepRequest {
    projectRoot: string;
    beadId: string;
    archetypeId: string;
    claim?: boolean; // If true, also claim the task
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as PrepRequest;
        const { projectRoot, beadId, archetypeId, claim = true } = body;

        if (!projectRoot || !beadId || !archetypeId) {
            return NextResponse.json({ 
                ok: false, 
                error: 'Missing required fields: projectRoot, beadId, archetypeId' 
            }, { status: 400 });
        }

        // Step 1: Add the agent label (marks which archetype is needed)
        const labelResult = await runBdCommand({
            projectRoot,
            args: ['label', 'add', beadId, `agent:${archetypeId}`],
        });

        if (!labelResult.success) {
            console.error('bd label add failed:', labelResult.stderr);
            // Continue anyway - label might already exist
        }

        // Step 2: If claiming, set status to in_progress and assignee
        if (claim) {
            const updateResult = await runBdCommand({
                projectRoot,
                args: [
                    'update', 
                    beadId, 
                    '-s', 'in_progress',
                    '-a', archetypeId, // Use archetype as placeholder assignee
                    '--json'
                ],
            });

            if (!updateResult.success) {
                return NextResponse.json({ 
                    ok: false, 
                    error: updateResult.error || updateResult.stderr 
                }, { status: 500 });
            }

            // Notify SSE subscribers
            issuesEventBus.emit('issues');

            return NextResponse.json({ 
                ok: true, 
                message: `Claimed ${beadId} for ${archetypeId}`,
                labelOutput: labelResult.stdout,
                updateOutput: updateResult.stdout
            });
        }

        // Just labeled, not claimed
        issuesEventBus.emit('issues');
        return NextResponse.json({ 
            ok: true, 
            message: `Prepped ${beadId} for ${archetypeId} (not claimed)`,
            output: labelResult.stdout 
        });

    } catch (error: any) {
        console.error('Prep task failed:', error);
        return NextResponse.json({ 
            ok: false, 
            error: error.message 
        }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { projectRoot, beadId, archetypeId } = body;

        if (!projectRoot || !beadId) {
            return NextResponse.json({ 
                ok: false, 
                error: 'Missing required fields: projectRoot, beadId' 
            }, { status: 400 });
        }

        // Remove the agent: label
        const labelToRemove = archetypeId ? `agent:${archetypeId}` : 'agent:';
        const labelResult = await runBdCommand({
            projectRoot,
            args: ['label', 'remove', beadId, labelToRemove],
        });

        // Also reset status to open if it was in_progress
        const updateResult = await runBdCommand({
            projectRoot,
            args: ['update', beadId, '-s', 'open', '--json'],
        });

        // Notify SSE subscribers
        issuesEventBus.emit('issues');

        return NextResponse.json({ 
            ok: true, 
            message: `Removed assignment from ${beadId}`,
            labelOutput: labelResult.stdout,
            updateOutput: updateResult.stdout
        });

    } catch (error: any) {
        console.error('Remove assignment failed:', error);
        return NextResponse.json({ 
            ok: false, 
            error: error.message 
        }, { status: 500 });
    }
}
