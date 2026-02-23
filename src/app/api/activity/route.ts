import { activityEventBus } from '../../../lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const projectRoot = url.searchParams.get('projectRoot') || undefined;

  const history = activityEventBus.getHistory(projectRoot);

  return Response.json(history);
}
