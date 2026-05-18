import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { contentHashForYaml, isRecord } from "../ops/shared.js";
import { stageAppendAdjudicationRecord } from "../ops/append-adjudication-record.js";
import { stageAppendCharacterRecord } from "../ops/append-character-record.js";
import { stageAppendDiegeticArtifactRecord } from "../ops/append-diegetic-artifact-record.js";
import { stageAppendExtension } from "../ops/append-extension.js";
import { stageAppendModificationHistoryEntry } from "../ops/append-modification-history-entry.js";
import { stageAppendTouchedByCf } from "../ops/append-touched-by-cf.js";
import { stageCreateCfRecord } from "../ops/create-cf-record.js";
import { stageCreateChRecord } from "../ops/create-ch-record.js";
import { stageCreateEntRecord } from "../ops/create-ent-record.js";
import { stageCreateInvRecord } from "../ops/create-inv-record.js";
import { stageCreateMRecord } from "../ops/create-m-record.js";
import { stageCreateOqRecord } from "../ops/create-oq-record.js";
import { stageCreateSecRecord } from "../ops/create-sec-record.js";
import { stageCreateStoryRecord, STORY_RECORD_SPECS, storyRecordMetadata } from "../ops/create-story-record.js";
import { stageRemoveChAffectedCfIds } from "../ops/remove-ch-affected-cf-ids.js";
import { stageRepairSkippedChangeLogEntry } from "../ops/repair-skipped-change-log-entry.js";
import { stageUpdateRecordField } from "../ops/update-record-field.js";
import type { OpContext, StagedRecord, StagedWrite } from "../ops/types.js";
import { unlinkAllTempFiles } from "./rename.js";
import YAML from "yaml";
import path from "node:path";

export type StageAllOpsResult =
  | { ok: true; staged: StagedWrite[] }
  | { ok: false; error: unknown; staged: StagedWrite[] };

export async function stageAllOps(
  envelope: PatchPlanEnvelope,
  patches: PatchOperation[],
  ctx: OpContext
): Promise<StageAllOpsResult> {
  const previousOverlay = ctx.stagedRecords;
  ctx.stagedRecords = new Map(previousOverlay);
  const staged: StagedWrite[] = [];

  try {
    for (const patch of patches) {
      const write = await stageOne(envelope, patch, ctx);
      replaceStagedWrite(staged, write);
      registerStagedRecord(envelope, patch, write, ctx);
    }
  } catch (error) {
    await unlinkAllTempFiles(staged);
    ctx.stagedRecords = previousOverlay;
    return { ok: false, error, staged };
  }

  ctx.stagedRecords = previousOverlay;
  return { ok: true, staged };
}

function replaceStagedWrite(staged: StagedWrite[], write: StagedWrite): void {
  const existingIndex = staged.findIndex((item) => item.target_file_path === write.target_file_path);
  if (existingIndex === -1) {
    staged.push(write);
    return;
  }
  staged[existingIndex] = {
    ...write,
    noop: write.noop === true && staged[existingIndex]?.noop === true
  };
}

function registerStagedRecord(
  envelope: PatchPlanEnvelope,
  patch: PatchOperation,
  write: StagedWrite,
  ctx: OpContext
): void {
  const metadata = stagedRecordMetadata(patch);
  if (metadata === null) {
    return;
  }

  const parsed = YAML.parse(write.new_content) as unknown;
  if (!isRecord(parsed)) {
    return;
  }

  const previous = ctx.stagedRecords?.get(metadata.nodeId);
  const baselineHash = previous?.baseline_hash ?? previous?.current_hash;
  const record: StagedRecord = {
    node_id: metadata.nodeId,
    node_type: metadata.nodeType,
    file_path: toWorldRelativePath(ctx.worldRoot, envelope.target_world, write.target_file_path),
    absolute_file_path: write.target_file_path,
    record: parsed,
    current_hash: contentHashForYaml(parsed)
  };
  if (baselineHash !== undefined) {
    record.baseline_hash = baselineHash;
  }
  ctx.stagedRecords?.set(metadata.nodeId, record);
}

function stagedRecordMetadata(patch: PatchOperation): { nodeId: string; nodeType: string } | null {
  switch (patch.op) {
    case "create_cf_record":
      return { nodeId: patch.payload.cf_record.id, nodeType: "canon_fact_record" };
    case "create_ch_record":
      return { nodeId: patch.payload.ch_record.change_id, nodeType: "change_log_entry" };
    case "create_inv_record":
      return { nodeId: patch.payload.inv_record.id, nodeType: "invariant" };
    case "create_m_record":
      return { nodeId: patch.payload.m_record.id, nodeType: "mystery_reserve_entry" };
    case "create_oq_record":
      return { nodeId: patch.payload.oq_record.id, nodeType: "open_question_entry" };
    case "create_ent_record":
      return { nodeId: patch.payload.ent_record.id, nodeType: "named_entity" };
    case "create_sec_record":
      return { nodeId: patch.payload.sec_record.id, nodeType: "section" };
    case "create_stent_record":
    case "create_ststat_record":
    case "create_sf_record":
    case "create_se_record":
    case "create_obl_record":
    case "create_cnsq_record":
    case "create_thr_record":
    case "create_srel_record":
    case "create_stint_record":
    case "create_stloc_record":
    case "create_stobj_record":
    case "create_br_record":
    case "create_pg_record":
    case "create_chc_record":
    case "create_slt_record":
    case "create_bel_record":
    case "create_clk_record":
    case "supersede_clk_record":
    case "create_stsec_record":
    case "supersede_stsec_record":
    case "create_stq_record":
    case "supersede_stq_record":
    case "append_story_diegetic_artifact_record": {
      const metadata = storyRecordMetadata(patch);
      return metadata === null ? null : { nodeId: metadata.nodeId, nodeType: metadata.nodeType };
    }
    case "update_record_field":
    case "append_extension":
      return metadataForTargetRecordId(patch.payload.target_record_id);
    case "repair_skipped_change_log_entry":
      return { nodeId: patch.payload.target_ch_id, nodeType: "change_log_entry" };
    case "remove_ch_affected_cf_ids":
      return { nodeId: patch.payload.target_ch_id, nodeType: "change_log_entry" };
    case "append_touched_by_cf":
      return { nodeId: patch.payload.target_sec_id, nodeType: "section" };
    case "append_modification_history_entry":
      return { nodeId: patch.payload.target_cf_id, nodeType: "canon_fact_record" };
    default:
      return null;
  }
}

const STORY_BUNDLE_NODE_TYPE_BY_PREFIX: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(STORY_RECORD_SPECS).map((spec) => [spec.prefix, spec.nodeType])
);

const STORY_BUNDLE_ID_PATTERN =
  /^(?:[a-z0-9-]+:)?(PG|SE|SF|OBL|CNSQ|THR|SREL|STINT|SLT|STLOC|STOBJ|BR|CHC|STENT|STSTAT|BEL|DA|CLK|STSEC|STQ)-\d+$/;

function metadataForTargetRecordId(recordId: string): { nodeId: string; nodeType: string } | null {
  if (/^CF-\d+$/.test(recordId)) {
    return { nodeId: recordId, nodeType: "canon_fact_record" };
  }
  if (/^CH-\d+$/.test(recordId)) {
    return { nodeId: recordId, nodeType: "change_log_entry" };
  }
  if (/^INV-\d+$/.test(recordId)) {
    return { nodeId: recordId, nodeType: "invariant" };
  }
  if (/^M-\d+$/.test(recordId)) {
    return { nodeId: recordId, nodeType: "mystery_reserve_entry" };
  }
  if (/^OQ-\d+$/.test(recordId)) {
    return { nodeId: recordId, nodeType: "open_question_entry" };
  }
  if (/^ENT-\d+$/.test(recordId)) {
    return { nodeId: recordId, nodeType: "named_entity" };
  }
  if (/^SEC-[A-Z]{3}-\d+$/.test(recordId)) {
    return { nodeId: recordId, nodeType: "section" };
  }
  const storyMatch = STORY_BUNDLE_ID_PATTERN.exec(recordId);
  if (storyMatch && storyMatch[1] !== undefined) {
    const nodeType = STORY_BUNDLE_NODE_TYPE_BY_PREFIX[storyMatch[1]];
    if (nodeType !== undefined) {
      return { nodeId: recordId, nodeType };
    }
  }
  return null;
}

function toWorldRelativePath(worldRoot: string, worldSlug: string, absolutePath: string): string {
  const worldPath = path.join(worldRoot, "worlds", worldSlug);
  return path.relative(worldPath, absolutePath).split(path.sep).join("/");
}

function stageOne(
  envelope: PatchPlanEnvelope,
  patch: PatchOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  switch (patch.op) {
    case "create_cf_record":
      return stageCreateCfRecord(envelope, patch, ctx);
    case "create_ch_record":
      return stageCreateChRecord(envelope, patch, ctx);
    case "create_inv_record":
      return stageCreateInvRecord(envelope, patch, ctx);
    case "create_m_record":
      return stageCreateMRecord(envelope, patch, ctx);
    case "create_oq_record":
      return stageCreateOqRecord(envelope, patch, ctx);
    case "create_ent_record":
      return stageCreateEntRecord(envelope, patch, ctx);
    case "create_sec_record":
      return stageCreateSecRecord(envelope, patch, ctx);
    case "update_record_field":
      return stageUpdateRecordField(envelope, patch, ctx);
    case "repair_skipped_change_log_entry":
      return stageRepairSkippedChangeLogEntry(envelope, patch, ctx);
    case "remove_ch_affected_cf_ids":
      return stageRemoveChAffectedCfIds(envelope, patch, ctx);
    case "append_extension":
      return stageAppendExtension(envelope, patch, ctx);
    case "append_touched_by_cf":
      return stageAppendTouchedByCf(envelope, patch, ctx);
    case "append_modification_history_entry":
      return stageAppendModificationHistoryEntry(envelope, patch, ctx);
    case "append_adjudication_record":
      return stageAppendAdjudicationRecord(envelope, patch, ctx);
    case "append_character_record":
      return stageAppendCharacterRecord(envelope, patch, ctx);
    case "append_diegetic_artifact_record":
      return stageAppendDiegeticArtifactRecord(envelope, patch, ctx);
    case "create_stent_record":
    case "create_ststat_record":
    case "create_sf_record":
    case "create_se_record":
    case "create_obl_record":
    case "create_cnsq_record":
    case "create_thr_record":
    case "create_srel_record":
    case "create_stint_record":
    case "create_stloc_record":
    case "create_stobj_record":
    case "create_br_record":
    case "create_pg_record":
    case "create_chc_record":
    case "create_slt_record":
    case "create_bel_record":
    case "create_clk_record":
    case "supersede_clk_record":
    case "create_stsec_record":
    case "supersede_stsec_record":
    case "create_stq_record":
    case "supersede_stq_record":
    case "append_story_diegetic_artifact_record":
      return stageCreateStoryRecord(envelope, patch, ctx);
  }
}
