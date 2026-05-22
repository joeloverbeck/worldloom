import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringValue, toPosixPath } from "./utils.js";
import { appliesToStcharStoryState, fail, recordId, shouldCheckRecordInPreApply } from "./stchar-utils.js";

const VALIDATOR = "stchar_source_fact_coverage";

const OPERATIONAL_SOURCE_FIELDS = [
  "world_produced_wound",
  "active_appetite",
  "self_mythology",
  "irreconcilable_contradiction",
  "pressure_behavior",
  "relational_charge",
  "moral_psychological_edge",
  "signature_scene_behaviors",
  "voice_under_pressure",
  "cannot_be_swapped_out_because"
] as const;

const RETAINED_DISPOSITIONS = new Set(["copied", "transformed", "compressed"]);
const OMITTED_DISPOSITIONS = new Set(["omitted_with_rationale", "story_irrelevant"]);
const VALID_DISPOSITIONS = new Set([...RETAINED_DISPOSITIONS, ...OMITTED_DISPOSITIONS]);
const OPERATIONAL_TARGET_SECTIONS = new Set([
  "Story-Facing Identity",
  "Stable Persona Core",
  "Emotional Appraisal Map",
  "Pressure Behavior",
  "Voice Bible / Dialogue Authority",
  "Page-Plan Voice Block",
  "Perception and Embodiment",
  "Agency and Planning Tendencies",
  "Relationship-Specific Behavior",
  "Story-State Derivation Guide",
  "Prose Rendering Constraints"
]);

type Severity = "fail" | "warn";

interface SourceFactMapEntry {
  sourceField: string | undefined;
  disposition: string | undefined;
  targetSection: string | undefined;
  rationale: string | undefined;
}

export const stcharSourceFactCoverage: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const sourceChars = sourceCharsById(records);
    const verdicts: Verdict[] = [];

    for (const record of records) {
      if (record.node_type !== "story_character_authority_record" || !shouldCheckRecordInPreApply(record, ctx)) {
        continue;
      }

      const parsed = asPlainRecord(record.parsed);
      if (stringValue(parsed.source_kind) !== "world_char") {
        continue;
      }

      const sourceCharId = stringValue(parsed.source_char_id);
      const source = sourceCharId === undefined ? undefined : sourceChars.get(sourceCharId);
      if (source === undefined) {
        verdicts.push(stcharVerdict(
          record,
          recordSeverity(record, ctx),
          "source_char_unresolved",
          `${recordId(record)} cannot check source operational fact coverage because source_char_id ${sourceCharId ?? "null"} does not resolve.`,
          { source_char_id: sourceCharId ?? null },
          "Set source_char_id to an indexed CHAR dossier before accepting the STCHAR."
        ));
        continue;
      }

      const presentFields = presentOperationalFields(source);
      if (presentFields.length === 0) {
        continue;
      }

      const entries = sourceFactMapEntries(parsed.source_operational_fact_map);
      const severity = recordSeverity(record, ctx);
      if (entries.length === 0) {
        verdicts.push(stcharVerdict(
          record,
          severity,
          "missing_fact_map",
          `${recordId(record)} has structured source operational facts but no source_operational_fact_map.`,
          { source_char_id: sourceCharId, missing_source_fields: presentFields },
          "Map every present dramatic_core source field or mark it intentionally omitted with rationale."
        ));
        continue;
      }

      const entriesByField = entriesBySourceField(entries);
      for (const field of presentFields) {
        const fieldEntries = entriesByField.get(field) ?? [];
        if (fieldEntries.length === 0) {
          verdicts.push(stcharVerdict(
            record,
            severity,
            "missing_source_field",
            `${recordId(record)} source_operational_fact_map is missing source field ${field}.`,
            { source_char_id: sourceCharId, source_field: field },
            `Add a source_operational_fact_map entry for ${field}.`
          ));
          continue;
        }
        if (fieldEntries.length > 1) {
          verdicts.push(stcharVerdict(
            record,
            severity,
            "duplicate_source_field",
            `${recordId(record)} source_operational_fact_map has duplicate entries for ${field}.`,
            { source_char_id: sourceCharId, source_field: field, count: fieldEntries.length },
            `Keep exactly one source_operational_fact_map entry for ${field}.`
          ));
        }
      }

      for (const [index, entry] of entries.entries()) {
        verdicts.push(...entryVerdicts(record, sourceCharId, index, entry, severity));
      }
    }

    return verdicts;
  }
};

function sourceCharsById(records: readonly IndexedRecord[]): Map<string, IndexedRecord & { content_hash: string }> {
  const chars = new Map<string, IndexedRecord & { content_hash: string }>();
  for (const record of records) {
    if (record.node_type !== "character_record" || record.content_hash === undefined) {
      continue;
    }
    const parsed = asPlainRecord(record.parsed);
    const frontmatterId = stringValue(parsed.character_id) ?? stringValue(parsed.id);
    chars.set(record.node_id, record as IndexedRecord & { content_hash: string });
    if (frontmatterId !== undefined) {
      chars.set(frontmatterId, record as IndexedRecord & { content_hash: string });
    }
  }
  return chars;
}

function presentOperationalFields(source: IndexedRecord): string[] {
  const dramaticCore = asPlainRecord(asPlainRecord(source.parsed).dramatic_core);
  return OPERATIONAL_SOURCE_FIELDS.filter((field) => isPresentOperationalValue(dramaticCore[field]));
}

function isPresentOperationalValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  const record = asPlainRecord(value);
  return Object.keys(record).length > 0;
}

function sourceFactMapEntries(value: unknown): SourceFactMapEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const entry = asPlainRecord(item);
    return {
      sourceField: stringValue(entry.source_field),
      disposition: stringValue(entry.disposition),
      targetSection: stringValue(entry.target_section),
      rationale: stringValue(entry.rationale)
    };
  });
}

function entriesBySourceField(entries: readonly SourceFactMapEntry[]): Map<string, SourceFactMapEntry[]> {
  const byField = new Map<string, SourceFactMapEntry[]>();
  for (const entry of entries) {
    if (entry.sourceField === undefined) {
      continue;
    }
    const bucket = byField.get(entry.sourceField) ?? [];
    bucket.push(entry);
    byField.set(entry.sourceField, bucket);
  }
  return byField;
}

function entryVerdicts(
  record: IndexedRecord,
  sourceCharId: string | undefined,
  index: number,
  entry: SourceFactMapEntry,
  severity: Severity
): Verdict[] {
  const verdicts: Verdict[] = [];
  const detail = { source_char_id: sourceCharId ?? null, entry_index: index, source_field: entry.sourceField ?? null };

  if (entry.sourceField === undefined || !OPERATIONAL_SOURCE_FIELDS.includes(entry.sourceField as typeof OPERATIONAL_SOURCE_FIELDS[number])) {
    verdicts.push(stcharVerdict(
      record,
      severity,
      "unknown_source_field",
      `${recordId(record)} source_operational_fact_map[${index}] names an unknown source_field.`,
      detail,
      "Use one of the 10 dramatic_core engine field names."
    ));
  }

  if (entry.disposition === undefined || !VALID_DISPOSITIONS.has(entry.disposition)) {
    verdicts.push(stcharVerdict(
      record,
      severity,
      "invalid_disposition",
      `${recordId(record)} source_operational_fact_map[${index}] has an invalid disposition.`,
      { ...detail, disposition: entry.disposition ?? null },
      "Use copied, transformed, compressed, omitted_with_rationale, or story_irrelevant."
    ));
    return verdicts;
  }

  if (RETAINED_DISPOSITIONS.has(entry.disposition)) {
    if (entry.targetSection === undefined) {
      verdicts.push(stcharVerdict(
        record,
        severity,
        "missing_target_section",
        `${recordId(record)} retained source_operational_fact_map[${index}] must name a target_section.`,
        detail,
        "Set target_section to the operational STCHAR H2 that carries this source fact."
      ));
    } else if (entry.targetSection === "Source Distillation") {
      verdicts.push(stcharVerdict(
        record,
        severity,
        "source_distillation_target",
        `${recordId(record)} retained source_operational_fact_map[${index}] targets Source Distillation instead of an operational STCHAR home.`,
        { ...detail, target_section: entry.targetSection },
        "Move retained operational facts to an operational STCHAR H2 such as Prose Rendering Constraints."
      ));
    } else if (!OPERATIONAL_TARGET_SECTIONS.has(entry.targetSection)) {
      verdicts.push(stcharVerdict(
        record,
        severity,
        "invalid_target_section",
        `${recordId(record)} retained source_operational_fact_map[${index}] targets a non-operational STCHAR section.`,
        { ...detail, target_section: entry.targetSection },
        "Set target_section to a real operational STCHAR H2 section."
      ));
    }
  }

  if (OMITTED_DISPOSITIONS.has(entry.disposition) && entry.rationale === undefined) {
    verdicts.push(stcharVerdict(
      record,
      severity,
      "missing_rationale",
      `${recordId(record)} omitted source_operational_fact_map[${index}] must include a rationale.`,
      { ...detail, disposition: entry.disposition },
      "Add a non-empty rationale for omitted_with_rationale or story_irrelevant dispositions."
    ));
  }

  return verdicts;
}

function recordSeverity(record: IndexedRecord, ctx: Context): Severity {
  if (ctx.run_mode === "pre-apply" || ctx.touched_files.some((file) => toPosixPath(file) === toPosixPath(record.file_path))) {
    return "fail";
  }
  return "warn";
}

function stcharVerdict(
  record: IndexedRecord,
  severity: Severity,
  code: string,
  message: string,
  detail?: unknown,
  suggested_fix?: string
): Verdict {
  if (severity === "fail") {
    return fail(VALIDATOR, record, `${VALIDATOR}.${code}`, message, detail, suggested_fix);
  }
  return {
    validator: VALIDATOR,
    severity,
    code: `${VALIDATOR}.${code}`,
    message,
    location: locationFor(record),
    ...(detail === undefined ? {} : { detail }),
    ...(suggested_fix === undefined ? {} : { suggested_fix })
  };
}
