import fs from 'node:fs';
import path from 'node:path';

const WRITE_APIS = [
  'writeFile',
  'writeFileSync',
  'appendFile',
  'appendFileSync',
  'createWriteStream',
];

function listFilesRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else if (/\.(ts|tsx|js|mjs|cjs)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function findLineNumber(source, index) {
  const prefix = source.slice(0, index);
  return prefix.split(/\r?\n/).length;
}

export function scanForDirectIssuesJsonlWrites(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files = listFilesRecursive(rootDir);
  const violations = [];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');
    const lowered = source.toLowerCase();

    if (!lowered.includes('issues.jsonl')) {
      continue;
    }

    for (const api of WRITE_APIS) {
      const regex = new RegExp(`${api}\\s*\\([\\s\\S]{0,300}?issues\\.jsonl`, 'gi');
      let match = regex.exec(source);
      while (match) {
        violations.push({
          file: filePath.replaceAll('\\\\', '/'),
          line: findLineNumber(source, match.index),
          snippet: match[0].slice(0, 160),
        });
        match = regex.exec(source);
      }
    }
  }

  return violations;
}
