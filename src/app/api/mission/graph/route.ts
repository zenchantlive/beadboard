import { NextResponse } from 'next/server';
import { runBdCommand } from '../../../../lib/bridge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');
  const id = searchParams.get('id');

  if (!projectRoot || !id) {
    return NextResponse.json({ ok: false, error: 'projectRoot and id are required' }, { status: 400 });
  }

  // 1. Get the mission/epic bead itself
  const headResult = await runBdCommand({
    projectRoot,
    args: ['show', id, '--json'],
  });

  // 2. Get children
  const childrenResult = await runBdCommand({
    projectRoot,
    args: ['list', '--parent', id, '--json'],
  });

  if (!headResult.success) {
     return NextResponse.json({ ok: false, error: 'Failed to fetch mission head' }, { status: 500 });
  }

  try {
    const head = JSON.parse(headResult.stdout);
    let children = [];
    if (childrenResult.success && childrenResult.stdout.trim()) {
        children = JSON.parse(childrenResult.stdout);
    }

    const headObj = Array.isArray(head) ? head[0] : head;
    
    // Transform for graph view (if needed, or just return raw issues and let UI handle it)
    // The WorkflowGraph component expects BeadIssue[]
    const nodes = [headObj, ...children];

    return NextResponse.json({ ok: true, data: { nodes } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Failed to parse graph data' }, { status: 500 });
  }
}
