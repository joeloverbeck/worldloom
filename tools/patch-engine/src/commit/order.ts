import type { PatchOperation } from "../envelope/schema.js";
import type { OpContext } from "../ops/types.js";

const TIER_ONE = new Set<PatchOperation["op"]>([
  "create_cf_record",
  "create_ch_record",
  "create_inv_record",
  "create_m_record",
  "create_oq_record",
  "create_ent_record",
  "create_sec_record"
]);

const TIER_TWO = new Set<PatchOperation["op"]>([
  "update_record_field",
  "append_extension",
  "append_touched_by_cf",
  "append_modification_history_entry"
]);

const TIER_THREE = new Set<PatchOperation["op"]>([
  "append_adjudication_record",
  "append_character_record",
  "append_diegetic_artifact_record"
]);

export function reorderPatches(patches: PatchOperation[]): PatchOperation[] {
  return [
    ...patches.filter((patch) => TIER_ONE.has(patch.op)),
    ...patches.filter((patch) => TIER_TWO.has(patch.op)),
    ...patches.filter((patch) => TIER_THREE.has(patch.op))
  ];
}

export function autoAddTouchedByCfOps(patches: PatchOperation[], ctx: OpContext): PatchOperation[] {
  const expanded: PatchOperation[] = [];

  for (const patch of patches) {
    expanded.push(patch);

    if (patch.op !== "append_extension") {
      continue;
    }

    const targetRecordId = patch.payload.target_record_id;
    const row = ctx.db
      .prepare(
        `
          SELECT node_type
          FROM nodes
          WHERE world_slug = ? AND node_id = ?
        `
      )
      .get(patch.target_world, targetRecordId) as { node_type: string } | undefined;

    if (row?.node_type !== "section") {
      continue;
    }

    const cfId = patch.payload.extension.originating_cf;
    if (hasTouchedByCf(ctx, patch.target_world, targetRecordId, cfId) || hasExplicitTouchedByCf(patches, targetRecordId, cfId)) {
      continue;
    }

    const autoAdded: PatchOperation = {
      op: "append_touched_by_cf",
      target_world: patch.target_world,
      target_record_id: targetRecordId,
      payload: {
        target_sec_id: targetRecordId,
        cf_id: cfId
      }
    };
    if (patch.expected_content_hash !== undefined) {
      autoAdded.expected_content_hash = patch.expected_content_hash;
    }
    expanded.push(autoAdded);
  }

  return expanded;
}

function hasExplicitTouchedByCf(patches: PatchOperation[], targetSecId: string, cfId: string): boolean {
  return patches.some(
    (patch) =>
      patch.op === "append_touched_by_cf" &&
      patch.payload.target_sec_id === targetSecId &&
      patch.payload.cf_id === cfId
  );
}

function hasTouchedByCf(ctx: OpContext, worldSlug: string, targetRecordId: string, cfId: string): boolean {
  const row = ctx.db
    .prepare(
      `
        SELECT 1
        FROM edges
        WHERE world_slug = ?
          AND source_node_id = ?
          AND target_node_id = ?
          AND edge_type = 'patched_by'
        LIMIT 1
      `
    )
    .get(worldSlug, targetRecordId, cfId);

  return row !== undefined;
}
