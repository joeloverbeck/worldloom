import type { PatchOperation } from "../envelope/schema.js";

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
