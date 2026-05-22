import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, queryStructuralRecords, stringValue } from "./utils.js";
import { appliesToStcharStoryState, fail, recordId, shouldCheckRecordInPreApply } from "./stchar-utils.js";

const VALIDATOR = "stchar_source_hash_matches_source";

export const stcharSourceHashMatchesSource: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean => ctx.run_mode === "pre-apply" && appliesToStcharStoryState(ctx),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    if (ctx.run_mode !== "pre-apply") {
      return [];
    }

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
      const sourceCharHash = stringValue(parsed.source_char_hash);
      const source = sourceCharId === undefined ? undefined : sourceChars.get(sourceCharId);
      if (source === undefined) {
        verdicts.push(stcharFail(
          record,
          "source_char_unresolved",
          `${recordId(record)} references unresolved source_char_id ${sourceCharId ?? "null"}.`,
          { source_char_id: sourceCharId ?? null },
          "Set source_char_id to an indexed CHAR dossier before accepting the STCHAR."
        ));
        continue;
      }

      const expected = `sha256:${source.content_hash}`;
      if (sourceCharHash !== expected) {
        verdicts.push(stcharFail(
          record,
          "source_char_hash_mismatch",
          `${recordId(record)} source_char_hash must match ${sourceCharId} content hash.`,
          { source_char_id: sourceCharId, expected, observed: sourceCharHash ?? null },
          `Set source_char_hash to ${expected}.`
        ));
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

function stcharFail(
  record: IndexedRecord,
  code: string,
  message: string,
  detail?: unknown,
  suggested_fix?: string
): Verdict {
  return fail(VALIDATOR, record, `${VALIDATOR}.${code}`, message, detail, suggested_fix);
}
