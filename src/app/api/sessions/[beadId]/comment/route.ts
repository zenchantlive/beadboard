import { NextResponse } from 'next/server';
import { executeMutation, validateMutationPayload } from '../../../../../lib/mutations';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ beadId: string }> }
): Promise<Response> {
  const { beadId } = await params;
  const body = await request.json();

  try {
    const payload = validateMutationPayload('comment', {
      ...body,
      id: beadId
    });

    const result = await executeMutation('comment', payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 400 });
  }
}
