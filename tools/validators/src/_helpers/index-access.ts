import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import yaml from "js-yaml";
import type { PatchOperation, PatchPlanEnvelope } from "@worldloom/patch-engine";

import type { IndexedEdge, IndexedRecord, WorldIndexReadSurface } from "../framework/types.js";
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
  story_slug?: string | null;
  file_path: string;
  body: string;
  content_hash?: string | null;
}

type MutableRecord = Record<string, unknown>;

export function openWorldIndex(worldSlug: string, repoRoot = resolveRepoRootForWorld(worldSlug)): Database.Database {
  return new Database(path.join(repoRoot, "worlds", worldSlug, "_index", "world.db"));
}

export function buildFullWorldReadSurface(db: Database.Database, worldSlug: string): WorldIndexReadSurface {
  return {
    query: async ({ record_type, world_slug, story_slug }) => {
      if (world_slug !== worldSlug) {
        return [];
      }
      return queryRows(db, worldSlug, record_type, story_slug);
    },
    queryEdges: async ({ edge_type, world_slug, story_slug }) => {
      if (world_slug !== worldSlug) {
        return [];
      }
      return queryEdges(db, worldSlug, edge_type, story_slug);
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
    query: async ({ record_type, world_slug, story_slug }) => {
      if (world_slug !== worldSlug) {
        return [];
      }
      const records = queryRows(db, worldSlug, record_type, story_slug);
      const byKey = new Map(records.map((record) => [recordKey(record), record]));
      for (const record of overlay) {
        if (record_type !== undefined && record.node_type !== record_type) {
          continue;
        }
        if (story_slug !== undefined && record.story_slug !== story_slug) {
          continue;
        }
        byKey.set(recordKey(record), record);
      }
      return [...byKey.values()];
    },
    queryEdges: async ({ edge_type, world_slug, story_slug }) => {
      if (world_slug !== worldSlug) {
        return [];
      }
      return queryEdges(db, worldSlug, edge_type, story_slug);
    }
  };
}

export function buildPreApplyFileInputs(
  db: Database.Database,
  envelope: PatchPlanEnvelope
): FileInput[] {
  const files = buildOverlayRecords(db, envelope, { changedOnly: true }).map((record) => ({
    path: record.file_path,
    content: yaml.dump(record.parsed, { lineWidth: 100, sortKeys: false })
  }));

  for (const patch of envelope.patches) {
    const hybrid = storyCharacterAuthorityFileInput(patch);
    const maintainedHybridPath = storyCharacterAuthorityMaintenancePath(patch);
    const existingMaintenanceInput = maintainedHybridPath === null
      ? undefined
      : files.find((file) => file.path === maintainedHybridPath);
    const maintainedHybrid = storyCharacterAuthorityMaintenanceFileInput(
      envelope,
      patch,
      existingMaintenanceInput?.content.startsWith("---\n") === true ? existingMaintenanceInput.content : undefined
    );
    const maintainedDaHybrid = diegeticArtifactClaimMapMaintenanceFileInput(envelope, patch);
    const candidate = maintainedDaHybrid ?? maintainedHybrid ?? hybrid;
    if (candidate !== null) {
      const existingIndex = files.findIndex((file) => file.path === candidate.path);
      if (existingIndex >= 0) {
        files[existingIndex] = candidate;
      } else {
        files.push(candidate);
      }
    }
  }

  return files;
}

export function buildPreApplyExistingFilePaths(
  db: Database.Database,
  envelope: PatchPlanEnvelope
): string[] {
  return queryRows(db, envelope.target_world).map((record) => record.file_path);
}

function queryRows(
  db: Database.Database,
  worldSlug: string,
  recordType?: string,
  storySlug?: string | null
): IndexedRecord[] {
  const hasStorySlug = tableHasColumn(db, "nodes", "story_slug");
  const contentHashColumn = tableHasColumn(db, "nodes", "content_hash") ? "content_hash" : "NULL AS content_hash";
  const selectedColumns = hasStorySlug
    ? `node_id, node_type, world_slug, story_slug, file_path, body, ${contentHashColumn}`
    : `node_id, node_type, world_slug, NULL AS story_slug, file_path, body, ${contentHashColumn}`;
  const predicates = ["world_slug = ?"];
  const params: unknown[] = [worldSlug];
  if (recordType !== undefined) {
    predicates.push("node_type = ?");
    params.push(recordType);
  }
  if (storySlug !== undefined && storySlug !== null && hasStorySlug) {
    predicates.push("story_slug = ?");
    params.push(storySlug);
  }

  const rows = db
    .prepare(`SELECT ${selectedColumns} FROM nodes WHERE ${predicates.join(" AND ")}`)
    .all(...params) as NodeRow[];

  return rows.map(rowToIndexedRecord);
}

function queryEdges(
  db: Database.Database,
  worldSlug: string,
  edgeType?: string,
  storySlug?: string | null
): IndexedEdge[] {
  if (!tableExists(db, "edges")) {
    return [];
  }

  const hasStorySlug = tableHasColumn(db, "edges", "story_slug");
  const selectedColumns = hasStorySlug
    ? "edges.source_node_id, edges.target_node_id, edges.target_unresolved_ref, edges.edge_type, edges.story_slug"
    : "edges.source_node_id, edges.target_node_id, edges.target_unresolved_ref, edges.edge_type, NULL AS story_slug";
  const predicates = ["source.world_slug = ?"];
  const params: unknown[] = [worldSlug];

  if (edgeType !== undefined) {
    predicates.push("edges.edge_type = ?");
    params.push(edgeType);
  }
  if (storySlug !== undefined && storySlug !== null && hasStorySlug) {
    predicates.push("edges.story_slug = ?");
    params.push(storySlug);
  }

  return db
    .prepare(
      `
        SELECT ${selectedColumns}
        FROM edges
        JOIN nodes source ON source.node_id = edges.source_node_id
        WHERE ${predicates.join(" AND ")}
      `
    )
    .all(...params) as IndexedEdge[];
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
  const story = storyRecordForCreatePatch(worldSlug, patch);
  if (story !== null) {
    return story;
  }
  return null;
}

const STORY_CREATE_OPS: Readonly<Record<string, { nodeType: string; sourceDir: string }>> = {
  create_stent_record: { nodeType: "story_entity_record", sourceDir: "entities" },
  create_ststat_record: { nodeType: "story_status_record", sourceDir: "status" },
  create_sf_record: { nodeType: "story_fact_record", sourceDir: "facts" },
  create_se_record: { nodeType: "story_event_record", sourceDir: "events" },
  create_obl_record: { nodeType: "obligation_record", sourceDir: "obligations" },
  create_cnsq_record: { nodeType: "consequence_record", sourceDir: "consequences" },
  create_thr_record: { nodeType: "thread_record", sourceDir: "threads" },
  create_srel_record: { nodeType: "relationship_record_story", sourceDir: "relationships" },
  create_stint_record: { nodeType: "intention_record", sourceDir: "intentions" },
  create_stloc_record: { nodeType: "story_location_record", sourceDir: "locations" },
  create_stobj_record: { nodeType: "story_object_record", sourceDir: "objects" },
  create_br_record: { nodeType: "branch_record", sourceDir: "branches" },
  create_pg_record: { nodeType: "page_record", sourceDir: "pages" },
  create_chc_record: { nodeType: "choice_record", sourceDir: "choices" },
  create_slt_record: { nodeType: "storylet_record", sourceDir: "storylets" },
  create_bel_record: { nodeType: "belief_record", sourceDir: "beliefs" },
  create_clk_record: { nodeType: "pressure_clock_record", sourceDir: "clocks" },
  supersede_clk_record: { nodeType: "pressure_clock_record", sourceDir: "clocks" },
  create_stsec_record: { nodeType: "story_secret_record", sourceDir: "secrets" },
  supersede_stsec_record: { nodeType: "story_secret_record", sourceDir: "secrets" },
  create_stq_record: { nodeType: "story_question_record", sourceDir: "story-questions" },
  supersede_stq_record: { nodeType: "story_question_record", sourceDir: "story-questions" },
  create_stplan_record: { nodeType: "story_plan_record", sourceDir: "plans" },
  create_stemo_record: { nodeType: "story_emotion_record", sourceDir: "emotions" },
  append_story_diegetic_artifact_record: { nodeType: "story_diegetic_artifact_record", sourceDir: "artifacts" }
};

function storyRecordForCreatePatch(worldSlug: string, patch: PatchOperation): IndexedRecord | null {
  const stchar = storyCharacterAuthorityRecordForPatch(worldSlug, patch);
  if (stchar !== null) {
    return stchar;
  }

  const spec = STORY_CREATE_OPS[patch.op];
  if (spec === undefined) {
    return null;
  }
  const payload = patch.payload as { story_slug?: unknown; record?: unknown };
  const storySlug = typeof payload.story_slug === "string" ? payload.story_slug : "";
  const parsed = asPlainRecord(payload.record);
  const recordId = typeof parsed.id === "string" ? parsed.id : "";
  if (storySlug.length === 0 || recordId.length === 0) {
    return null;
  }
  return recordFromParsed(
    worldSlug,
    spec.nodeType,
    `${storySlug}:${recordId}`,
    `stories/${storySlug}/_source/${spec.sourceDir}/${recordId}.yaml`,
    parsed,
    storySlug
  );
}

function storyCharacterAuthorityRecordForPatch(worldSlug: string, patch: PatchOperation): IndexedRecord | null {
  if (patch.op !== "append_story_character_authority_record" && patch.op !== "supersede_story_character_authority_record") {
    return null;
  }

  const payload = patch.payload;
  const storySlug = typeof payload.story_slug === "string" ? payload.story_slug : "";
  const parsed = asPlainRecord(payload.record);
  const recordId = typeof parsed.id === "string" ? parsed.id : "";
  if (storySlug.length === 0 || recordId.length === 0) {
    return null;
  }

  return recordFromParsed(
    worldSlug,
    "story_character_authority_record",
    `${storySlug}:${recordId}`,
    `stories/${storySlug}/story-characters/${recordId}.md`,
    parsed,
    storySlug
  );
}

function storyCharacterAuthorityFileInput(patch: PatchOperation): FileInput | null {
  if (patch.op !== "append_story_character_authority_record" && patch.op !== "supersede_story_character_authority_record") {
    return null;
  }

  const payload = patch.payload;
  const storySlug = typeof payload.story_slug === "string" ? payload.story_slug : "";
  const parsed = asPlainRecord(payload.record);
  const recordId = typeof parsed.id === "string" ? parsed.id : "";
  const body = typeof payload.body_markdown === "string" ? payload.body_markdown : "";
  if (storySlug.length === 0 || recordId.length === 0) {
    return null;
  }

  const frontmatter = yaml.dump(parsed, { lineWidth: 100, sortKeys: false }).trimEnd();
  return {
    path: `stories/${storySlug}/story-characters/${recordId}.md`,
    content: `---\n${frontmatter}\n---\n\n${body}`
  };
}

function storyCharacterAuthorityMaintenanceFileInput(
  envelope: PatchPlanEnvelope,
  patch: PatchOperation,
  sourceOverride?: string
): FileInput | null {
  if (
    patch.op !== "remove_story_character_authority_frontmatter_field" &&
    patch.op !== "remove_story_character_authority_body_hash_note_field" &&
    patch.op !== "repair_story_character_authority_body_integrity"
  ) {
    return null;
  }

  const { story_slug: storySlug, target_record_id: recordId } = patch.payload;

  const filePath = patch.target_file || `stories/${storySlug}/story-characters/${recordId}.md`;
  const absolutePath = path.join(resolveRepoRootForWorld(envelope.target_world), "worlds", envelope.target_world, filePath);
  if (sourceOverride === undefined && !existsSync(absolutePath)) {
    return null;
  }

  const source = sourceOverride ?? readFileSync(absolutePath, "utf8");
  const match = /^---\n([\s\S]*?)---\n?([\s\S]*)$/.exec(source);
  if (match === null) {
    return null;
  }

  const frontmatter = asPlainRecord(yaml.load(match[1] ?? "", { schema: yaml.JSON_SCHEMA }));
  if (patch.op === "remove_story_character_authority_frontmatter_field") {
    delete frontmatter[patch.payload.field_name];
  }
  if (patch.op === "repair_story_character_authority_body_integrity") {
    frontmatter.source_operational_fact_map = patch.payload.source_operational_fact_map;
  }
  const body = patch.op === "remove_story_character_authority_body_hash_note_field"
    ? removeStcharHashNoteField(match[2] ?? "", patch.payload.field_name)
    : patch.op === "repair_story_character_authority_body_integrity"
      ? patch.payload.body_markdown
      : match[2] ?? "";
  const nextFrontmatter = yaml.dump(frontmatter, { lineWidth: 100, sortKeys: false }).trimEnd();
  return {
    path: filePath,
    content: `---\n${nextFrontmatter}\n---\n${body}`
  };
}

function storyCharacterAuthorityMaintenancePath(patch: PatchOperation): string | null {
  if (
    patch.op !== "remove_story_character_authority_frontmatter_field" &&
    patch.op !== "remove_story_character_authority_body_hash_note_field" &&
    patch.op !== "repair_story_character_authority_body_integrity"
  ) {
    return null;
  }

  return patch.target_file || `stories/${patch.payload.story_slug}/story-characters/${patch.payload.target_record_id}.md`;
}

function removeStcharHashNoteField(body: string, fieldName: string): string {
  if (fieldName === "source_char_hash") {
    return body.replace(/^- source_char_hash: .*(?:\n|$)/m, "");
  }

  const clausePatterns: Record<string, RegExp> = {
    profile_hash: /profile_hash over the full body markdown/,
    voice_block_hash: /voice_block_hash over the `## Page-Plan Voice Block` section/,
    page_packet_hash: /page_packet_hash over the §16a packet projection authored for this bundle/
  };
  const clausePattern = clausePatterns[fieldName];
  if (clausePattern === undefined) {
    return body;
  }

  return body.replace(/^- Hashes: ([^\n]*)(?:\n|$)/m, (line, clauses: string) => {
    if (!clausePattern.test(clauses)) {
      return line;
    }
    const remaining = clauses
      .replace(/\.$/, "")
      .split("; ")
      .filter((clause) => !clausePattern.test(clause));
    return remaining.length === 0 ? "" : `- Hashes: ${remaining.join("; ")}.\n`;
  });
}

function diegeticArtifactClaimMapMaintenanceFileInput(
  envelope: PatchPlanEnvelope,
  patch: PatchOperation
): FileInput | null {
  if (patch.op !== "repair_diegetic_artifact_claim_map_metadata") {
    return null;
  }

  const filePath = patch.target_file || diegeticArtifactFilePath(envelope, patch.payload.target_record_id);
  if (filePath === null) {
    return null;
  }
  const absolutePath = path.join(resolveRepoRootForWorld(envelope.target_world), "worlds", envelope.target_world, filePath);
  if (!existsSync(absolutePath)) {
    return null;
  }

  const source = readFileSync(absolutePath, "utf8");
  const match = /^---\n([\s\S]*?)---\n?([\s\S]*)$/.exec(source);
  if (match === null) {
    return null;
  }

  const frontmatter = asPlainRecord(yaml.load(match[1] ?? "", { schema: yaml.JSON_SCHEMA }));
  applyDiegeticArtifactClaimMapUpdates(frontmatter, patch);
  const nextFrontmatter = yaml.dump(frontmatter, { lineWidth: 100, sortKeys: false }).trimEnd();
  return {
    path: filePath,
    content: `---\n${nextFrontmatter}\n---\n${match[2] ?? ""}`
  };
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

  if (
    patch.op === "remove_story_character_authority_frontmatter_field" ||
    patch.op === "remove_story_character_authority_body_hash_note_field" ||
    patch.op === "repair_story_character_authority_body_integrity"
  ) {
    const targetId = `${patch.payload.story_slug}:${patch.payload.target_record_id}`;
    const current = byId.get(targetId);
    if (!current || current.node_type !== "story_character_authority_record") {
      return null;
    }
    const parsed = cloneRecord(current.parsed);
    if (patch.op === "remove_story_character_authority_frontmatter_field") {
      delete parsed[patch.payload.field_name];
    }
    if (patch.op === "repair_story_character_authority_body_integrity") {
      parsed.source_operational_fact_map = patch.payload.source_operational_fact_map;
    }
    byId.set(targetId, { ...current, parsed });
    return targetId;
  }

  if (patch.op === "repair_diegetic_artifact_claim_map_metadata") {
    const targetId = patch.payload.target_record_id;
    const current = byId.get(targetId);
    if (!current || current.node_type !== "diegetic_artifact_record") {
      return null;
    }
    const parsed = cloneRecord(current.parsed);
    applyDiegeticArtifactClaimMapUpdates(parsed, patch);
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

  if (patch.op === "remove_ch_affected_cf_ids") {
    const current = byId.get(patch.payload.target_ch_id);
    if (!current) {
      return null;
    }
    const parsed = cloneRecord(current.parsed);
    delete parsed.affected_cf_ids;
    byId.set(current.node_id, { ...current, parsed });
    return current.node_id;
  }

  if (patch.op === "repair_skipped_change_log_entry") {
    const repaired = asPlainRecord(patch.payload.repaired_record);
    const targetId = typeof repaired.change_id === "string" ? repaired.change_id : patch.payload.target_ch_id;
    const current = byId.get(targetId);
    byId.set(
      targetId,
      recordFromParsed(
        patch.target_world,
        "change_log_entry",
        targetId,
        `_source/change-log/${targetId}.yaml`,
        repaired
      )
    );
    return current?.node_id ?? targetId;
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

function applyDiegeticArtifactClaimMapUpdates(
  parsed: MutableRecord,
  patch: Extract<PatchOperation, { op: "repair_diegetic_artifact_claim_map_metadata" }>
): void {
  if (!Array.isArray(parsed.claim_map)) {
    return;
  }
  for (const update of patch.payload.claim_map_updates) {
    const entry = parsed.claim_map[update.index];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const mutable = entry as MutableRecord;
    mutable.canon_status = update.canon_status;
    mutable.cf_id = update.cf_id;
    const existingTrace =
      mutable.repair_trace && typeof mutable.repair_trace === "object" && !Array.isArray(mutable.repair_trace)
        ? (mutable.repair_trace as MutableRecord)
        : {};
    mutable.repair_trace = { ...existingTrace, valda_004: update.repair_trace_note };
  }
}

function diegeticArtifactFilePath(envelope: PatchPlanEnvelope, recordId: string): string | null {
  const repoRoot = resolveRepoRootForWorld(envelope.target_world);
  const db = openWorldIndex(envelope.target_world, repoRoot);
  try {
    const row = db
      .prepare(
        `
          SELECT file_path
          FROM nodes
          WHERE world_slug = ?
            AND node_id = ?
            AND node_type = 'diegetic_artifact_record'
        `
      )
      .get(envelope.target_world, recordId) as { file_path: string } | undefined;
    return row?.file_path ?? null;
  } finally {
    db.close();
  }
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
    story_slug: row.story_slug ?? null,
    file_path: toPosixPath(row.file_path),
    ...(row.content_hash === undefined || row.content_hash === null ? {} : { content_hash: row.content_hash }),
    parsed: parsedBodyFor(row)
  };
}

function parsedBodyFor(row: NodeRow): MutableRecord {
  if (
    row.node_type === "character_record" ||
    row.node_type === "proposal_card" ||
    row.node_type === "proposal_batch" ||
    row.node_type === "diegetic_artifact_record" ||
    row.node_type === "adjudication_record" ||
    row.node_type === "story_character_authority_record"
  ) {
    return parseYamlRecord(frontmatterFor(row.body) ?? "");
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
  parsed: MutableRecord,
  storySlug: string | null = null
): IndexedRecord {
  return {
    node_id: nodeId,
    node_type: nodeType,
    world_slug: worldSlug,
    story_slug: storySlug,
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

  const packageRoot = path.resolve(import.meta.dirname, "../../..");
  const maybeRepoRoot = path.resolve(packageRoot, "../..");
  if (existsSync(path.join(maybeRepoRoot, "worlds", worldSlug, "_index", "world.db"))) {
    return maybeRepoRoot;
  }

  throw new Error(`index missing at worlds/${worldSlug}/_index/world.db; run 'world-index build ${worldSlug}' first`);
}

function tableHasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === columnName);
}

function tableExists(db: Database.Database, tableName: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  return row !== undefined;
}
