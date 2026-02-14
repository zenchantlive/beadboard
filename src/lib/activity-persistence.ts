import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ActivityEvent } from './activity';

function userProfileRoot(): string {
  return process.env.USERPROFILE?.trim() || os.homedir();
}

export function activityFilePath(): string {
  return path.join(userProfileRoot(), '.beadboard', 'activity.json');
}

export async function loadActivityHistory(): Promise<ActivityEvent[]> {
  const filePath = activityFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error('[ActivityPersistence] Failed to load history:', error);
    return [];
  }
}

export async function saveActivityHistory(history: ActivityEvent[]): Promise<void> {
  const filePath = activityFilePath();
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('[ActivityPersistence] Failed to save history:', error);
  }
}
