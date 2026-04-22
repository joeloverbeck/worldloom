import Database from "better-sqlite3";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  const indexDirectory = path.resolve(worldRoot, "worlds", worldSlug, "_index");
  const databasePath = path.join(indexDirectory, "world.db");
  const versionFilePath = path.join(indexDirectory, "index_version.txt");

  mkdirSync(indexDirectory, { recursive: true });

  const db = new Database(databasePath);

  try {
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");

    const recordedVersion = readRecordedVersion(versionFilePath);
    if (recordedVersion === null) {
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
