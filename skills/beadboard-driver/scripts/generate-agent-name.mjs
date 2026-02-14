#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

function normalizeList(raw, fallback) {
  const value = (raw || '').trim();
  if (!value) {
    return fallback;
  }
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function sanitizeName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildRandomSource() {
  const sequenceRaw = (process.env.BB_NAME_SEED_SEQUENCE || '').trim();
  if (!sequenceRaw) {
    return () => Math.random();
  }
  const sequence = sequenceRaw
    .split(',')
    .map((value) => Number.parseFloat(value.trim()))
    .filter((value) => Number.isFinite(value));
  let index = 0;
  return () => {
    if (sequence.length === 0) {
      return Math.random();
    }
    const value = sequence[index % sequence.length];
    index += 1;
    return Math.min(Math.max(value, 0), 0.999999);
  };
}

function pickIndex(length, randomFn) {
  if (length <= 1) {
    return 0;
  }
  return Math.floor(randomFn() * length);
}

async function nameExists(registryDir, agentName) {
  const filePath = path.join(registryDir, `${agentName}.json`);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function registryRoot() {
  if (process.env.BB_AGENT_REGISTRY_DIR) {
    return process.env.BB_AGENT_REGISTRY_DIR;
  }
  return path.join(process.env.USERPROFILE || os.homedir(), '.beadboard', 'agent', 'agents');
}

async function main() {
  try {
    const adjectives = normalizeList(process.env.BB_NAME_ADJECTIVES, [
      'green',
      'silver',
      'swift',
      'steady',
    ]);
    const nouns = normalizeList(process.env.BB_NAME_NOUNS, ['castle', 'harbor', 'falcon', 'orchard']);
    const maxRetriesRaw = Number.parseInt(process.env.BB_NAME_MAX_RETRIES || '12', 10);
    const maxRetries = Number.isInteger(maxRetriesRaw) && maxRetriesRaw > 0 ? maxRetriesRaw : 12;
    const random = buildRandomSource();
    const registryDir = registryRoot();

    let collisions = 0;
    let attempts = 0;
    for (let index = 0; index < maxRetries; index += 1) {
      attempts += 1;
      const adjective = adjectives[pickIndex(adjectives.length, random)];
      const noun = nouns[pickIndex(nouns.length, random)];
      const candidate = sanitizeName(`${adjective}-${noun}`);
      if (!candidate) {
        continue;
      }
      const exists = await nameExists(registryDir, candidate);
      if (!exists) {
        process.stdout.write(
          `${JSON.stringify(
            {
              ok: true,
              agent_name: candidate,
              attempts,
              collisions,
              registry_dir: registryDir,
            },
            null,
            2,
          )}\n`,
        );
        return;
      }
      collisions += 1;
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error_code: 'NAME_GENERATION_EXHAUSTED',
          reason: 'Unable to generate a unique agent name in allotted retries.',
          attempts,
          collisions,
          registry_dir: registryDir,
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error_code: 'NAME_GENERATION_INTERNAL_ERROR',
          reason: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      )}\n`,
    );
  }
}

void main();
