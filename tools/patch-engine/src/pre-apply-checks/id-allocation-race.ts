import type Database from "better-sqlite3";

import type { IdAllocations, PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { storyRecordMetadata } from "../ops/create-story-record.js";

export interface IdAllocationRaceFailure {
  key: keyof IdAllocations;
  expected: string;
  current?: string;
  story_slug?: string;
  message: string;
}

export type IdAllocationRaceResult =
  | { ok: true; failures: [] }
  | {
      ok: false;
      code: "id_allocation_race";
      message: string;
      failures: IdAllocationRaceFailure[];
    };

export function checkIdAllocationRace(
  db: Database.Database,
  envelope: PatchPlanEnvelope
): IdAllocationRaceResult {
  const failures = collectIdAllocationRaceFailures(
    db,
    envelope.target_world,
    envelope.expected_id_allocations,
    envelope.patches
  );

  if (failures.length === 0) {
    return { ok: true, failures: [] };
  }

  return {
    ok: false,
    code: "id_allocation_race",
    message: failures[0]!.message,
    failures
  };
}

function collectIdAllocationRaceFailures(
  db: Database.Database,
  worldSlug: string,
  allocations: IdAllocations,
  patches: PatchOperation[]
): IdAllocationRaceFailure[] {
  const failures: IdAllocationRaceFailure[] = [];
  const classByKey: Array<[keyof IdAllocations, string, RegExp, number, boolean]> = [
    ["cf_ids", "CF", /^CF-(\d{4})$/, 4, true],
    ["ch_ids", "CH", /^CH-(\d{4})$/, 4, true],
    ["m_ids", "M", /^M-(\d+)$/, 1, false],
    ["oq_ids", "OQ", /^OQ-(\d{4})$/, 4, true],
    ["ent_ids", "ENT", /^ENT-(\d{4})$/, 4, true],
    ["pa_ids", "PA", /^PA-(\d{4})$/, 4, true],
    ["char_ids", "CHAR", /^CHAR-(\d{4})$/, 4, true],
    ["da_ids", "DA", /^DA-(\d{4})$/, 4, true]
  ];

  for (const [key, prefix, regex, width, zeroPad] of classByKey) {
    const ids = allocations[key];
    if (ids === undefined || ids.length === 0) {
      continue;
    }

    const nextId = nextIdFor(db, worldSlug, prefix, regex, width, zeroPad);
    if (ids[0] !== nextId) {
      failures.push({
        key,
        expected: ids[0]!,
        current: nextId,
        message: `${key} allocation race: expected ${ids[0]}, current next id is ${nextId}.`
      });
    }
  }

  const invIds = allocations.inv_ids ?? [];
  const invPrefixCounts = new Map<string, number>();
  for (const invId of invIds) {
    const match = /^(ONT|CAU|DIS|SOC|AES)-\d+$/.exec(invId);
    if (match === null) {
      failures.push({
        key: "inv_ids",
        expected: invId,
        message: `Invalid inv_ids allocation ${invId}.`
      });
      continue;
    }
    const prefix = match[1] ?? "";
    const allocatedForPrefix = invPrefixCounts.get(prefix) ?? 0;
    const nextId = nextIdFor(db, worldSlug, prefix, new RegExp(`^${prefix}-(\\d+)$`), 1, false, allocatedForPrefix);
    if (invId !== nextId) {
      failures.push({
        key: "inv_ids",
        expected: invId,
        current: nextId,
        message: `inv_ids allocation race: expected ${invId}, current next id is ${nextId}.`
      });
    }
    invPrefixCounts.set(prefix, allocatedForPrefix + 1);
  }

  const secIds = allocations.sec_ids ?? [];
  for (const secId of secIds) {
    const match = /^(SEC-[A-Z]{3})-\d{3}$/.exec(secId);
    if (match === null) {
      failures.push({
        key: "sec_ids",
        expected: secId,
        message: `Invalid sec_ids allocation ${secId}.`
      });
      continue;
    }
    const prefix = match[1] ?? "";
    const nextId = nextIdFor(db, worldSlug, prefix, new RegExp(`^${prefix}-(\\d{3})$`), 3, true);
    if (secId !== nextId) {
      failures.push({
        key: "sec_ids",
        expected: secId,
        current: nextId,
        message: `sec_ids allocation race: expected ${secId}, current next id is ${nextId}.`
      });
    }
  }

  const storyAllocations: Array<[keyof IdAllocations, string, RegExp, number, boolean]> = [
    ["stent_ids", "STENT", /^STENT-(\d{4})$/, 4, true],
    ["sf_ids", "SF", /^SF-(\d{4})$/, 4, true],
    ["se_ids", "SE", /^SE-(\d{4})$/, 4, true],
    ["obl_ids", "OBL", /^OBL-(\d{4})$/, 4, true],
    ["cnsq_ids", "CNSQ", /^CNSQ-(\d{4})$/, 4, true],
    ["thr_ids", "THR", /^THR-(\d{4})$/, 4, true],
    ["srel_ids", "SREL", /^SREL-(\d{4})$/, 4, true],
    ["stint_ids", "STINT", /^STINT-(\d{4})$/, 4, true],
    ["stloc_ids", "STLOC", /^STLOC-(\d{4})$/, 4, true],
    ["stobj_ids", "STOBJ", /^STOBJ-(\d{4})$/, 4, true],
    ["br_ids", "BR", /^BR-(\d{4})$/, 4, true],
    ["pg_ids", "PG", /^PG-(\d{4})$/, 4, true],
    ["chc_ids", "CHC", /^CHC-(\d{4})$/, 4, true],
    ["slt_ids", "SLT", /^SLT-(\d{4})$/, 4, true],
    ["bel_ids", "BEL", /^BEL-(\d{4})$/, 4, true],
    ["story_da_ids", "DA", /^DA-(\d{4})$/, 4, true]
  ];

  for (const [key, prefix, regex, width, zeroPad] of storyAllocations) {
    const ids = allocations[key] ?? [];
    if (ids.length === 0) {
      continue;
    }
    const storySlug = firstStorySlugForAllocatedPrefix(patches, prefix);
    if (storySlug === null) {
      failures.push({
        key,
        expected: ids[0]!,
        message: `${key} allocation ${ids[0]} has no matching story-bundle create op.`
      });
      continue;
    }
    for (const [offset, id] of ids.entries()) {
      const nextId = nextStoryIdFor(db, worldSlug, storySlug, prefix, regex, width, zeroPad, offset);
      if (id !== nextId) {
        failures.push({
          key,
          expected: id,
          current: nextId,
          story_slug: storySlug,
          message: `${key} allocation race for story '${storySlug}': expected ${id}, current next id is ${nextId}.`
        });
      }
    }
  }

  return failures;
}

function nextIdFor(
  db: Database.Database,
  worldSlug: string,
  prefix: string,
  regex: RegExp,
  width: number,
  zeroPad: boolean,
  alreadyAllocated = 0
): string {
  const rows = db
    .prepare(
      `
        SELECT node_id
        FROM nodes
        WHERE world_slug = ?
        ORDER BY node_id
      `
    )
    .all(worldSlug) as Array<{ node_id: string }>;

  let maxValue = 0;
  for (const row of rows) {
    const match = regex.exec(row.node_id);
    if (match === null) {
      continue;
    }
    maxValue = Math.max(maxValue, Number.parseInt(match[1] ?? "0", 10));
  }

  const nextValue = maxValue + 1 + alreadyAllocated;
  return `${prefix}-${zeroPad ? String(nextValue).padStart(width, "0") : String(nextValue)}`;
}

function firstStorySlugForAllocatedPrefix(patches: PatchOperation[], prefix: string): string | null {
  for (const patch of patches) {
    const metadata = storyRecordMetadata(patch);
    if (metadata === null || !metadata.recordId.startsWith(`${prefix}-`)) {
      continue;
    }
    return metadata.storySlug;
  }
  return null;
}

function nextStoryIdFor(
  db: Database.Database,
  worldSlug: string,
  storySlug: string,
  prefix: string,
  regex: RegExp,
  width: number,
  zeroPad: boolean,
  alreadyAllocated = 0
): string {
  const hasStorySlug = tableHasColumn(db, "nodes", "story_slug");
  const rows = hasStorySlug
    ? db
        .prepare(
          `
            SELECT node_id
            FROM nodes
            WHERE world_slug = ? AND story_slug = ?
            ORDER BY node_id
          `
        )
        .all(worldSlug, storySlug) as Array<{ node_id: string }>
    : db
        .prepare(
          `
            SELECT node_id
            FROM nodes
            WHERE world_slug = ? AND node_id LIKE ?
            ORDER BY node_id
          `
        )
        .all(worldSlug, `${storySlug}:%`) as Array<{ node_id: string }>;

  let maxValue = 0;
  for (const row of rows) {
    const bareId = row.node_id.includes(":") ? row.node_id.split(":").at(-1) ?? row.node_id : row.node_id;
    const match = regex.exec(bareId);
    if (match === null) {
      continue;
    }
    maxValue = Math.max(maxValue, Number.parseInt(match[1] ?? "0", 10));
  }

  const nextValue = maxValue + 1 + alreadyAllocated;
  return `${prefix}-${zeroPad ? String(nextValue).padStart(width, "0") : String(nextValue)}`;
}

function tableHasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === columnName);
}
