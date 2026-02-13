import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveProjectScope, type ProjectScopeRegistryEntry } from '../../src/lib/project-scope';

const REGISTRY: ProjectScopeRegistryEntry[] = [
  { path: 'D:/Repos/Alpha' },
  { path: 'D:/Repos/Beta' },
];

test('resolveProjectScope defaults to local when query key is missing', () => {
  const scope = resolveProjectScope({
    currentProjectRoot: 'C:/Users/Zenchant/codex/beadboard',
    registryProjects: REGISTRY,
  });

  assert.equal(scope.mode, 'single');
  assert.equal(scope.selected.source, 'local');
  assert.equal(scope.selected.root, 'C:\\Users\\Zenchant\\codex\\beadboard');
  assert.equal(scope.selected.key, 'local');
  assert.deepEqual(scope.readRoots, ['C:\\Users\\Zenchant\\codex\\beadboard']);
  assert.equal(scope.options[0].key, 'local');
  assert.equal(scope.options.length, 3);
});

test('resolveProjectScope selects registry project when key matches', () => {
  const scope = resolveProjectScope({
    currentProjectRoot: 'C:/Users/Zenchant/codex/beadboard',
    registryProjects: REGISTRY,
    requestedProjectKey: 'd:\\repos\\beta',
  });

  assert.equal(scope.selected.source, 'registry');
  assert.equal(scope.selected.root, 'D:\\Repos\\Beta');
  assert.equal(scope.selected.key, 'd:\\repos\\beta');
  assert.deepEqual(scope.readRoots, ['D:\\Repos\\Beta']);
});

test('resolveProjectScope falls back to local when query key is unknown', () => {
  const scope = resolveProjectScope({
    currentProjectRoot: 'C:/Users/Zenchant/codex/beadboard',
    registryProjects: REGISTRY,
    requestedProjectKey: 'd:\\repos\\missing',
  });

  assert.equal(scope.selected.source, 'local');
  assert.equal(scope.selected.key, 'local');
  assert.deepEqual(scope.readRoots, ['C:\\Users\\Zenchant\\codex\\beadboard']);
});

test('resolveProjectScope deduplicates registry entries by normalized key', () => {
  const scope = resolveProjectScope({
    currentProjectRoot: 'C:/Users/Zenchant/codex/beadboard',
    registryProjects: [{ path: 'D:/Repos/Alpha/' }, { path: 'd:\\repos\\alpha' }],
  });

  assert.equal(scope.options.length, 2);
  assert.equal(scope.options.filter((option) => option.source === 'registry').length, 1);
});

test('resolveProjectScope supports aggregate mode and reads all roots', () => {
  const scope = resolveProjectScope({
    currentProjectRoot: 'C:/Users/Zenchant/codex/beadboard',
    registryProjects: REGISTRY,
    requestedProjectKey: 'd:\\repos\\alpha',
    requestedMode: 'aggregate',
  });

  assert.equal(scope.mode, 'aggregate');
  assert.equal(scope.selected.key, 'd:\\repos\\alpha');
  assert.deepEqual(scope.readRoots, [
    'C:\\Users\\Zenchant\\codex\\beadboard',
    'D:\\Repos\\Alpha',
    'D:\\Repos\\Beta',
  ]);
});

test('resolveProjectScope falls back to single mode for unknown mode values', () => {
  const scope = resolveProjectScope({
    currentProjectRoot: 'C:/Users/Zenchant/codex/beadboard',
    registryProjects: REGISTRY,
    requestedMode: 'invalid-mode',
  });

  assert.equal(scope.mode, 'single');
  assert.deepEqual(scope.readRoots, ['C:\\Users\\Zenchant\\codex\\beadboard']);
});
