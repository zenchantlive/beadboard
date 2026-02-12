import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'src/app/layout.tsx',
  'src/app/page.tsx',
];

test('bootstrap scaffold files exist', () => {
  for (const file of requiredFiles) {
    assert.equal(fs.existsSync(file), true, `missing file: ${file}`);
  }
});

test('package.json has next/react/typescript scripts and deps', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  assert.equal(pkg.dependencies.next?.startsWith('15'), true, 'next@15 required');
  assert.equal(pkg.dependencies.react?.startsWith('19'), true, 'react@19 required');
  assert.equal(pkg.dependencies['react-dom']?.startsWith('19'), true, 'react-dom@19 required');
  assert.equal(pkg.devDependencies.typescript?.length > 0, true, 'typescript required');
  assert.equal(typeof pkg.scripts.dev, 'string', 'dev script required');
  assert.equal(typeof pkg.scripts.build, 'string', 'build script required');
  assert.equal(typeof pkg.scripts.start, 'string', 'start script required');
  assert.equal(typeof pkg.scripts.typecheck, 'string', 'typecheck script required');
});
