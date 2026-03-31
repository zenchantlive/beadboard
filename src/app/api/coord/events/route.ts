import { handleCoordEventsPost } from '../../../../lib/handlers/coord-events';

export async function POST(request: Request): Promise<Response> {
  return handleCoordEventsPost(request);
}
