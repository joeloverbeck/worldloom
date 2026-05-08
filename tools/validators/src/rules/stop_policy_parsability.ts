import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor } from "../structural/utils.js";
import {
  INTERRUPT_BEFORE_STOP_PREDICATES,
  NORMAL_EXIT_STOP_PREDICATES,
  STOP_PREDICATE_ARG_SCHEMAS,
  STOP_PREDICATES
} from "./_shared/predicate-dsl-grammar.js";

const VALIDATOR = "stop_policy_parsability";

const STOP_PREDICATE_SET = new Set<string>(STOP_PREDICATES);
const NORMAL_EXIT_SET = new Set<string>(NORMAL_EXIT_STOP_PREDICATES);
const INTERRUPT_BEFORE_SET = new Set<string>(INTERRUPT_BEFORE_STOP_PREDICATES);
const LOWER_LABEL = /^[a-z][a-z0-9_-]*$/;
const ROLE_REF = /^role:[a-z][a-z0-9_-]*$/;
const STORY_REF = /^(?:STENT|OBL|THR|M)-\d{4}$/;

export const stopPolicyParsability: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some((patch) => patch.op === "create_slt_record")) ||
    (ctx.run_mode === "incremental" && ctx.touched_files.some(isStoryletPath)),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const storylets = await ctx.index.query({
      world_slug: ctx.world_slug,
      record_type: "storylet_record",
      ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
    });
    const verdicts: Verdict[] = [];

    for (const record of storylets) {
      const parsed = asPlainRecord(record.parsed);
      if (parsed.shape !== "scene_commitment_arc") {
        continue;
      }
      const stopPolicy = parsed.stop_policy;
      if (!isRecord(stopPolicy)) {
        continue;
      }
      validateStopList(verdicts, record, stopPolicy.normal_exits, "normal_exits", NORMAL_EXIT_SET);
      validateStopList(verdicts, record, stopPolicy.interrupt_before, "interrupt_before", INTERRUPT_BEFORE_SET);
    }

    return verdicts;
  }
};

function validateStopList(
  verdicts: Verdict[],
  record: IndexedRecord,
  value: unknown,
  field: "normal_exits" | "interrupt_before",
  allowedForField: ReadonlySet<string>
): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!Array.isArray(value)) {
    addFailure(verdicts, record, "stop_policy_parsability.expected_list", `${recordId(record)} stop_policy.${field} must be a list`, `stop_policy.${field}`);
    return;
  }
  value.forEach((entry, index) => validateStopEntry(verdicts, record, entry, `stop_policy.${field}[${index}]`, allowedForField));
}

function validateStopEntry(
  verdicts: Verdict[],
  record: IndexedRecord,
  value: unknown,
  path: string,
  allowedForField: ReadonlySet<string>
): void {
  if (!isRecord(value)) {
    addFailure(verdicts, record, "stop_policy_parsability.expected_object", `${recordId(record)} ${path} must be an object`, path);
    return;
  }
  if (typeof value.predicate !== "string") {
    addFailure(verdicts, record, "stop_policy_parsability.missing_predicate", `${recordId(record)} ${path}.predicate must be a string`, `${path}.predicate`);
    return;
  }
  if (!STOP_PREDICATE_SET.has(value.predicate)) {
    addFailure(verdicts, record, "stop_policy_parsability.unknown_predicate", `${recordId(record)} ${path}.predicate uses unknown stop predicate '${value.predicate}'`, `${path}.predicate`);
    return;
  }
  if (!allowedForField.has(value.predicate)) {
    addFailure(verdicts, record, "stop_policy_parsability.wrong_stop_policy_section", `${recordId(record)} ${path}.predicate '${value.predicate}' is not valid in this stop-policy section`, `${path}.predicate`);
    return;
  }
  const args = value.args;
  if (!isRecord(args)) {
    addFailure(verdicts, record, "stop_policy_parsability.invalid_args", `${recordId(record)} ${path}.args must be an object`, `${path}.args`);
    return;
  }
  const schema = STOP_PREDICATE_ARG_SCHEMAS[value.predicate as keyof typeof STOP_PREDICATE_ARG_SCHEMAS];
  for (const key of schema.required) {
    if (!isValidArgValue(key, args[key])) {
      addFailure(
        verdicts,
        record,
        "stop_policy_parsability.invalid_args",
        `${recordId(record)} ${path}.args.${key} is required for ${value.predicate}`,
        `${path}.args.${key}`
      );
    }
  }
}

function isValidArgValue(key: string, value: unknown): boolean {
  if (key === "npc" || key === "participant") {
    return typeof value === "string" && (ROLE_REF.test(value) || /^STENT-\d{4}$/.test(value));
  }
  if (key === "thread_id") {
    return typeof value === "string" && /^THR-\d{4}$/.test(value);
  }
  if (key === "mystery_id") {
    return typeof value === "string" && /^M-\d{4}$/.test(value);
  }
  if (key === "obligation_id") {
    return typeof value === "string" && /^OBL-\d{4}$/.test(value);
  }
  return typeof value === "string" && (LOWER_LABEL.test(value) || STORY_REF.test(value));
}

function isStoryletPath(file: string): boolean {
  return /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d{4}\.yaml$|(?:^|\/)_source\/storylets\/SLT-\d{4}\.yaml$/.test(file);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addFailure(verdicts: Verdict[], record: IndexedRecord, code: string, message: string, path: string): void {
  verdicts.push({
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(record),
    suggested_fix: `Rewrite ${path} so it matches the stop-policy predicate grammar.`
  });
}

function recordId(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return typeof parsed.id === "string" ? parsed.id : record.node_id;
}
