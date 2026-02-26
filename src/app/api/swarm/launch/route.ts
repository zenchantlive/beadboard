import { NextResponse } from 'next/server';
import { runBdCommand } from '../../../../lib/bridge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectRoot, title, proto } = body;

    if (!projectRoot || !title || !proto) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: projectRoot, title, proto' },
        { status: 400 }
      );
    }

    // bd mol pour "Title" --proto <proto> --json
    const args = ['mol', 'pour', title, '--proto', proto, '--json'];
    
    // Safety: Ensure proto doesn't contain shell injection
    if (!/^[a-zA-Z0-9_\-.]+$/.test(proto)) {
        return NextResponse.json({ ok: false, error: 'Invalid proto name' }, { status: 400 });
    }

    const result = await runBdCommand({
      projectRoot,
      args,
    });

    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error || result.stderr }, { status: 500 });
    }

    const data = JSON.parse(result.stdout);
    return NextResponse.json({ ok: true, data });

  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
