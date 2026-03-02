import { runBdCommand } from './bridge';
import { getDoltConnection } from './dolt-client';
import type { ResultSetHeader } from 'mysql2';

export interface BeadInteraction {
  id: string;
  bead_id: string;
  actor: string;
  kind: 'comment';
  text: string;
  timestamp: string;
}

export async function readInteractionsViaBd(projectRoot: string, beadId: string): Promise<BeadInteraction[]> {
  const command = await runBdCommand({
    projectRoot,
    args: ['comments', beadId, '--json'],
  });

  if (!command.success) {
    return [];
  }

  try {
    const parsed = JSON.parse(command.stdout);
    if (!Array.isArray(parsed)) return [];
    
    return parsed.map(c => ({
      id: String(c.id),
      bead_id: beadId,
      actor: c.author || 'unknown',
      kind: 'comment',
      text: c.text || '',
      timestamp: c.created_at || new Date().toISOString()
    }));
  } catch (error) {
    console.error('[Interactions] Failed to parse:', error);
    return [];
  }
}

function asNonEmptyProjectRoot(projectRoot: string): string {
  if (typeof projectRoot !== 'string' || !projectRoot.trim()) {
    throw new Error('projectRoot is required.');
  }

  return projectRoot.trim();
}

function asValidCommentId(commentId: number): number {
  if (!Number.isInteger(commentId) || commentId <= 0) {
    throw new Error('commentId must be a positive integer.');
  }

  return commentId;
}

function asNonEmptyCommentText(text: string): string {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('text is required.');
  }

  return text.trim();
}

export async function updateCommentViaDolt(projectRoot: string, commentId: number, text: string): Promise<boolean> {
  const root = asNonEmptyProjectRoot(projectRoot);
  const id = asValidCommentId(commentId);
  const nextText = asNonEmptyCommentText(text);

  const pool = await getDoltConnection(root);
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE comments SET text = ? WHERE id = ?',
    [nextText, id],
  );

  return result.affectedRows > 0;
}

export async function deleteCommentViaDolt(projectRoot: string, commentId: number): Promise<boolean> {
  const root = asNonEmptyProjectRoot(projectRoot);
  const id = asValidCommentId(commentId);

  const pool = await getDoltConnection(root);
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM comments WHERE id = ?',
    [id],
  );

  return result.affectedRows > 0;
}
