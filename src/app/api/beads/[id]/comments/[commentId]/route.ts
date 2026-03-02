import type { NextResponse } from 'next/server';
import { handleDeleteCommentRequest, handlePatchCommentRequest, type RouteParams } from './comment-mutation';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  return handlePatchCommentRequest(request, await params);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  return handleDeleteCommentRequest(request, await params);
}
