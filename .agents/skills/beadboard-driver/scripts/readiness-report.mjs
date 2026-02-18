#!/usr/bin/env node

import fs from 'node:fs/promises';

function parseArgs(argv) {
  const output = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      output[key] = 'true';
      continue;
    }
    output[key] = value;
    index += 1;
  }
  return output;
}

function parseJsonArray(raw, fallback) {
  if (!raw) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function withArtifactExistence(artifacts) {
  const output = [];
  for (const artifact of artifacts) {
    const item = {
      path: artifact.path,
      required: Boolean(artifact.required),
      exists: false,
    };
    if (typeof artifact.path === 'string' && artifact.path.trim()) {
      try {
        await fs.access(artifact.path);
        item.exists = true;
      } catch {
        item.exists = false;
      }
    }
    output.push(item);
  }
  return output;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const checks = parseJsonArray(args.checks, []);
    const artifacts = parseJsonArray(args.artifacts, []);
    const dependencySanity = args['dependency-note'] || '';

    const normalizedChecks = checks.map((check) => ({
      name: check.name || 'unnamed-check',
      ok: Boolean(check.ok),
      details: check.details || '',
    }));
    const normalizedArtifacts = await withArtifactExistence(artifacts);

    const allChecksPass = normalizedChecks.every((check) => check.ok);
    const requiredArtifactsPresent = normalizedArtifacts.every((artifact) => !artifact.required || artifact.exists);
    const ready = allChecksPass && requiredArtifactsPresent;

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          generated_at: new Date().toISOString(),
          checks: normalizedChecks,
          artifacts: normalizedArtifacts,
          dependency_sanity: dependencySanity,
          summary: {
            checks_passed: allChecksPass,
            required_artifacts_present: requiredArtifactsPresent,
            ready,
          },
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
          reason: error instanceof Error ? error.message : String(error),
          summary: {
            checks_passed: false,
            required_artifacts_present: false,
            ready: false,
          },
        },
        null,
        2,
      )}\n`,
    );
  }
}

void main();
