import { NextRequest, NextResponse } from 'next/server';
import { readInteractionsViaBd } from '../../../../../lib/read-interactions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const projectRoot = request.nextUrl.searchParams.get('projectRoot');

  if (!projectRoot) {
    return NextResponse.json(
      { ok: false, error: { message: 'projectRoot is required' } },
      { status: 400 }
    );
  }

  try {
    const comments = await readInteractionsViaBd(projectRoot, id);
    return NextResponse.json({ ok: true, comments });
  } catch (error) {
    console.error('[API] Failed to fetch comments:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to fetch comments' } },
      { status: 500 }
    );
  }
}
