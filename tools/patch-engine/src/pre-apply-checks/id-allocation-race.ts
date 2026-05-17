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
    ["cf_ids", "CF", /^CF-(\d+)$/, 1, false],
    ["ch_ids", "CH", /^CH-(\d+)$/, 1, false],
    ["m_ids", "M", /^M-(\d+)$/, 1, false],
    ["oq_ids", "OQ", /^OQ-(\d+)$/, 1, false],
    ["ent_ids", "ENT", /^ENT-(\d+)$/, 1, false],
    ["pa_ids", "PA", /^PA-(\d+)$/, 1, false],
    ["char_ids", "CHAR", /^CHAR-(\d+)$/, 1, false],
    ["da_ids", "DA", /^DA-(\d+)$/, 1, false]
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
    const match = /^(SEC-[A-Z]{3})-\d+$/.exec(secId);
    if (match === null) {
      failures.push({
        key: "sec_ids",
        expected: secId,
        message: `Invalid sec_ids allocation ${secId}.`
      });
      continue;
    }
    const prefix = match[1] ?? "";
    const nextId = nextIdFor(db, worldSlug, prefix, new RegExp(`^${prefix}-(\\d+)$`), 1, false);
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
    ["stent_ids", "STENT", /^STENT-(\d+)$/, 1, false],
    ["ststat_ids", "STSTAT", /^STSTAT-(\d+)$/, 1, false],
    ["sf_ids", "SF", /^SF-(\d+)$/, 1, false],
    ["se_ids", "SE", /^SE-(\d+)$/, 1, false],
    ["obl_ids", "OBL", /^OBL-(\d+)$/, 1, false],
    ["cnsq_ids", "CNSQ", /^CNSQ-(\d+)$/, 1, false],
    ["thr_ids", "THR", /^THR-(\d+)$/, 1, false],
    ["srel_ids", "SREL", /^SREL-(\d+)$/, 1, false],
    ["stint_ids", "STINT", /^STINT-(\d+)$/, 1, false],
    ["stloc_ids", "STLOC", /^STLOC-(\d+)$/, 1, false],
    ["stobj_ids", "STOBJ", /^STOBJ-(\d+)$/, 1, false],
    ["br_ids", "BR", /^BR-(\d+)$/, 1, false],
    ["pg_ids", "PG", /^PG-(\d+)$/, 1, false],
    ["chc_ids", "CHC", /^CHC-(\d+)$/, 1, false],
    ["slt_ids", "SLT", /^SLT-(\d+)$/, 1, false],
    ["bel_ids", "BEL", /^BEL-(\d+)$/, 1, false],
    ["clk_ids", "CLK", /^CLK-(\d+)$/, 1, false],
    ["story_da_ids", "DA", /^DA-(\d+)$/, 1, false]
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
