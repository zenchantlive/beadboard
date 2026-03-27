#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

function sanitizeSegment(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function registryRoot() {
  if (process.env.BB_AGENT_REGISTRY_DIR) {
    return process.env.BB_AGENT_REGISTRY_DIR;
  }
  return path.join(process.env.USERPROFILE || os.homedir(), '.beadboard', 'agent', 'agents');
}

function toRegistryKey(name) {
  return name.replace(/[\/#]/g, '__');
}

async function nameExists(registryDir, runtimeName) {
  const filePath = path.join(registryDir, `${toRegistryKey(runtimeName)}.json`);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildCandidate(archetypeId, scope, ordinal) {
  if (scope) {
    return ordinal > 1 ? `${archetypeId}/${scope}#${ordinal}` : `${archetypeId}/${scope}`;
  }
  return `${archetypeId}#${ordinal}`;
}

async function main() {
  try {
    const archetypeId = sanitizeSegment(process.env.BB_ARCHETYPE_ID || process.env.BB_AGENT_TYPE_ID);
    const scope = sanitizeSegment(process.env.BB_INSTANCE_SCOPE || process.env.BB_AGENT_SCOPE);
    const initialOrdinalRaw = Number.parseInt(process.env.BB_INSTANCE_ORDINAL || '1', 10);
    const initialOrdinal = Number.isInteger(initialOrdinalRaw) && initialOrdinalRaw > 0 ? initialOrdinalRaw : 1;
    const maxRetriesRaw = Number.parseInt(process.env.BB_NAME_MAX_RETRIES || '12', 10);
    const maxRetries = Number.isInteger(maxRetriesRaw) && maxRetriesRaw > 0 ? maxRetriesRaw : 12;
    const registryDir = registryRoot();

    if (!archetypeId) {
      process.stdout.write(
        `${JSON.stringify({
          ok: false,
          error_code: 'ARCHETYPE_ID_REQUIRED',
          reason: 'Set BB_ARCHETYPE_ID to an approved archetype before generating a runtime instance name.',
        }, null, 2)}\n`,
      );
      return;
    }

    let collisions = 0;
    let attempts = 0;
    for (let offset = 0; offset < maxRetries; offset += 1) {
      attempts += 1;
      const ordinal = initialOrdinal + offset;
      const runtimeInstanceName = buildCandidate(archetypeId, scope, ordinal);
      const exists = await nameExists(registryDir, runtimeInstanceName);
      if (!exists) {
        process.stdout.write(
          `${JSON.stringify({
            ok: true,
            agent_name: runtimeInstanceName,
            runtime_instance_name: runtimeInstanceName,
            archetype_id: archetypeId,
            scope: scope || null,
            ordinal,
            attempts,
            collisions,
            registry_dir: registryDir,
          }, null, 2)}\n`,
        );
        return;
      }
      collisions += 1;
    }

    process.stdout.write(
      `${JSON.stringify({
        ok: false,
        error_code: 'NAME_GENERATION_EXHAUSTED',
        reason: 'Unable to generate a unique runtime instance name in allotted retries.',
        archetype_id: archetypeId,
        scope: scope || null,
        attempts,
        collisions,
        registry_dir: registryDir,
      }, null, 2)}\n`,
    );
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({
        ok: false,
        error_code: 'NAME_GENERATION_INTERNAL_ERROR',
        reason: error instanceof Error ? error.message : String(error),
      }, null, 2)}\n`,
    );
  }
}

void main();
