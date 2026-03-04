import test from 'node:test';
import assert from 'node:assert/strict';

import { validateInstallerManifest } from '../../src/lib/install-manifest';

function validManifest(): any {
  return {
    version: 'installer.v1',
    distribution: {
      packageName: 'beadboard',
      shimNames: ['bb', 'beadboard'],
    },
    wrappers: {
      windows: { script: 'install.ps1' },
      posix: { script: 'install.sh' },
    },
    runtime: {
      start: 'beadboard start',
      open: 'beadboard open',
      status: 'beadboard status',
    },
    driver: {
      remediationMode: 'detect_only',
      installSideEffects: false,
    },
  };
}

test('validateInstallerManifest accepts canonical installer.v1 shape', () => {
  const result = validateInstallerManifest(validManifest());
  assert.equal(result.ok, true);
});

test('validateInstallerManifest rejects wrong version', () => {
  const manifest = validManifest();
  manifest.version = 'installer.v2';

  const result = validateInstallerManifest(manifest);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /version/i);
  }
});

test('validateInstallerManifest rejects missing runtime status command', () => {
  const manifest = validManifest();
  delete manifest.runtime.status;

  const result = validateInstallerManifest(manifest);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /runtime\.status/i);
  }
});

test('validateInstallerManifest rejects driver mode that is not detect_only', () => {
  const manifest = validManifest();
  manifest.driver.remediationMode = 'install';

  const result = validateInstallerManifest(manifest);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /detect_only/i);
  }
});

