import { NextResponse } from 'next/server';
import path from 'node:path';
import { activityEventBus } from '../../../lib/realtime';

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
  
  if (projectRootParam && !isValidProjectRoot(projectRootParam)) {
    return NextResponse.json(
      { error: 'Invalid projectRoot path' },
      { status: 400 }
    );
  }

  const projectRoot = projectRootParam || undefined;
  const history = activityEventBus.getHistory(projectRoot);

  return Response.json(history);
}
