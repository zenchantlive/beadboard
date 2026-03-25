import assert from 'node:assert/strict';
import os from 'node:os';
import test from 'node:test';

import { resolveProjectScope, type ProjectScopeRegistryEntry } from '../../src/lib/project-scope';

const IS_WINDOWS = os.platform() === 'win32';

if (IS_WINDOWS) {
  const REGISTRY: ProjectScopeRegistryEntry[] = [
    { path: 'D:/Repos/Alpha' },
    { path: 'D:/Repos/Beta' },
  ];

  test('resolveProjectScope defaults to local when query key is missing', () => {
    const scope = resolveProjectScope({
      currentProjectRoot: 'C:/Users/test/project/beadboard',
      registryProjects: REGISTRY,
    });

    assert.equal(scope.mode, 'single');
    assert.equal(scope.selected.source, 'local');
    assert.equal(scope.selected.root, 'C:\\Users\\test\\project\\beadboard');
    assert.equal(scope.selected.key, 'local');
    assert.deepEqual(scope.readRoots, ['C:\\Users\\test\\project\\beadboard']);
    assert.equal(scope.options[0].key, 'local');
    assert.equal(scope.options.length, 3);
  });

  test('resolveProjectScope selects registry project when key matches', () => {
    const scope = resolveProjectScope({
      currentProjectRoot: 'C:/Users/test/project/beadboard',
      registryProjects: REGISTRY,
      requestedProjectKey: 'd:\\repos\\beta',
    });

    assert.equal(scope.selected.source, 'registry');
    assert.equal(scope.selected.root, 'D:\\Repos\\Beta');
    assert.equal(scope.selected.key, 'd:\\repos\\beta');
    assert.deepEqual(scope.readRoots, ['D:\\Repos\\Beta']);
  });

  test('resolveProjectScope deduplicates registry entries by normalized key', () => {
    const scope = resolveProjectScope({
      currentProjectRoot: 'C:/Users/test/project/beadboard',
      registryProjects: [{ path: 'D:/Repos/Alpha/' }, { path: 'd:\\repos\\alpha' }],
    });

    assert.equal(scope.options.length, 2);
    assert.equal(scope.options.filter((option) => option.source === 'registry').length, 1);
  });

  test('resolveProjectScope supports aggregate mode and reads all roots', () => {
    const scope = resolveProjectScope({
      currentProjectRoot: 'C:/Users/test/project/beadboard',
      registryProjects: REGISTRY,
      requestedProjectKey: 'd:\\repos\\alpha',
      requestedMode: 'aggregate',
    });

    assert.equal(scope.mode, 'aggregate');
    assert.equal(scope.selected.key, 'd:\\repos\\alpha');
    assert.deepEqual(scope.readRoots, [
      'C:\\Users\\test\\project\\beadboard',
      'D:\\Repos\\Alpha',
      'D:\\Repos\\Beta',
    ]);
  });
} else {
  const REGISTRY: ProjectScopeRegistryEntry[] = [
    { path: '/opt/repos/alpha' },
    { path: '/opt/repos/beta' },
  ];

  test('resolveProjectScope defaults to local when query key is missing', () => {
    const scope = resolveProjectScope({
      currentProjectRoot: '/opt/beadboard',
      registryProjects: REGISTRY,
    });

    assert.equal(scope.mode, 'single');
    assert.equal(scope.selected.source, 'local');
    assert.equal(scope.selected.root, '/opt/beadboard');
    assert.equal(scope.selected.key, 'local');
    assert.deepEqual(scope.readRoots, ['/opt/beadboard']);
    assert.equal(scope.options[0].key, 'local');
    assert.equal(scope.options.length, 3);
  });

  test('resolveProjectScope selects registry project when key matches', () => {
    const scope = resolveProjectScope({
      currentProjectRoot: '/opt/beadboard',
      registryProjects: REGISTRY,
      requestedProjectKey: '/opt/repos/beta',
    });

    assert.equal(scope.selected.source, 'registry');
    assert.equal(scope.selected.root, '/opt/repos/beta');
    assert.deepEqual(scope.readRoots, ['/opt/repos/beta']);
  });

  test('resolveProjectScope deduplicates registry entries', () => {
    const scope = resolveProjectScope({
      currentProjectRoot: '/opt/beadboard',
      registryProjects: [{ path: '/opt/repos/alpha/' }, { path: '/opt/repos/alpha' }],
    });

    assert.equal(scope.options.length, 2);
    assert.equal(scope.options.filter((option) => option.source === 'registry').length, 1);
  });

  test('resolveProjectScope supports aggregate mode and reads all roots', () => {
    const scope = resolveProjectScope({
      currentProjectRoot: '/opt/beadboard',
      registryProjects: REGISTRY,
      requestedProjectKey: '/opt/repos/alpha',
      requestedMode: 'aggregate',
    });

    assert.equal(scope.mode, 'aggregate');
    assert.deepEqual(scope.readRoots, [
      '/opt/beadboard',
      '/opt/repos/alpha',
      '/opt/repos/beta',
    ]);
  });
}

test('resolveProjectScope falls back to local when query key is unknown', () => {
  const scope = resolveProjectScope({
    currentProjectRoot: IS_WINDOWS ? 'C:/Users/test/project' : '/opt/beadboard',
    registryProjects: [],
    requestedProjectKey: '/nonexistent',
  });

  assert.equal(scope.selected.source, 'local');
  assert.equal(scope.selected.key, 'local');
});

test('resolveProjectScope falls back to single mode for unknown mode values', () => {
  const scope = resolveProjectScope({
    currentProjectRoot: IS_WINDOWS ? 'C:/Users/test/project' : '/opt/beadboard',
    registryProjects: [],
    requestedMode: 'invalid-mode',
  });

  assert.equal(scope.mode, 'single');
});
