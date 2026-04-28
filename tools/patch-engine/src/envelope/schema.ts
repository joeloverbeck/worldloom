import type {
  CanonFactRecord,
  ChangeLogEntry,
  CharacterDossier,
  DiegeticArtifactFrontmatter,
  InvariantRecord,
  MysteryRecord,
  NamedEntityRecord,
  OpenQuestionRecord,
  SectionRecord
} from "@worldloom/world-index/public/types";

import type { AdjudicationFrontmatter } from "../ops/append-adjudication-record.js";

export interface IdAllocations {
  cf_ids?: string[];
  ch_ids?: string[];
  inv_ids?: string[];
  m_ids?: string[];
  oq_ids?: string[];
  ent_ids?: string[];
  sec_ids?: string[];
  pa_ids?: string[];
  char_ids?: string[];
  da_ids?: string[];
}

export interface PatchPlanEnvelope {
  plan_id: string;
  target_world: string;
  approval_token: string;
  verdict: string;
  originating_skill: string;
  originating_cf_ids?: string[];
  originating_ch_id?: string;
  originating_pa_id?: string;
  expected_id_allocations: IdAllocations;
  patches: PatchOperation[];
}

export type OperationKind =
  | "create_cf_record"
  | "create_ch_record"
  | "create_inv_record"
  | "create_m_record"
  | "create_oq_record"
  | "create_ent_record"
  | "create_sec_record"
  | "update_record_field"
  | "append_extension"
  | "append_touched_by_cf"
  | "append_modification_history_entry"
  | "append_adjudication_record"
  | "append_character_record"
  | "append_diegetic_artifact_record";

export interface RetconAttestation {
  retcon_type: "A" | "B" | "C" | "D" | "E" | "F";
  originating_ch: string;
  rationale: string;
}

export interface ExtensionPayload {
  originating_cf: string;
  change_id: string;
  date: string;
  label: string;
  body: string;
}

export interface FileWriteReceipt {
  file_path: string;
  prior_hash: string;
  new_hash: string;
  ops_applied: number;
}

export interface NewNodeReceipt {
  node_id: string;
  node_type: string;
  file_path: string;
}

export interface ValidatorRunReceipt {
  validator_name: string;
  status: "pass" | "fail" | "skipped";
  duration_ms: number;
  detail?: string;
}

export interface PatchReceipt {
  plan_id: string;
  applied_at: string;
  files_written: FileWriteReceipt[];
  new_nodes: NewNodeReceipt[];
  id_allocations_consumed: IdAllocations;
  index_sync_duration_ms: number;
  validators_run?: ValidatorRunReceipt[];
}

export type PatchOperation =
  | OperationBase<"create_cf_record", { cf_record: CanonFactRecord }>
  | OperationBase<"create_ch_record", { ch_record: ChangeLogEntry }>
  | OperationBase<"create_inv_record", { inv_record: InvariantRecord }>
  | OperationBase<"create_m_record", { m_record: MysteryRecord }>
  | OperationBase<"create_oq_record", { oq_record: OpenQuestionRecord }>
  | OperationBase<"create_ent_record", { ent_record: NamedEntityRecord }>
  | OperationBase<"create_sec_record", { sec_record: SectionRecord }>
  | OperationBase<
      "update_record_field",
      {
        target_record_id: string;
        field_path: string[];
        operation: "set" | "append_list" | "append_text";
        new_value: unknown;
        retcon_attestation?: RetconAttestation;
      }
    >
  | OperationBase<"append_extension", { target_record_id: string; extension: ExtensionPayload }>
  | OperationBase<"append_touched_by_cf", { target_sec_id: string; cf_id: string }>
  | OperationBase<
      "append_modification_history_entry",
      {
        target_cf_id: string;
        change_id: string;
        originating_cf: string;
        date: string;
        summary: string;
      }
    >
  | OperationBase<
      "append_adjudication_record",
      { adjudication_frontmatter: AdjudicationFrontmatter; body_markdown: string; filename?: string }
    >
  | OperationBase<
      "append_character_record",
      { char_record: CharacterDossier; body_markdown: string; filename: string }
    >
  | OperationBase<
      "append_diegetic_artifact_record",
      { da_record: DiegeticArtifactFrontmatter; body_markdown: string; filename: string }
    >;

export type OperationPayload = PatchOperation["payload"];

interface OperationBase<TKind extends OperationKind, TPayload> {
  op: TKind;
  target_world: string;
  target_record_id?: string;
  target_file?: string;
  expected_content_hash?: string;
  expected_anchor_checksum?: string;
  payload: TPayload;
  retcon_attestation?: RetconAttestation;
  failure_mode?: "strict" | "relocate_on_miss";
}
