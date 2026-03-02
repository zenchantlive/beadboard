import { NextResponse } from 'next/server';

import { deleteCommentViaDolt, updateCommentViaDolt } from '../../../../../../lib/read-interactions';

export const dynamic = 'force-dynamic';

interface RouteParams {
  id: string;
  commentId: string;
}

interface PatchBody {
  projectRoot?: unknown;
  text?: unknown;
}

interface CommentMutationDeps {
  updateComment: (projectRoot: string, commentId: number, text: string) => Promise<boolean>;
  deleteComment: (projectRoot: string, commentId: number) => Promise<boolean>;
}

const defaultDeps: CommentMutationDeps = {
  updateComment: updateCommentViaDolt,
  deleteComment: deleteCommentViaDolt,
};

function parseCommentId(raw: string): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('commentId must be a positive integer.');
  }

  return parsed;
}

function parseProjectRoot(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('projectRoot is required.');
  }

  return raw.trim();
}

function parseCommentText(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('text is required.');
  }

  return raw.trim();
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ ok: false, error: { message } }, { status: 400 });
}

function notFound(message: string): NextResponse {
  return NextResponse.json({ ok: false, error: { message } }, { status: 404 });
}

function serverError(message: string): NextResponse {
  return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
}

export async function handlePatchCommentRequest(
  request: Request,
  params: RouteParams,
  deps: CommentMutationDeps,
): Promise<NextResponse> {
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return badRequest('Invalid JSON body.');
  }

  let projectRoot: string;
  let commentId: number;
  let text: string;

  try {
    projectRoot = parseProjectRoot(body.projectRoot);
    commentId = parseCommentId(params.commentId);
    text = parseCommentText(body.text);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Invalid request.');
  }

  try {
    const updated = await deps.updateComment(projectRoot, commentId, text);
    if (!updated) {
      return notFound('Comment not found.');
    }

    return NextResponse.json({ ok: true, id: params.id, commentId });
  } catch (error) {
    console.error('[API] Failed to update comment:', error);
    return serverError('Failed to update comment.');
  }
}

export async function handleDeleteCommentRequest(
  request: Request,
  params: RouteParams,
  deps: CommentMutationDeps,
): Promise<NextResponse> {
  let projectRoot: string;
  let commentId: number;

  try {
    projectRoot = parseProjectRoot(new URL(request.url).searchParams.get('projectRoot'));
    commentId = parseCommentId(params.commentId);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Invalid request.');
  }

  try {
    const deleted = await deps.deleteComment(projectRoot, commentId);
    if (!deleted) {
      return notFound('Comment not found.');
    }

    return NextResponse.json({ ok: true, id: params.id, commentId });
  } catch (error) {
    console.error('[API] Failed to delete comment:', error);
    return serverError('Failed to delete comment.');
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  return handlePatchCommentRequest(request, await params, defaultDeps);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  return handleDeleteCommentRequest(request, await params, defaultDeps);
}
