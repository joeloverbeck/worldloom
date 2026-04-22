import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { CURRENT_INDEX_VERSION } from "../schema/version";

const MIGRATION_FILE = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "src",
  "schema",
  "migrations",
  "001_initial.sql"
);

export class SchemaVersionMismatchError extends Error {
  readonly expectedVersion: number;
  readonly actualVersion: string;
  readonly versionFilePath: string;

  constructor(versionFilePath: string, expectedVersion: number, actualVersion: string) {
    super(
      [
        `World index schema version mismatch for ${versionFilePath}.`,
        `Expected ${expectedVersion} but found ${actualVersion || "(empty)"}.`,
        "Delete worlds/<slug>/_index/ and rebuild from scratch."
      ].join(" ")
    );
    this.name = "SchemaVersionMismatchError";
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
    this.versionFilePath = versionFilePath;
  }
}

function readRecordedVersion(versionFilePath: string): string | null {
  try {
    return readFileSync(versionFilePath, "utf8").trim();
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export function openIndex(worldRoot: string, worldSlug: string): Database.Database {
  const indexDirectory = indexDirectoryForWorld(worldRoot, worldSlug);
  const databasePath = databasePathForWorld(worldRoot, worldSlug);
  const versionFilePath = versionFilePathForWorld(worldRoot, worldSlug);
  const databaseExists = existsSync(databasePath);

  mkdirSync(indexDirectory, { recursive: true });

  const db = new Database(databasePath);

  try {
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");

    const recordedVersion = readRecordedVersion(versionFilePath);
    if (!databaseExists || recordedVersion === null) {
      const migrationSql = readFileSync(MIGRATION_FILE, "utf8");
      db.exec(migrationSql);
      writeFileSync(versionFilePath, `${CURRENT_INDEX_VERSION}\n`, "utf8");
      return db;
    }

    if (recordedVersion !== String(CURRENT_INDEX_VERSION)) {
      throw new SchemaVersionMismatchError(
        versionFilePath,
        CURRENT_INDEX_VERSION,
        recordedVersion
      );
    }

    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function indexDirectoryForWorld(worldRoot: string, worldSlug: string): string {
  return path.resolve(worldRoot, "worlds", worldSlug, "_index");
}

export function databasePathForWorld(worldRoot: string, worldSlug: string): string {
  return path.join(indexDirectoryForWorld(worldRoot, worldSlug), "world.db");
}

export function versionFilePathForWorld(worldRoot: string, worldSlug: string): string {
  return path.join(indexDirectoryForWorld(worldRoot, worldSlug), "index_version.txt");
}

export function hasIndex(worldRoot: string, worldSlug: string): boolean {
  return (
    existsSync(databasePathForWorld(worldRoot, worldSlug)) &&
    existsSync(versionFilePathForWorld(worldRoot, worldSlug))
  );
}

export function openExistingIndex(worldRoot: string, worldSlug: string): Database.Database {
  if (!hasIndex(worldRoot, worldSlug)) {
    throw new Error(`Index missing for world '${worldSlug}'.`);
  }

  return openIndex(worldRoot, worldSlug);
}
