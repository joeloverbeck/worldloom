import type { PatchOperation } from "../envelope/schema.js";

const TIER_ONE = new Set<PatchOperation["op"]>([
  "create_cf_record",
  "create_ch_record",
  "create_inv_record",
  "create_m_record",
  "create_oq_record",
  "create_ent_record",
  "create_sec_record",
  "create_stent_record",
  "create_ststat_record",
  "create_sf_record",
  "create_se_record",
  "create_obl_record",
  "create_cnsq_record",
  "create_thr_record",
  "create_srel_record",
  "create_stint_record",
  "create_stloc_record",
  "create_stobj_record",
  "create_br_record",
  "create_pg_record",
  "create_chc_record",
  "create_slt_record",
  "create_bel_record",
  "create_clk_record",
  "supersede_clk_record",
  "create_stsec_record",
  "supersede_stsec_record",
  "create_stq_record",
  "supersede_stq_record",
  "create_stplan_record",
  "create_stemo_record",
  "append_story_character_authority_record",
  "supersede_story_character_authority_record",
  "append_story_diegetic_artifact_record"
]);

const TIER_TWO = new Set<PatchOperation["op"]>([
  "update_record_field",
  "repair_skipped_change_log_entry",
  "remove_ch_affected_cf_ids",
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
