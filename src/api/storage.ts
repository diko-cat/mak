import { createSeedDatabase, type Database } from './database';

const databaseKey = 'mak-clinic:database:v1';
const sessionKey = 'mak-clinic:session:v1';

export function readDatabase(): Database {
  const stored = window.localStorage.getItem(databaseKey);
  if (stored) {
    try {
      return JSON.parse(stored) as Database;
    } catch {
      window.localStorage.removeItem(databaseKey);
    }
  }
  const database = createSeedDatabase();
  writeDatabase(database);
  return database;
}

export function writeDatabase(database: Database): void {
  window.localStorage.setItem(databaseKey, JSON.stringify(database));
}

export function readSessionId(): string | null {
  return window.localStorage.getItem(sessionKey);
}

export function writeSessionId(id: string | null): void {
  if (id) window.localStorage.setItem(sessionKey, id);
  else window.localStorage.removeItem(sessionKey);
}

export function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}
