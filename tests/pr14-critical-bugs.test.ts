#!/usr/bin/env node
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const repoRoot = path.resolve(process.cwd());

describe('PR 14 Critical Bugs', () => {
  describe('Bug 1: CLI needs dev tsx', () => {
    it('should have tsx in production dependencies if bin/beadboard.js uses tsx', async () => {
      const binPath = path.join(repoRoot, 'bin', 'beadboard.js');
      const packageJsonPath = path.join(repoRoot, 'package.json');

      if (!fs.existsSync(binPath)) {
        throw new Error('bin/beadboard.js not found');
      }

      const binContent = fs.readFileSync(binPath, 'utf8');
      const usesTsx = binContent.includes('--import tsx') || binContent.includes('tsx');

      if (!usesTsx) {
        console.log('✓ Bug 1: bin/beadboard.js does not use tsx');
        return;
      }

      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      if (!packageJson.dependencies || !packageJson.dependencies.tsx) {
        throw new Error('bin/beadboard.js uses tsx but tsx is not in production dependencies');
      }

      console.log('✓ Bug 1: tsx is in production dependencies for CLI use');
    });

    it('should have package.json configured correctly for CLI production use', async () => {
      const packageJsonPath = path.join(repoRoot, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      if (!packageJson.bin) {
        throw new Error('package.json missing bin field');
      }

      if (!packageJson.bin.beadboard && !packageJson.bin.bb) {
        throw new Error('package.json bin field missing beadboard or bb');
      }

      console.log('✓ Bug 1: package.json has bin field configured');
    });
  });

  describe('Bug 2: bb shim target exists', () => {
    it('should have tools/bb.ts file that the bb shim points to', async () => {
      const bbTsPath = path.join(repoRoot, 'tools', 'bb.ts');

      if (!fs.existsSync(bbTsPath)) {
        throw new Error('tools/bb.ts does not exist - bb shim will fail');
      }

      console.log('✓ Bug 2: tools/bb.ts exists');
    });
  });

  describe('Bug 3: spawn() has error handlers', () => {
    it('should have error handlers on spawn() calls in beadboard.mjs', async () => {
      const beadboardMjsPath = path.join(repoRoot, 'install', 'beadboard.mjs');

      if (!fs.existsSync(beadboardMjsPath)) {
        throw new Error('install/beadboard.mjs not found');
      }

      const content = fs.readFileSync(beadboardMjsPath, 'utf8');

      const spawnCalls = [];

      const spawnPattern = /spawn\s*\(/g;
      let match;
      while ((match = spawnPattern.exec(content)) !== null) {
        spawnCalls.push(match.index);
      }

      if (spawnCalls.length === 0) {
        throw new Error('No spawn() calls found in beadboard.mjs');
      }

      const spawnWithErrors = [];
      spawnCalls.forEach((index) => {
        const context = content.substring(index, index + 500);

        if (context.includes('.on(\'error\'') || context.includes('on("error"')) {
          spawnWithErrors.push(index);
        }
      });

      if (spawnWithErrors.length < spawnCalls.length) {
        throw new Error(
          `Found ${spawnCalls.length} spawn() calls but only ${spawnWithErrors.length} have error handlers. ` +
          `All spawn() calls must have error event handlers to prevent crashes.`
        );
      }

      console.log('✓ Bug 3: All spawn() calls have error handlers');
    });
  });
});
