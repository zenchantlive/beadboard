import { NextResponse } from 'next/server';
import { bootstrapManagedPi } from '../../../../lib/bb-pi-bootstrap';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  try {
    const result = await bootstrapManagedPi();
    
    return NextResponse.json({
      ok: true,
      managedRoot: result.managedRoot,
      sdkPath: result.sdkPath,
      agentDir: result.agentDir,
      alreadyInstalled: result.alreadyInstalled,
      created: result.created,
    });
  } catch (error) {
    console.error('[Bootstrap API] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Bootstrap failed' },
      { status: 500 }
    );
  }
}
