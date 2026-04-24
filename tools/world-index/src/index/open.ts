import Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { CURRENT_INDEX_VERSION } from "../schema/version";

const MIGRATIONS_DIRECTORY = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "src",
  "schema",
  "migrations"
);

interface MigrationFile {
  version: number;
  filePath: string;
}

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

function listMigrationFiles(): MigrationFile[] {
  const files = readdirSync(MIGRATIONS_DIRECTORY)
    .map((entry) => {
      const match = /^(\d+)_.*\.sql$/.exec(entry);
      if (match === null) {
        return null;
      }

      return {
        version: Number(match[1]),
        filePath: path.join(MIGRATIONS_DIRECTORY, entry)
      };
    })
    .filter((entry): entry is MigrationFile => entry !== null)
    .sort((left, right) => left.version - right.version);

  if (files.length !== CURRENT_INDEX_VERSION) {
    throw new Error(
      `Expected ${CURRENT_INDEX_VERSION} migration files but found ${files.length} in ${MIGRATIONS_DIRECTORY}.`
    );
  }

  files.forEach((file, index) => {
    const expectedVersion = index + 1;
    if (file.version !== expectedVersion) {
      throw new Error(
        `Expected migration version ${expectedVersion} but found ${file.version} at ${file.filePath}.`
      );
    }
  });

  return files;
}

function applyMigrations(db: Database.Database, fromVersionExclusive: number): void {
  const pending = listMigrationFiles().filter((file) => file.version > fromVersionExclusive);

  for (const migration of pending) {
    db.exec(readFileSync(migration.filePath, "utf8"));
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
      applyMigrations(db, 0);
      writeFileSync(versionFilePath, `${CURRENT_INDEX_VERSION}\n`, "utf8");
      return db;
    }

    const recordedVersionNumber = Number(recordedVersion);
    if (!Number.isInteger(recordedVersionNumber) || recordedVersionNumber < 1) {
      throw new SchemaVersionMismatchError(versionFilePath, CURRENT_INDEX_VERSION, recordedVersion);
    }

    if (recordedVersionNumber > CURRENT_INDEX_VERSION) {
      throw new SchemaVersionMismatchError(
        versionFilePath,
        CURRENT_INDEX_VERSION,
        recordedVersion
      );
    }

    if (recordedVersionNumber < CURRENT_INDEX_VERSION) {
      applyMigrations(db, recordedVersionNumber);
      writeFileSync(versionFilePath, `${CURRENT_INDEX_VERSION}\n`, "utf8");
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
