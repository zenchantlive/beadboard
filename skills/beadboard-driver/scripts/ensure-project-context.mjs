#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const args = new Set();
  const values = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args.add(key);
      continue;
    }
    values[key] = next;
    i += 1;
  }

  return { args, values };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { values } = parseArgs(process.argv.slice(2));
  const projectRoot = values['project-root'] ? path.resolve(values['project-root']) : process.cwd();

  const thisFile = fileURLToPath(import.meta.url);
  const skillRoot = path.resolve(path.dirname(thisFile), '..');
  const templatePath = path.join(skillRoot, 'project.template.md');
  const targetPath = path.join(projectRoot, 'project.md');

  const targetExists = await exists(targetPath);
  if (targetExists) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          created: false,
          used_existing: true,
          project_root: projectRoot,
          target_path: targetPath,
          template_path: templatePath,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const template = await fs.readFile(templatePath, 'utf8');
  await fs.writeFile(targetPath, template, 'utf8');

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        created: true,
        used_existing: false,
        project_root: projectRoot,
        target_path: targetPath,
        template_path: templatePath,
      },
      null,
      2,
    )}\n`,
  );
}

void main();
