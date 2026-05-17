import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import {
  loadExistingRecord,
  PatchEngineOpError,
  requireTargetWorldMatch,
  stageExistingRecordFile
} from "./shared.js";
import type { OpContext, StagedWrite } from "./types.js";

type MarkSecretClueDiscoveredOperation = Extract<PatchOperation, { op: "mark_secret_clue_discovered" }>;

export async function stageMarkSecretClueDiscovered(
  env: PatchPlanEnvelope,
  op: MarkSecretClueDiscoveredOperation,
  ctx: OpContext
): Promise<StagedWrite> {
  const targetSecretId = op.payload.target_secret_id;
  requireTargetWorldMatch({
    envelopeTargetWorld: env.target_world,
    opTargetWorld: op.target_world,
    opKind: op.op,
    recordId: targetSecretId
  });

  if (!/^STSEC-\d+$/.test(targetSecretId)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${targetSecretId} is not a valid STSEC id`,
      op_kind: op.op,
      record_id: targetSecretId
    });
  }
  if (!/^(DA|STOBJ|STLOC|BEL|SF|SE)-\d+$/.test(op.payload.carrier_record)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.payload.carrier_record} is not a valid clue carrier record id`,
      op_kind: op.op,
      record_id: targetSecretId
    });
  }
  if (!/^(STENT-\d+|group:[A-Za-z0-9_-]+|public)$/.test(op.payload.discovered_by)) {
    throw new PatchEngineOpError({
      code: "invalid_record_id",
      message: `${op.payload.discovered_by} is not a valid discovered_by entry`,
      op_kind: op.op,
      record_id: targetSecretId
    });
  }

  const loaded = await loadExistingRecord({
    ctx,
    targetWorld: env.target_world,
    targetRecordId: targetSecretId,
    expectedContentHash: op.expected_content_hash,
    opKind: op.op
  });

  const carriers = loaded.record.clue_carriers;
  if (!Array.isArray(carriers)) {
    throw new PatchEngineOpError({
      code: "field_path_invalid",
      message: `${targetSecretId}.clue_carriers must be an array`,
      op_kind: op.op,
      record_id: targetSecretId
    });
  }

  const carrier = carriers.find((item): item is Record<string, unknown> =>
    typeof item === "object" &&
    item !== null &&
    !Array.isArray(item) &&
    item.record === op.payload.carrier_record
  );
  if (carrier === undefined) {
    throw new PatchEngineOpError({
      code: "record_not_found",
      message: `${targetSecretId} has no clue carrier for ${op.payload.carrier_record}`,
      op_kind: op.op,
      record_id: targetSecretId
    });
  }

  const discoveredBy = carrier.discovered_by;
  const nextDiscoveredBy = Array.isArray(discoveredBy)
    ? discoveredBy.filter((item): item is string => typeof item === "string")
    : [];
  if (!nextDiscoveredBy.includes(op.payload.discovered_by)) {
    nextDiscoveredBy.push(op.payload.discovered_by);
  }
  carrier.discovered_by = nextDiscoveredBy;
  carrier.status = "discovered";

  return stageExistingRecordFile({
    planId: env.plan_id,
    opKind: op.op,
    targetFilePath: loaded.absolute_file_path,
    record: loaded.record
  });
}
