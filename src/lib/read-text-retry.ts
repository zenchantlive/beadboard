import fs from 'node:fs/promises';

const DEFAULT_RETRY_CODES = new Set(['EBUSY', 'EPERM']);

export interface ReadTextRetryOptions {
  retries?: number;
  delayMs?: number;
  retryCodes?: Set<string>;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function shouldRetry(error: unknown, retryCodes: Set<string>): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === 'string' && retryCodes.has(code);
}

export async function readTextFileWithRetry(
  filePath: string,
  options: ReadTextRetryOptions = {},
): Promise<string> {
  const retries = options.retries ?? 2;
  const delayMs = options.delayMs ?? 40;
  const retryCodes = options.retryCodes ?? DEFAULT_RETRY_CODES;

  let attempt = 0;
  while (true) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error, retryCodes)) {
        throw error;
      }

      attempt += 1;
      await sleep(delayMs);
    }
  }
}
