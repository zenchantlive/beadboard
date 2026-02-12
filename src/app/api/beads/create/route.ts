import { handleMutationRequest } from '../_shared';

export async function POST(request: Request): Promise<Response> {
  return handleMutationRequest(request, 'create');
}
