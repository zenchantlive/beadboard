/**
 * runtime-persistence.ts
 *
 * Write-through persistence layer for orchestrator runtime state.
 * Uses synchronous fs operations for simplicity and guaranteed ordering.
 * All state is stored under .beadboard/runtime/ within the project root.
 */

import fs from 'node:fs';
import path from 'node:path';

export const RUNTIME_DIR = '.beadboard/runtime';

/**
 * Ensure the runtime directory exists and return its absolute path.
 */
export function ensureDir(projectRoot: string): string {
  const dir = path.join(projectRoot, RUNTIME_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Write-through: append a JSON line to a JSONL file.
 */
export function appendJsonl(projectRoot: string, filename: string, record: unknown): void {
  const dir = ensureDir(projectRoot);
  const filePath = path.join(dir, filename);
  fs.appendFileSync(filePath, JSON.stringify(record) + '\n');
}

/**
 * Write-through: overwrite entire file with current state.
 */
export function writeJsonl(projectRoot: string, filename: string, records: unknown[]): void {
  const dir = ensureDir(projectRoot);
  const filePath = path.join(dir, filename);
  const content =
    records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : '');
  fs.writeFileSync(filePath, content);
}

/**
 * Read: load all records from a JSONL file.
 * Returns an empty array if the file does not exist.
 */
export function readJsonl<T>(projectRoot: string, filename: string): T[] {
  const filePath = path.join(projectRoot, RUNTIME_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}
