import { runBdCommand } from './bridge';

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
