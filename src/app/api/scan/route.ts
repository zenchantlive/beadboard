import { NextResponse } from 'next/server';

import { scanForProjects } from '../../../lib/scanner';
import type { ScanMode } from '../../../lib/scanner';

export const runtime = 'nodejs';

function parseMode(value: string | null): ScanMode {
  if (!value || value === 'default') {
    return 'default';
  }

  if (value === 'full-drive') {
    return 'full-drive';
  }

  throw new Error('Invalid scan mode. Use mode=default or mode=full-drive.');
}

function parseDepth(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Depth must be a non-negative integer.');
  }

  return parsed;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const mode = parseMode(url.searchParams.get('mode'));
    const maxDepth = parseDepth(url.searchParams.get('depth'));
    const result = await scanForProjects({ mode, maxDepth });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to scan projects.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
