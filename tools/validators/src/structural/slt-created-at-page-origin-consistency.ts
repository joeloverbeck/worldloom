import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringValue, touchedFilesInclude } from "./utils.js";

const PAGE_ID_PATTERN = /^PG-\d+$/;
const PAGE_INDEPENDENT_ORIGINS = new Set(["bootstrap_seed", "manual_authoring", "author_batch", "audit_repair"]);

export const sltCreatedAtPageOriginConsistency: Validator = {
  name: "slt_created_at_page_origin_consistency",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_slt_record") === true ||
    touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d+\.yaml$|(?:^|\/)_source\/storylets\/SLT-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const storylet of records.filter((record) => record.node_type === "storylet_record")) {
      verdicts.push(...validateStorylet(storylet));
    }

    return verdicts;
  }
};

function validateStorylet(storylet: IndexedRecord): Verdict[] {
  const parsed = asPlainRecord(storylet.parsed);
  const provenance = asPlainRecord(parsed.provenance);
  const origin = stringValue(provenance.origin);
  const createdAtPage = parsed.created_at_page;

  if (origin === "runtime_jit" && !isPageId(createdAtPage)) {
    return [
      mismatch(
        storylet,
        `${storylet.node_id} has provenance.origin runtime_jit but created_at_page is not a PG-<integer> page id.`,
        { origin, created_at_page: createdAtPage ?? null }
      )
    ];
  }

  if (origin !== undefined && !PAGE_INDEPENDENT_ORIGINS.has(origin) && origin !== "runtime_jit") {
    return [
      mismatch(storylet, `${storylet.node_id} has unsupported provenance.origin ${origin}.`, {
        origin,
        created_at_page: createdAtPage ?? null
      })
    ];
  }

  return [];
}

function isPageId(value: unknown): value is string {
  return typeof value === "string" && PAGE_ID_PATTERN.test(value);
}

function mismatch(storylet: IndexedRecord, message: string, detail: unknown): Verdict {
  return {
    validator: "slt_created_at_page_origin_consistency",
    severity: "fail",
    code: "slt_created_at_page_origin_mismatch",
    message,
    location: locationFor(storylet),
    detail,
    suggested_fix: "Set SLT.created_at_page according to shared story-state contract §4.4 provenance-origin rules."
  };
}
