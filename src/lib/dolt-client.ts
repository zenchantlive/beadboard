import fs from 'node:fs/promises';
import path from 'node:path';

import mysql from 'mysql2/promise';

export class DoltConnectionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DoltConnectionError';
  }
}

interface DoltMetadata {
  dolt_server_port: number;
  dolt_database: string;
  dolt_server_host?: string;
}

async function readDoltMetadata(projectRoot: string): Promise<DoltMetadata> {
  const metadataPath = path.join(projectRoot, '.beads', 'metadata.json');
  let raw: string;
  try {
    raw = await fs.readFile(metadataPath, 'utf-8');
  } catch (err) {
    throw new DoltConnectionError(
      `Cannot read Dolt metadata at ${metadataPath} — is this a bd (beads) project?`,
      err
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    throw new DoltConnectionError(`Invalid JSON in ${metadataPath}`, err);
  }

  const port = parsed.dolt_server_port;
  const database = parsed.dolt_database;
  if (typeof port !== 'number' || typeof database !== 'string') {
    throw new DoltConnectionError(
      `${metadataPath} is missing required fields: dolt_server_port (number) and dolt_database (string)`
    );
  }

  return {
    dolt_server_port: port,
    dolt_database: database,
    dolt_server_host: typeof parsed.dolt_server_host === 'string' ? parsed.dolt_server_host : undefined,
  };
}

// Cache pools per resolved project root to avoid reconnecting on every request
const poolCache = new Map<string, mysql.Pool>();

export async function getDoltConnection(projectRoot: string): Promise<mysql.Pool> {
  const key = path.resolve(projectRoot);

  const existing = poolCache.get(key);
  if (existing) {
    return existing;
  }

  const metadata = await readDoltMetadata(projectRoot);
  const host = metadata.dolt_server_host ?? '127.0.0.1';

  const pool = mysql.createPool({
    host,
    port: metadata.dolt_server_port,
    database: metadata.dolt_database,
    user: 'root',
    password: '',
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0,
  });

  // Verify server is reachable before caching — fail fast with a typed error
  try {
    const conn = await pool.getConnection();
    conn.release();
  } catch (err) {
    await pool.end().catch(() => {});
    throw new DoltConnectionError(
      `Cannot connect to Dolt SQL server at ${host}:${metadata.dolt_server_port} (database: ${metadata.dolt_database})`,
      err
    );
  }

  poolCache.set(key, pool);
  return pool;
}
