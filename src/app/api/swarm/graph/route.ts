import { NextResponse } from 'next/server';
import { runBdCommand } from '../../../../lib/bridge';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');
  const epicId = searchParams.get('epic');

  if (!projectRoot || !epicId) {
    return NextResponse.json({ ok: false, error: 'projectRoot and epic are required' }, { status: 400 });
  }

  // 1. Get the epic itself
  const epicResult = await runBdCommand({
    projectRoot,
    args: ['show', epicId, '--json'],
  });

  // 2. Get children
  const childrenResult = await runBdCommand({
    projectRoot,
    args: ['list', '--parent', epicId, '--json'],
  });

  if (!epicResult.success) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch epic' }, { status: 500 });
  }

  try {
    const epic = JSON.parse(epicResult.stdout);
    // Handle list returning empty or error gracefully
    let children = [];
    if (childrenResult.success && childrenResult.stdout.trim()) {
      children = JSON.parse(childrenResult.stdout);
      // bd list returns array, bd show returns object (or array of 1)
    }

    const epicObj = Array.isArray(epic) ? epic[0] : epic;
    const issues = [epicObj, ...children];

    return NextResponse.json({ ok: true, data: issues });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to parse graph data' }, { status: 500 });
  }
}
