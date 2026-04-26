import fs from "node:fs";
import path from "node:path";

import YAML from "js-yaml";

import type { IndexedRecord } from "../../src/framework/types.js";
import { context, record, validCf } from "../structural/helpers.js";

export const completeCf = {
  ...validCf,
  prerequisites: ["trained office"],
  distribution: {
    who_can_do_it: ["office holders"],
    who_cannot_easily_do_it: ["outsiders"],
    why_not_universal: ["requires appointment"]
  },
  costs_and_limits: ["bounded cost"],
  visible_consequences: ["visible consequence"]
};

export const completeMr = {
  id: "M-1",
  title: "Mystery",
  status: "active",
  knowns: ["known edge"],
  unknowns: ["unknown core"],
  common_interpretations: [],
  disallowed_cheap_answers: ["cheap answer"],
  domains_touched: ["TIMELINE"],
  future_resolution_safety: "medium",
  extensions: []
};

export function testContext(records: IndexedRecord[]) {
  return context(records);
}

export function cfRecord(id: string, parsed: Record<string, unknown> = completeCf): IndexedRecord {
  return record("canon_fact_record", id, `_source/canon/${id}.yaml`, { ...parsed, id });
}

export function chRecord(id: string, affectedFactIds: string[]): IndexedRecord {
  return record("change_log_entry", id, `_source/change-log/${id}.yaml`, {
    change_id: id,
    affected_fact_ids: affectedFactIds
  });
}

export function mrRecord(id: string, parsed: Record<string, unknown> = completeMr): IndexedRecord {
  return record("mystery_reserve_entry", id, `_source/mystery-reserve/${id}.yaml`, { ...parsed, id });
}

export function loadAnimaliaRuleRecords(): IndexedRecord[] {
  const worldRoot = path.resolve(process.cwd(), "../../tests/fixtures/animalia/_source");
  const records: IndexedRecord[] = [];

  for (const [subdir, nodeType] of [
    ["canon", "canon_fact_record"],
    ["change-log", "change_log_entry"],
    ["mystery-reserve", "mystery_reserve_entry"]
  ] as const) {
    const dir = path.join(worldRoot, subdir);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".yaml")) {
        continue;
      }
      const filePath = `_source/${subdir}/${entry.name}`;
      const parsed = YAML.load(fs.readFileSync(path.join(dir, entry.name), "utf8")) as Record<string, unknown>;
      const nodeId = nodeType === "change_log_entry" ? String(parsed.change_id) : String(parsed.id);
      records.push({ node_type: nodeType, node_id: nodeId, file_path: filePath, parsed, world_slug: "animalia" });
    }
  }

  return records;
}
