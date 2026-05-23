import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  isPlainRecord,
  locationFor,
  queryStructuralRecords,
  touchedFilesInclude
} from "./utils.js";

const REQUIRED_GATE_KEYS = [
  "input_legality",
  "parent_snapshot_compatibility",
  "mystery_invariant_firewall",
  "branch_isolation",
  "append_only_delta",
  "consequence_or_terminal",
  "plan_grounding",
  "canon_promotion_hold",
  "turn_driver_lawfulness"
] as const;

const REQUIRED_GATE_KEY_SET = new Set<string>(REQUIRED_GATE_KEYS);

export const validationTraceShapeCompliance: Validator = {
  name: "validation_trace_shape_compliance",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_pg_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/pages\/PG-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const page of records.filter((record) => record.node_type === "page_record")) {
      verdicts.push(...validatePageValidationTrace(page));
    }

    return verdicts;
  }
};

function validatePageValidationTrace(page: IndexedRecord): Verdict[] {
  const verdicts: Verdict[] = [];
  const parsed = asPlainRecord(page.parsed);
  const validationTrace = parsed.validation_trace;

  if (!isPlainRecord(validationTrace)) {
    return [
      shapeViolation(
        page,
        `${page.node_id} validation_trace must be a flat object keyed by the nine shared hard gate names.`,
        { actual_type: Array.isArray(validationTrace) ? "array" : typeof validationTrace }
      )
    ];
  }

  if (Object.hasOwn(validationTrace, "gates")) {
    verdicts.push(
      shapeViolation(
        page,
        `${page.node_id} validation_trace must not contain a gates array or gates key; use the flat nine-key mapping.`,
        { key: "gates" }
      )
    );
  }

  const actualKeys = Object.keys(validationTrace);
  const missingKeys = REQUIRED_GATE_KEYS.filter((key) => !Object.hasOwn(validationTrace, key));
  const extraKeys = actualKeys.filter((key) => !REQUIRED_GATE_KEY_SET.has(key));

  if (missingKeys.length > 0) {
    verdicts.push(
      shapeViolation(page, `${page.node_id} validation_trace is missing required shared gate keys.`, {
        missing_keys: missingKeys
      })
    );
  }

  if (extraKeys.length > 0) {
    verdicts.push(
      shapeViolation(page, `${page.node_id} validation_trace contains keys outside the shared hard-gate set.`, {
        extra_keys: extraKeys
      })
    );
  }

  return verdicts;
}

function shapeViolation(page: IndexedRecord, message: string, detail?: unknown): Verdict {
  return {
    validator: "validation_trace_shape_compliance",
    severity: "fail",
    code: "validation_trace_shape_compliance",
    message,
    location: locationFor(page),
    detail,
    suggested_fix: "Conform PG.validation_trace to the flat nine-key mapping in story-state contract §4.2."
  };
}
