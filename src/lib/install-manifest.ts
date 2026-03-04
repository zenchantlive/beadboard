export const INSTALLER_SCHEMA_VERSION = 'installer.v1' as const;
export const DRIVER_REMEDIATION_MODE = 'detect_only' as const;

export interface InstallerManifest {
  version: typeof INSTALLER_SCHEMA_VERSION;
  distribution: {
    packageName: string;
    shimNames: string[];
  };
  wrappers: {
    windows: {
      script: string;
    };
    posix: {
      script: string;
    };
  };
  runtime: {
    start: string;
    open: string;
    status: string;
  };
  driver: {
    remediationMode: typeof DRIVER_REMEDIATION_MODE;
    installSideEffects: false;
  };
}

export type InstallerManifestValidationResult =
  | { ok: true; value: InstallerManifest }
  | { ok: false; error: string };

function fail(error: string): InstallerManifestValidationResult {
  return { ok: false, error };
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
}

function nonEmptyString(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0;
}

export function validateInstallerManifest(input: unknown): InstallerManifestValidationResult {
  if (!isObject(input)) return fail('manifest must be an object');
  if (input.version !== INSTALLER_SCHEMA_VERSION) {
    return fail(`version must be "${INSTALLER_SCHEMA_VERSION}"`);
  }

  if (!isObject(input.distribution)) return fail('distribution is required');
  if (!nonEmptyString(input.distribution.packageName)) return fail('distribution.packageName is required');
  if (!Array.isArray(input.distribution.shimNames) || input.distribution.shimNames.length === 0) {
    return fail('distribution.shimNames must be a non-empty array');
  }
  for (const shimName of input.distribution.shimNames) {
    if (!nonEmptyString(shimName)) return fail('distribution.shimNames must contain only non-empty strings');
  }

  if (!isObject(input.wrappers)) return fail('wrappers is required');
  if (!isObject(input.wrappers.windows) || !nonEmptyString(input.wrappers.windows.script)) {
    return fail('wrappers.windows.script is required');
  }
  if (!isObject(input.wrappers.posix) || !nonEmptyString(input.wrappers.posix.script)) {
    return fail('wrappers.posix.script is required');
  }

  if (!isObject(input.runtime)) return fail('runtime is required');
  if (!nonEmptyString(input.runtime.start)) return fail('runtime.start is required');
  if (!nonEmptyString(input.runtime.open)) return fail('runtime.open is required');
  if (!nonEmptyString(input.runtime.status)) return fail('runtime.status is required');

  if (!isObject(input.driver)) return fail('driver is required');
  if (input.driver.remediationMode !== DRIVER_REMEDIATION_MODE) {
    return fail(`driver.remediationMode must be "${DRIVER_REMEDIATION_MODE}"`);
  }
  if (input.driver.installSideEffects !== false) {
    return fail('driver.installSideEffects must be false');
  }

  return { ok: true, value: input as unknown as InstallerManifest };
}

export const canonicalInstallerManifest: InstallerManifest = {
  version: INSTALLER_SCHEMA_VERSION,
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
    remediationMode: DRIVER_REMEDIATION_MODE,
    installSideEffects: false,
  },
};
