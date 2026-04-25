import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import yaml from "js-yaml";

import type { PatchOperation, PatchPlanEnvelope } from "@worldloom/patch-engine";

import type { IndexedRecord, WorldIndexReadSurface } from "../framework/types.js";
import { parseDiscoveryBlock } from "../structural/record-schema-compliance.js";
import {
  FILE_CLASS_TO_SUBDIR,
  RECORD_TYPE_BY_SOURCE_DIR,
  asPlainRecord,
  toPosixPath,
  type FileInput
} from "../structural/utils.js";
import { frontmatterFor } from "../structural/yaml-parse-integrity.js";

interface NodeRow {
  node_id: string;
  node_type: string;
  world_slug: string;
  file_path: string;
  body: string;
}

type MutableRecord = Record<string, unknown>;

export function openWorldIndex(worldSlug: string, repoRoot = resolveRepoRootForWorld(worldSlug)): Database.Database {
  return new Database(path.join(repoRoot, "worlds", worldSlug, "_index", "world.db"));
}

export function buildFullWorldReadSurface(db: Database.Database, worldSlug: string): WorldIndexReadSurface {
  return {
    query: async ({ record_type, world_slug }) => {
      if (world_slug !== worldSlug) {
        return [];
      }
      return queryRows(db, worldSlug, record_type);
    }
  };
}

export function buildPreApplyReadSurface(
  db: Database.Database,
  envelope: PatchPlanEnvelope
): WorldIndexReadSurface {
  const worldSlug = envelope.target_world;
  const overlay = buildOverlayRecords(db, envelope);

  return {
    query: async ({ record_type, world_slug }) => {
      if (world_slug !== worldSlug) {
        return [];
      }
      const records = queryRows(db, worldSlug, record_type);
      const byKey = new Map(records.map((record) => [recordKey(record), record]));
      for (const record of overlay) {
        if (record_type !== undefined && record.node_type !== record_type) {
          continue;
        }
        byKey.set(recordKey(record), record);
      }
      return [...byKey.values()];
    }
  };
}

export function buildPreApplyFileInputs(
  db: Database.Database,
  envelope: PatchPlanEnvelope
): FileInput[] {
  return buildOverlayRecords(db, envelope, { changedOnly: true }).map((record) => ({
    path: record.file_path,
    content: yaml.dump(record.parsed, { lineWidth: 100, sortKeys: false })
  }));
}

function queryRows(
  db: Database.Database,
  worldSlug: string,
  recordType?: string
): IndexedRecord[] {
  const rows = (recordType
    ? db
        .prepare(
          "SELECT node_id, node_type, world_slug, file_path, body FROM nodes WHERE world_slug = ? AND node_type = ?"
        )
        .all(worldSlug, recordType)
    : db
        .prepare("SELECT node_id, node_type, world_slug, file_path, body FROM nodes WHERE world_slug = ?")
        .all(worldSlug)) as NodeRow[];

  return rows.map(rowToIndexedRecord);
}

function buildOverlayRecords(
  db: Database.Database,
  envelope: PatchPlanEnvelope,
  options: { changedOnly?: boolean } = {}
): IndexedRecord[] {
  const byId = new Map(queryRows(db, envelope.target_world).map((record) => [record.node_id, record]));
  const changedIds = new Set<string>();

  for (const patch of envelope.patches) {
    const created = recordForCreatePatch(envelope.target_world, patch);
    if (created !== null) {
      byId.set(created.node_id, created);
      changedIds.add(created.node_id);
      continue;
    }

    const changedId = applyMutationPatch(byId, patch);
    if (changedId !== null) {
      changedIds.add(changedId);
    }
  }

  const records = [...byId.values()];
  return options.changedOnly ? records.filter((record) => changedIds.has(record.node_id)) : records;
}

function recordForCreatePatch(worldSlug: string, patch: PatchOperation): IndexedRecord | null {
  if (patch.op === "create_cf_record") {
    return recordFromParsed(worldSlug, "canon_fact_record", patch.payload.cf_record.id, `_source/canon/${patch.payload.cf_record.id}.yaml`, patch.payload.cf_record as unknown as MutableRecord);
  }
  if (patch.op === "create_ch_record") {
    return recordFromParsed(worldSlug, "change_log_entry", patch.payload.ch_record.change_id, `_source/change-log/${patch.payload.ch_record.change_id}.yaml`, patch.payload.ch_record as unknown as MutableRecord);
  }
  if (patch.op === "create_inv_record") {
    return recordFromParsed(worldSlug, "invariant", patch.payload.inv_record.id, `_source/invariants/${patch.payload.inv_record.id}.yaml`, patch.payload.inv_record as unknown as MutableRecord);
  }
  if (patch.op === "create_m_record") {
    return recordFromParsed(worldSlug, "mystery_reserve_entry", patch.payload.m_record.id, `_source/mystery-reserve/${patch.payload.m_record.id}.yaml`, patch.payload.m_record as unknown as MutableRecord);
  }
  if (patch.op === "create_oq_record") {
    return recordFromParsed(worldSlug, "open_question_entry", patch.payload.oq_record.id, `_source/open-questions/${patch.payload.oq_record.id}.yaml`, patch.payload.oq_record as unknown as MutableRecord);
  }
  if (patch.op === "create_ent_record") {
    return recordFromParsed(worldSlug, "named_entity", patch.payload.ent_record.id, `_source/entities/${patch.payload.ent_record.id}.yaml`, patch.payload.ent_record as unknown as MutableRecord);
  }
  if (patch.op === "create_sec_record") {
    const subdir = FILE_CLASS_TO_SUBDIR[patch.payload.sec_record.file_class] ?? "";
    return recordFromParsed(worldSlug, "section", patch.payload.sec_record.id, `_source/${subdir}/${patch.payload.sec_record.id}.yaml`, patch.payload.sec_record as unknown as MutableRecord);
  }
  return null;
}

function applyMutationPatch(byId: Map<string, IndexedRecord>, patch: PatchOperation): string | null {
  if (patch.op === "update_record_field") {
    const targetId = patch.payload.target_record_id;
    const current = byId.get(targetId);
    if (!current) {
      return null;
    }
    const parsed = cloneRecord(current.parsed);
    applyFieldUpdate(parsed, patch.payload.field_path, patch.payload.operation, patch.payload.new_value);
    byId.set(targetId, { ...current, parsed });
    return targetId;
  }

  if (patch.op === "append_extension") {
    const current = byId.get(patch.payload.target_record_id);
    if (!current) {
      return null;
    }
    const parsed = cloneRecord(current.parsed);
    const extensions = Array.isArray(parsed.extensions) ? parsed.extensions : [];
    parsed.extensions = [...extensions, patch.payload.extension];
    byId.set(current.node_id, { ...current, parsed });
    return current.node_id;
  }

  if (patch.op === "append_touched_by_cf") {
    const current = byId.get(patch.payload.target_sec_id);
    if (!current) {
      return null;
    }
    const parsed = cloneRecord(current.parsed);
    const touched = Array.isArray(parsed.touched_by_cf) ? parsed.touched_by_cf : [];
    parsed.touched_by_cf = [...touched, patch.payload.cf_id];
    byId.set(current.node_id, { ...current, parsed });
    return current.node_id;
  }

  if (patch.op === "append_modification_history_entry") {
    const current = byId.get(patch.payload.target_cf_id);
    if (!current) {
      return null;
    }
    const parsed = cloneRecord(current.parsed);
    const history = Array.isArray(parsed.modification_history) ? parsed.modification_history : [];
    parsed.modification_history = [
      ...history,
      {
        change_id: patch.payload.change_id,
        originating_cf: patch.payload.originating_cf,
        date: patch.payload.date,
        summary: patch.payload.summary
      }
    ];
    byId.set(current.node_id, { ...current, parsed });
    return current.node_id;
  }
  return null;
}

function applyFieldUpdate(
  parsed: MutableRecord,
  fieldPath: readonly string[],
  operation: "set" | "append_list" | "append_text",
  newValue: unknown
): void {
  const container = containerFor(parsed, fieldPath);
  const key = fieldPath.at(-1);
  if (!container || key === undefined) {
    return;
  }
  if (operation === "set") {
    container[key] = newValue;
    return;
  }
  if (operation === "append_list") {
    const current = Array.isArray(container[key]) ? container[key] : [];
    container[key] = [...current, newValue];
    return;
  }
  const current = typeof container[key] === "string" ? container[key] : "";
  container[key] = `${current}${newValue}`;
}

function containerFor(parsed: MutableRecord, fieldPath: readonly string[]): MutableRecord | null {
  if (fieldPath.length === 0) {
    return null;
  }
  let cursor: MutableRecord = parsed;
  for (const part of fieldPath.slice(0, -1)) {
    const existing = cursor[part];
    if (typeof existing !== "object" || existing === null || Array.isArray(existing)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as MutableRecord;
  }
  return cursor;
}

function rowToIndexedRecord(row: NodeRow): IndexedRecord {
  return {
    node_id: row.node_id,
    node_type: row.node_type,
    world_slug: row.world_slug,
    file_path: toPosixPath(row.file_path),
    parsed: parsedBodyFor(row)
  };
}

function parsedBodyFor(row: NodeRow): MutableRecord {
  if (row.node_type === "character_record" || row.node_type === "diegetic_artifact_record") {
    return parseYamlRecord(frontmatterFor(row.body) ?? "");
  }
  if (row.node_type === "adjudication_record") {
    return parseDiscoveryBlock(row.body) ?? {};
  }
  return parseYamlRecord(row.body);
}

function parseYamlRecord(source: string): MutableRecord {
  try {
    return asPlainRecord(yaml.load(source, { schema: yaml.JSON_SCHEMA }));
  } catch {
    return {};
  }
}

function recordFromParsed(
  worldSlug: string,
  nodeType: string,
  nodeId: string,
  filePath: string,
  parsed: MutableRecord
): IndexedRecord {
  return {
    node_id: nodeId,
    node_type: nodeType,
    world_slug: worldSlug,
    file_path: filePath,
    parsed
  };
}

function cloneRecord(value: unknown): MutableRecord {
  return JSON.parse(JSON.stringify(asPlainRecord(value))) as MutableRecord;
}

function recordKey(record: IndexedRecord): string {
  return `${record.node_type}:${record.node_id}:${record.file_path}`;
}

function resolveRepoRootForWorld(worldSlug: string): string {
  for (let current = process.cwd(); ; current = path.dirname(current)) {
    if (existsSync(path.join(current, "worlds", worldSlug, "_index", "world.db"))) {
      return current;
    }
    if (path.dirname(current) === current) {
      break;
    }
  }

  const packageRoot = path.resolve(__dirname, "../../..");
  const maybeRepoRoot = path.resolve(packageRoot, "../..");
  if (existsSync(path.join(maybeRepoRoot, "worlds", worldSlug, "_index", "world.db"))) {
    return maybeRepoRoot;
  }

  throw new Error(`index missing at worlds/${worldSlug}/_index/world.db; run 'world-index build ${worldSlug}' first`);
}
