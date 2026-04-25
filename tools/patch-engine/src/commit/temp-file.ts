import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
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
import { stageUpdateRecordField } from "../ops/update-record-field.js";
import type { OpContext, StagedWrite } from "../ops/types.js";
import { unlinkAllTempFiles } from "./rename.js";

export type StageAllOpsResult =
  | { ok: true; staged: StagedWrite[] }
  | { ok: false; error: unknown; staged: StagedWrite[] };

export async function stageAllOps(
  envelope: PatchPlanEnvelope,
  patches: PatchOperation[],
  ctx: OpContext
): Promise<StageAllOpsResult> {
  const staged: StagedWrite[] = [];

  try {
    for (const patch of patches) {
      staged.push(await stageOne(envelope, patch, ctx));
    }
  } catch (error) {
    await unlinkAllTempFiles(staged);
    return { ok: false, error, staged };
  }

  return { ok: true, staged };
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
  }
}
