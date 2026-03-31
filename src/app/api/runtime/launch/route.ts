import { handleRuntimeLaunchPost } from '../../../../lib/handlers/runtime-launch';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return handleRuntimeLaunchPost(request);
}
