import path from 'node:path';
import fs from 'node:fs';
import { NextResponse } from 'next/server';

/**
 * Validate that a projectRoot parameter is safe to use for filesystem operations.
 * Rejects missing values, relative paths, paths with traversal segments, and
 * paths that don't look like a beads-enabled project directory.
 */
export function validateProjectRoot(projectRoot: unknown): { valid: true; projectRoot: string } | { valid: false; error: NextResponse } {
  if (!projectRoot || typeof projectRoot !== 'string') {
    return { valid: false, error: NextResponse.json({ error: 'Missing projectRoot' }, { status: 400 }) };
  }

  // Must be absolute path
  if (!path.isAbsolute(projectRoot)) {
    return { valid: false, error: NextResponse.json({ error: 'projectRoot must be an absolute path' }, { status: 400 }) };
  }

  // Reject path traversal
  const normalized = path.normalize(projectRoot);
  if (normalized !== projectRoot && normalized !== projectRoot.replace(/\/$/, '')) {
    return { valid: false, error: NextResponse.json({ error: 'Invalid projectRoot path' }, { status: 400 }) };
  }

  // Must have a .beads directory (confirms it's a beads-enabled project)
  const beadsDir = path.join(normalized, '.beads');
  if (!fs.existsSync(beadsDir)) {
    return { valid: false, error: NextResponse.json({ error: 'Not a beads-enabled project directory' }, { status: 400 }) };
  }

  return { valid: true, projectRoot: normalized };
}
