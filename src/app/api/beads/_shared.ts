import { NextResponse } from 'next/server';

import { executeMutation, MutationValidationError, validateMutationPayload, type MutationOperation } from '../../../lib/mutations';

function badRequest(message: string, operation: MutationOperation) {
  return NextResponse.json(
    {
      ok: false,
      operation,
      error: {
        classification: 'bad_args',
        message,
      },
    },
    { status: 400 },
  );
}

export async function handleMutationRequest(request: Request, operation: MutationOperation): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body.', operation);
  }

  try {
    const payload = validateMutationPayload(operation, body);
    const result = await executeMutation(operation, payload);

    const status = result.ok ? 200 : result.error?.classification === 'not_found' ? 404 : 400;
    return NextResponse.json(result, { status });
  } catch (error) {
    if (error instanceof MutationValidationError) {
      return badRequest(error.message, operation);
    }

    return NextResponse.json(
      {
        ok: false,
        operation,
        error: {
          classification: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown mutation error.',
        },
      },
      { status: 500 },
    );
  }
}
