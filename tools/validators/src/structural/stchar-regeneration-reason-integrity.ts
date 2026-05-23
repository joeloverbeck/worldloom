import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  queryStructuralRecords,
  stringArray,
  stringValue,
  toPosixPath
} from "./utils.js";
import {
  appliesToStcharStoryState,
  fail,
  recordId,
  shouldCheckRecordInPreApply
} from "./stchar-utils.js";

const VALIDATOR = "stchar_regeneration_reason_integrity";
const STCHAR_PATH = /^stories\/[^/]+\/story-characters\/STCHAR-(0|[1-9][0-9]*)\.md$/;
const VALID_REASON_CLASSES = new Set([
  "source_world_char_material_change",
  "durable_branch_transformation",
  "profile_fidelity_failure",
  "story_local_character_promotion",
  "stable_source_material_omission_repair"
]);
const STORY_LOCAL_RECORD_ID = /\b(STENT|SF|BEL|DA|SE|CHC|STPLAN|STEMO|SREL|STINT|STSTAT|STLOC|STOBJ|THR|OBL|CNSQ|CLK|STSEC|STQ|PG|BR|SLT)-(0|[1-9][0-9]*)\b/g;
const ORDINARY_STATE_RECORD_ID = /\b(BEL|SE|STPLAN|STEMO|SREL|STINT|STSTAT|STLOC|STOBJ|THR|OBL|CNSQ|CLK|STSEC|STQ|PG)-(0|[1-9][0-9]*)\b/g;
const ORDINARY_STATE_RECORD = /^(BEL|SE|STPLAN|STEMO|SREL|STINT|STSTAT|STLOC|STOBJ|THR|OBL|CNSQ|CLK|STSEC|STQ|PG)-(0|[1-9][0-9]*)$/;
const FIDELITY_EVIDENCE = /\b(prose[- ]receipt|page[- ]plan|profile fidelity|fidelity failure)\b/i;
const SOURCE_MATERIAL_EVIDENCE = /\b(Stable Source Material Inventory|stchar_source_fact_coverage|stchar_source_material_inventory_integrity|source material|coverage failure)\b/i;
const DURABLE_CONSOLIDATION_EVIDENCE = /\b(durable|consolidat(?:ed|ion)|branch transformation|profile fidelity|stable source material|omission repair|world CHAR material change|story-local character promotion)\b/i;

export const stcharRegenerationReasonIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const record of records) {
      if (record.node_type !== "story_character_authority_record" || !STCHAR_PATH.test(toPosixPath(record.file_path))) {
        continue;
      }
      if (!shouldCheckRecordInPreApply(record, ctx) || !requiresReason(record)) {
        continue;
      }

      verdicts.push(...regenerationReasonVerdicts(record));
    }

    return verdicts;
  }
};

function regenerationReasonVerdicts(record: IndexedRecord): Verdict[] {
  const parsed = asPlainRecord(record.parsed);
  const reason = stringValue(parsed.regeneration_reason_class);
  const verdicts: Verdict[] = [];

  if (reason === undefined || !VALID_REASON_CLASSES.has(reason)) {
    verdicts.push(stcharFail(
      record,
      "missing_or_invalid_reason_class",
      `${recordId(record)} regenerated/superseding STCHAR must set regeneration_reason_class to one of the 5 durable reason classes.`,
      { regeneration_reason_class: parsed.regeneration_reason_class ?? null },
      "Set regeneration_reason_class to source_world_char_material_change, durable_branch_transformation, profile_fidelity_failure, story_local_character_promotion, or stable_source_material_omission_repair."
    ));
    return verdicts;
  }

  const evidenceText = evidenceCorpus(parsed);

  if (reason === "durable_branch_transformation" && !hasStoryLocalEvidence(parsed, evidenceText)) {
    verdicts.push(stcharFail(
      record,
      "durable_branch_transformation_missing_story_local_evidence",
      `${recordId(record)} durable_branch_transformation regeneration must cite at least one story-local evidence record.`,
      { regeneration_reason_class: reason },
      "Cite a story-local evidence record in story_local_inputs_used[] or Validation / Audit Anchors."
    ));
  }

  if (reason === "source_world_char_material_change" && stringValue(parsed.source_char_id) === undefined) {
    verdicts.push(stcharFail(
      record,
      "source_world_char_material_change_missing_source_char_id",
      `${recordId(record)} source_world_char_material_change regeneration must retain source_char_id as structural source evidence.`,
      { regeneration_reason_class: reason, source_char_id: parsed.source_char_id ?? null },
      "Set source_char_id to the source CHAR id; do not add a hash-based source-drift mechanism."
    ));
  }

  if (reason === "profile_fidelity_failure" && !FIDELITY_EVIDENCE.test(evidenceText)) {
    verdicts.push(stcharFail(
      record,
      "profile_fidelity_failure_missing_fidelity_evidence",
      `${recordId(record)} profile_fidelity_failure regeneration must cite prose-receipt or page-plan fidelity evidence.`,
      { regeneration_reason_class: reason },
      "Cite prose-receipt or page-plan fidelity evidence in Validation / Audit Anchors or story_local_inputs_used[]."
    ));
  }

  if (reason === "stable_source_material_omission_repair" && !SOURCE_MATERIAL_EVIDENCE.test(evidenceText)) {
    verdicts.push(stcharFail(
      record,
      "stable_source_material_omission_repair_missing_source_material_evidence",
      `${recordId(record)} stable_source_material_omission_repair regeneration must cite source-material-inventory or prior coverage-failure evidence.`,
      { regeneration_reason_class: reason },
      "Cite Stable Source Material Inventory evidence or a prior STCHAR source-coverage failure."
    ));
  }

  if (ordinaryStateOnlyEvidence(parsed, evidenceText)) {
    verdicts.push(stcharFail(
      record,
      "ordinary_state_not_regeneration_reason",
      `${recordId(record)} regeneration evidence consists only of ordinary active-state records without a durable-consolidation rationale.`,
      { regeneration_reason_class: reason, story_local_inputs_used: stringArray(parsed.story_local_inputs_used) },
      "Add durable-consolidation rationale in Validation / Audit Anchors, or route ordinary current-state updates to state records instead of STCHAR regeneration."
    ));
  }

  return verdicts;
}

function requiresReason(record: IndexedRecord): boolean {
  const parsed = asPlainRecord(record.parsed);
  return stringValue(parsed.source_kind) === "regenerated" || stringValue(parsed.supersedes) !== undefined;
}

function hasStoryLocalEvidence(parsed: Record<string, unknown>, evidenceText: string): boolean {
  return stringArray(parsed.story_local_inputs_used).length > 0 || STORY_LOCAL_RECORD_ID.test(evidenceText);
}

function ordinaryStateOnlyEvidence(parsed: Record<string, unknown>, evidenceText: string): boolean {
  const inputIds = stringArray(parsed.story_local_inputs_used);
  if (inputIds.length === 0) {
    return false;
  }
  if (!inputIds.every((id) => ORDINARY_STATE_RECORD.test(id))) {
    return false;
  }
  return !DURABLE_CONSOLIDATION_EVIDENCE.test(evidenceText);
}

function evidenceCorpus(parsed: Record<string, unknown>): string {
  return [
    ...stringArray(parsed.story_local_inputs_used),
    stringValue(parsed.validation_audit_anchors),
    stringValue(parsed.validation_audit_anchor),
    stringValue(parsed.audit_anchors),
    stringValue(parsed.audit_anchor)
  ].filter((value): value is string => value !== undefined && value.length > 0).join("\n");
}

function stcharFail(
  record: IndexedRecord,
  code: string,
  message: string,
  detail?: unknown,
  suggested_fix?: string
): Verdict {
  return fail(VALIDATOR, record, `${VALIDATOR}.${code}`, message, detail, suggested_fix);
}
