import { existsSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { dropLegacyReviewKey } from "../read/prompt-working-set.js";
import {
  listAllKnownIds,
  readRecord,
  resolveReferrerSummaries,
  scanReferences,
  type ManualRecordSummaryWithClass,
  type ReferrerEntry,
} from "../read/records.js";
import type { ReadError } from "../read/result.js";
import {
  MANUAL_RECORD_CLASS_PREFIXES,
  type ManualRecord,
  type ManualRecordClass,
  type ManualRecordOfClass,
} from "../schema/manual-story.js";
import {
  validateRecord,
  type ValidationError,
} from "../validate/schema.js";
import { validateRefs, type RefViolation } from "../validate/refs.js";
import { allocateNextIdForClass } from "./id-allocator.js";
import {
  assertInsideSandbox,
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "./sandbox.js";

export interface CreateOptions {
  overrideBrokenRefs?: boolean;
}

export type CreateRecordResult<C extends ManualRecordClass> =
  | { ok: true; id: string; record: ManualRecordOfClass<C> }
  | { ok: false; error: "read_failed"; read_error: ReadError }
  | { ok: false; error: "validation_failed"; errors: ValidationError[] }
  | {
      ok: false;
      error: "broken_refs";
      violations: RefViolation[];
      needsOverride: true;
    };

export type UpdateRecordResult<C extends ManualRecordClass> =
  | { ok: true; id: string; record: ManualRecordOfClass<C> }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "read_failed"; read_error: ReadError }
  | { ok: false; error: "validation_failed"; errors: ValidationError[] }
  | {
      ok: false;
      error: "broken_refs";
      violations: RefViolation[];
      needsOverride: true;
    };

export type DeleteResult =
  | { ok: false; error: "not_found" }
  | { ok: false; error: "read_failed"; read_error: ReadError }
  | { outcome: "hard_deleted"; id: string }
  | {
      outcome: "blocked";
      id: string;
      referrers: ManualRecordSummaryWithClass[];
    }
  | {
      outcome: "force_deleted";
      id: string;
      auditEntry: {
        deletedAt: string;
        deletedClassAndId: string;
        referrers: ReferrerEntry[];
      };
    };

export interface DeleteOptions {
  force?: boolean;
  now?: () => string;
}

interface RepairLogEntry {
  deleted_class_and_id: string;
  deleted_at: string;
  referrers_at_deletion: ReferrerEntry[];
}

function classRoot(
  manualStoryRoot: ManualStoryRoot | string,
): ManualStoryRoot {
  if (typeof manualStoryRoot === "string") {
    // Fallback for tests passing the raw root path. Synthesize a
    // ManualStoryRoot using the path; the slug fields are not used
    // for write-target validation (only the absolutePath is).
    return {
      repoRoot: path.dirname(path.dirname(path.dirname(manualStoryRoot))),
      worldSlug: path.basename(
        path.dirname(path.dirname(manualStoryRoot)),
      ),
      manualStorySlug: path.basename(manualStoryRoot),
      absolutePath: manualStoryRoot,
    };
  }
  return manualStoryRoot;
}

function recordRelativePath(recordClass: ManualRecordClass, id: string): string {
  return path.join("records", recordClass, `${id}.yaml`);
}

export function createRecord<C extends ManualRecordClass>(
  manualStoryRoot: ManualStoryRoot | string,
  recordClass: C,
  body: Omit<ManualRecordOfClass<C>, "id">,
  opts: CreateOptions = {},
): CreateRecordResult<C> {
  const root = classRoot(manualStoryRoot);
  const id = allocateNextIdForClass(root.absolutePath, recordClass);
  const composed = { ...body, id } as ManualRecordOfClass<C>;
  return writeWithValidators(root, recordClass, id, composed, opts);
}

export function updateRecord<C extends ManualRecordClass>(
  manualStoryRoot: ManualStoryRoot | string,
  recordClass: C,
  id: string,
  body: ManualRecordOfClass<C>,
  opts: CreateOptions = {},
): UpdateRecordResult<C> {
  const root = classRoot(manualStoryRoot);
  const fullPath = path.join(
    root.absolutePath,
    "records",
    recordClass,
    `${id}.yaml`,
  );
  if (!existsSync(fullPath)) {
    return { ok: false, error: "not_found" };
  }
  // Enforce the URL id matches the body id
  const composed = { ...body, id } as ManualRecordOfClass<C>;
  return writeWithValidators(root, recordClass, id, composed, opts);
}

function writeWithValidators<C extends ManualRecordClass>(
  root: ManualStoryRoot,
  recordClass: C,
  id: string,
  composed: ManualRecordOfClass<C>,
  opts: CreateOptions,
): CreateRecordResult<C> {
  const sanitized = dropLegacyReviewKey(composed) as ManualRecordOfClass<C>;
  const schemaResult = validateRecord(recordClass, sanitized);
  if (!schemaResult.ok) {
    return { ok: false, error: "validation_failed", errors: schemaResult.errors };
  }

  const knownResult = listAllKnownIds(root.absolutePath);
  if (!knownResult.ok) {
    return { ok: false, error: "read_failed", read_error: knownResult.error };
  }
  const known = knownResult.value;
  // Ensure the in-progress record's own ID is counted as known (relevant
  // for self-references in mrel-* between or refs.related_records).
  known[recordClass].add(id);

  const violations = validateRefs(sanitized as ManualRecord, recordClass, known);
  if (violations.length > 0 && opts.overrideBrokenRefs !== true) {
    return {
      ok: false,
      error: "broken_refs",
      violations,
      needsOverride: true,
    };
  }

  const yamlText = YAML.stringify(sanitized);
  safeWriteFile(root, recordRelativePath(recordClass, id), yamlText);
  return { ok: true, id, record: sanitized };
}

export function deleteRecord(
  manualStoryRoot: ManualStoryRoot | string,
  recordClass: ManualRecordClass,
  id: string,
  opts: DeleteOptions = {},
): DeleteResult {
  const root = classRoot(manualStoryRoot);
  // Validate ID prefix to prevent unlink path traversal via crafted IDs
  const prefix = MANUAL_RECORD_CLASS_PREFIXES[recordClass];
  if (!new RegExp(`^${escapeRegex(prefix)}-\\d+$`).test(id)) {
    return { ok: false, error: "not_found" };
  }

  const existing = readRecord(root.absolutePath, recordClass, id);
  if (!existing.ok && existing.error.code === "file_not_found") {
    return { ok: false, error: "not_found" };
  }
  if (!existing.ok) {
    return { ok: false, error: "read_failed", read_error: existing.error };
  }

  const referrersResult = scanReferences(root.absolutePath, id);
  if (!referrersResult.ok) {
    return { ok: false, error: "read_failed", read_error: referrersResult.error };
  }
  const referrers = referrersResult.value.filter(
    (r) => !(r.recordClass === recordClass && r.id === id),
  );
  const now = opts.now ? opts.now() : new Date().toISOString();
  const fullPath = path.join(
    root.absolutePath,
    "records",
    recordClass,
    `${id}.yaml`,
  );

  if (opts.force === true) {
    assertInsideSandbox(fullPath, root);
    appendRepairLog(root, {
      deleted_class_and_id: `${recordClass}/${id}`,
      deleted_at: now,
      referrers_at_deletion: referrers,
    });
    unlinkSync(fullPath);
    return {
      outcome: "force_deleted",
      id,
      auditEntry: {
        deletedAt: now,
        deletedClassAndId: `${recordClass}/${id}`,
        referrers,
      },
    };
  }

  if (referrers.length === 0) {
    assertInsideSandbox(fullPath, root);
    unlinkSync(fullPath);
    return { outcome: "hard_deleted", id };
  }

  const summaries = resolveReferrerSummaries(root.absolutePath, id);
  if (!summaries.ok) {
    return { ok: false, error: "read_failed", read_error: summaries.error };
  }
  return {
    outcome: "blocked",
    id,
    referrers: summaries.value.filter(
      (entry) =>
        !(entry.recordClass === recordClass && entry.summary.id === id),
    ),
  };
}

function appendRepairLog(root: ManualStoryRoot, entry: RepairLogEntry): void {
  const relativePath = "repair-log.yaml";
  const fullPath = path.join(root.absolutePath, relativePath);
  let entries: RepairLogEntry[] = [];
  if (existsSync(fullPath)) {
    assertInsideSandbox(fullPath, root);
    const parsed = YAML.parse(readFileSync(fullPath, "utf8")) as unknown;
    if (Array.isArray(parsed)) {
      entries = parsed as RepairLogEntry[];
    }
  }
  entries.push(entry);
  safeWriteFile(root, relativePath, YAML.stringify(entries));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rootFromRepo(
  repoRoot: string,
  worldSlug: string,
  manualStorySlug: string,
): ManualStoryRoot {
  return resolveManualStoryRoot(repoRoot, worldSlug, manualStorySlug);
}
