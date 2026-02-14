import { NextResponse } from 'next/server';
import path from 'node:path';
import { readIssuesFromDisk } from '../../../../lib/read-issues';

function isValidProjectRoot(root: string): boolean {
  try {
    const resolved = path.resolve(root);
    return path.isAbsolute(resolved);
  } catch {
    return false;
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const projectRootParam = url.searchParams.get('projectRoot');
  const projectRoot = projectRootParam ?? process.cwd();

  if (projectRootParam && !isValidProjectRoot(projectRootParam)) {
    return NextResponse.json(
      { ok: false, error: { classification: 'validation', message: 'Invalid projectRoot path' } },
      { status: 400 }
    );
  }

  try {
    const issues = await readIssuesFromDisk({ projectRoot, preferBd: true });
    return NextResponse.json({ ok: true, issues });
  } catch (error) {
    console.error('[API/BeadsRead] Failed to read issues:', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          classification: 'internal_error',
          message: 'An internal error occurred while reading issues.',
        },
      },
      { status: 500 },
    );
  }
}
