import { NextResponse } from 'next/server';

import { readIssuesFromDisk } from '../../../../lib/read-issues';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const projectRoot = url.searchParams.get('projectRoot') ?? process.cwd();

  try {
    const issues = await readIssuesFromDisk({ projectRoot, preferBd: true });
    return NextResponse.json({ ok: true, issues });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          classification: 'unknown',
          message: error instanceof Error ? error.message : 'Failed to read issues.',
        },
      },
      { status: 500 },
    );
  }
}
