import type { IndexedRecord, Verdict } from "../framework/types.js";
import { PRED_TYPES, PREDICATE_ARG_SCHEMAS } from "../rules/_shared/predicate-dsl-grammar.js";
import { asPlainRecord, nestedRecord } from "./utils.js";
import { defineStplanValidator, fail, fallbackTriggerRecordIds, resolveRecord, successConditionRecordIds } from "./stplan-utils.js";

const VALIDATOR = "stplan_predicate_references";
const PRED_TYPE_SET = new Set<string>(PRED_TYPES);
const RECORD_ID = /^(?:STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|INV|SEC)-[0-9]+$/;

type PredicatePath = {
  path: string;
  value: unknown;
};

export const stplanPredicateReferences = defineStplanValidator(VALIDATOR, (plan, _ctx, maps): Verdict[] => {
  const verdicts: Verdict[] = [];

  for (const predicate of predicatePaths(plan)) {
    validatePredicateObject(plan, predicate.value, predicate.path, verdicts);
  }

  for (const id of new Set([...successConditionRecordIds(plan), ...fallbackTriggerRecordIds(plan)])) {
    if (resolveRecord(plan, id, maps) === undefined) {
      verdicts.push(fail(
        plan,
        VALIDATOR,
        "stplan_predicate_references.predicate_record_unresolved",
        `predicate reference ${id} must resolve to a record in the story bundle.`,
        { id }
      ));
    }
  }

  return verdicts;
});

function predicatePaths(plan: IndexedRecord): PredicatePath[] {
  const paths: PredicatePath[] = [];
  const parsed = asPlainRecord(plan.parsed);
  const successPredicates = nestedRecord(nestedRecord(parsed, "current_step"), "success_condition").predicates;
  collectPredicateList(successPredicates, "current_step.success_condition.predicates", paths);

  const fallbackSteps = parsed.fallback_steps;
  if (Array.isArray(fallbackSteps)) {
    fallbackSteps.forEach((step, stepIndex) => {
      const triggerPredicates = nestedRecord(asPlainRecord(step), "trigger_condition").predicates;
      collectPredicateList(triggerPredicates, `fallback_steps[${stepIndex}].trigger_condition.predicates`, paths);
    });
  }
  return paths;
}

function collectPredicateList(value: unknown, path: string, paths: PredicatePath[]): void {
  if (!Array.isArray(value)) {
    return;
  }
  value.forEach((entry, index) => collectPredicate(entry, `${path}[${index}]`, paths));
}

function collectPredicate(value: unknown, path: string, paths: PredicatePath[]): void {
  paths.push({ path, value });
  if (typeof value !== "object" || value === null) {
    return;
  }
  const predicate = asPlainRecord(value);
  if ("predicate" in predicate) {
    collectPredicate(predicate.predicate, `${path}.predicate`, paths);
  }
  if ("predicates" in predicate) {
    collectPredicateList(predicate.predicates, `${path}.predicates`, paths);
  }
}

function validatePredicateObject(plan: IndexedRecord, value: unknown, path: string, verdicts: Verdict[]): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    verdicts.push(unparseable(plan, `${path} must be a predicate object with pred.`, path));
    return;
  }
  const predicate = asPlainRecord(value);
  if (typeof predicate.pred !== "string" || !PRED_TYPE_SET.has(predicate.pred)) {
    verdicts.push(unparseable(plan, `${path} uses unknown or missing pred.`, `${path}.pred`));
    return;
  }
  const schema = PREDICATE_ARG_SCHEMAS[predicate.pred as keyof typeof PREDICATE_ARG_SCHEMAS];
  for (const field of schema.required) {
    if (!(field in predicate)) {
      verdicts.push(unparseable(plan, `${path} missing required predicate field ${field}.`, `${path}.${field}`));
    }
  }
  if (predicate.pred === "not" && (typeof predicate.predicate !== "object" || predicate.predicate === null || Array.isArray(predicate.predicate))) {
    verdicts.push(unparseable(plan, `${path}.predicate must be a predicate object.`, `${path}.predicate`));
  }
  if ((predicate.pred === "all" || predicate.pred === "any") && !Array.isArray(predicate.predicates)) {
    verdicts.push(unparseable(plan, `${path}.predicates must be a list of predicate objects.`, `${path}.predicates`));
  }
  for (const [field, fieldValue] of Object.entries(predicate)) {
    if (typeof fieldValue === "string" && /-[0-9]+$/.test(fieldValue) && !RECORD_ID.test(fieldValue) && field !== "pred") {
      verdicts.push(unparseable(plan, `${path}.${field} has malformed record-id value ${fieldValue}.`, `${path}.${field}`));
    }
  }
}

function unparseable(plan: IndexedRecord, message: string, path: string): Verdict {
  return fail(
    plan,
    VALIDATOR,
    "stplan_predicate_references.predicate_unparseable",
    message,
    { path }
  );
}
