/**
 * Agent Instance Persistence
 * 
 * Persists agent instances to disk so they survive app restarts.
 * Uses .beads/agents.jsonl for storage.
 */

import fs from 'fs/promises';
import path from 'path';
import type { AgentInstance } from './agent-instance';

const AGENTS_FILE = (projectRoot: string) => path.join(projectRoot, '.beads', 'agents.jsonl');

/**
 * Load all agent instances from disk.
 */
export async function loadAgentInstances(projectRoot: string): Promise<AgentInstance[]> {
  try {
    const content = await fs.readFile(AGENTS_FILE(projectRoot), 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

/**
 * Save a new agent instance to disk.
 */
export async function saveAgentInstance(projectRoot: string, instance: AgentInstance): Promise<void> {
  const agentsPath = AGENTS_FILE(projectRoot);
  await fs.mkdir(path.dirname(agentsPath), { recursive: true });
  
  const line = JSON.stringify(instance) + '\n';
  await fs.appendFile(agentsPath, line, 'utf-8');
}

/**
 * Update an existing agent instance in place.
 */
export async function updateAgentInstance(projectRoot: string, instance: AgentInstance): Promise<void> {
  const agentsPath = AGENTS_FILE(projectRoot);
  const instances = await loadAgentInstances(projectRoot);
  
  const idx = instances.findIndex(i => i.id === instance.id);
  if (idx >= 0) {
    instances[idx] = instance;
    await fs.writeFile(
      agentsPath,
      instances.map(i => JSON.stringify(i)).join('\n') + '\n',
      'utf-8'
    );
  }
}

/**
 * Get only active instances (spawning, working, idle).
 */
export async function getActiveInstances(projectRoot: string): Promise<AgentInstance[]> {
  const all = await loadAgentInstances(projectRoot);
  return all.filter(i => 
    i.status === 'spawning' || 
    i.status === 'working' || 
    i.status === 'idle'
  );
}

/**
 * Get recent completed/failed instances for history.
 */
export async function getRecentInstances(projectRoot: string, limit = 20): Promise<AgentInstance[]> {
  const all = await loadAgentInstances(projectRoot);
  return all
    .filter(i => i.status === 'completed' || i.status === 'failed')
    .sort((a, b) => 
      new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    )
    .slice(0, limit);
}

/**
 * Clear all agent instances (for testing/reset).
 */
export async function clearAgentInstances(projectRoot: string): Promise<void> {
  try {
    await fs.unlink(AGENTS_FILE(projectRoot));
  } catch {
    // File doesn't exist, that's fine
  }
}
