import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor } from "../structural/utils.js";
import {
  ENTITY_STATE_PROPERTIES,
  EPISTEMIC_CLASSES,
  EQUALITY_OPERATORS,
  EQUALITY_OR_SET_OPERATORS,
  FACT_MATCHES_PREDICATES,
  OBLIGATION_STATE_PROPERTIES,
  OBLIGATION_STATUSES,
  PRED_TYPES,
  RELATIONAL_OPERATORS,
  RELATIONSHIP_AXES,
  SET_OPERATORS
} from "./_shared/predicate-dsl-grammar.js";

const VALIDATOR = "storylet_predicate_dsl_parsability";
const MAX_DEPTH = 10;

const PRED_TYPE_SET = new Set<string>(PRED_TYPES);
const RELATIONAL_OPERATOR_SET = new Set<string>(RELATIONAL_OPERATORS);
const SET_OPERATOR_SET = new Set<string>(SET_OPERATORS);
const EQUALITY_OPERATOR_SET = new Set<string>(EQUALITY_OPERATORS);
const EQUALITY_OR_SET_OPERATOR_SET = new Set<string>(EQUALITY_OR_SET_OPERATORS);
const FACT_MATCHES_PREDICATE_SET = new Set<string>(FACT_MATCHES_PREDICATES);
const ENTITY_STATE_PROPERTY_SET = new Set<string>(ENTITY_STATE_PROPERTIES);
const RELATIONSHIP_AXIS_SET = new Set<string>(RELATIONSHIP_AXES);
const EPISTEMIC_CLASS_SET = new Set<string>(EPISTEMIC_CLASSES);
const OBLIGATION_STATE_PROPERTY_SET = new Set<string>(OBLIGATION_STATE_PROPERTIES);
const OBLIGATION_STATUS_SET = new Set<string>(OBLIGATION_STATUSES);

const ROLE_REF = /^role:[a-z][a-z0-9_-]*$/;
const STORY_ID_PATTERNS = {
  fact: /^SF-\d{4}$/,
  entity: /^STENT-\d{4}$/,
  location: /^STLOC-\d{4}$/,
  obligation: /^OBL-\d{4}$/
} as const;
const OPEN_LABEL = /^[a-z][a-z0-9_:-]*$/;
const WORLD_ENTITY_REF = /^entity:[a-z][a-z0-9-]*$/;
const DURATION = /^(?:hours|days|weeks):[0-9]+$/;

interface ReferenceSets {
  facts: Map<string, Set<string>>;
  entities: Map<string, Set<string>>;
  locations: Map<string, Set<string>>;
  obligations: Map<string, Set<string>>;
}

interface ValidationState {
  record: IndexedRecord;
  verdicts: Verdict[];
  refs: ReferenceSets;
}

export const storyletPredicateDslParsability: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "incremental" && ctx.touched_files.some((file) => /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d{4}\.yaml$|(?:^|\/)_source\/storylets\/SLT-\d{4}\.yaml$/.test(file))),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const storylets = await queryStoryScoped(ctx, "storylet_record");
    const refs = await loadReferenceSets(ctx);
    const verdicts: Verdict[] = [];

    for (const record of storylets) {
      const state: ValidationState = { record, refs, verdicts };
      const parsed = asPlainRecord(record.parsed);
      validatePredicateList(state, parsed.hard_preconds, "hard_preconds");
      validatePredicateList(state, parsed.soft_preconds, "soft_preconds");
      validateCastRequirements(state, parsed.cast_requirements);
      validatePredicateList(state, parsed.location_requirements, "location_requirements");
      validateChoiceTemplatePreconditions(state, parsed.choice_templates);
    }

    return verdicts;
  }
};

async function loadReferenceSets(ctx: Context): Promise<ReferenceSets> {
  const query = async (record_type: string): Promise<Map<string, Set<string>>> => {
    const records = await queryStoryScoped(ctx, record_type);
    const idsByStory = new Map<string, Set<string>>();
    for (const record of records) {
      const parsed = asPlainRecord(record.parsed);
      const authoredId = typeof parsed.id === "string" ? parsed.id : bareStoryId(record.node_id);
      if (authoredId) {
        let ids = idsByStory.get(storyKeyFor(record));
        if (!ids) {
          ids = new Set<string>();
          idsByStory.set(storyKeyFor(record), ids);
        }
        ids.add(authoredId);
      }
    }
    return idsByStory;
  };

  return {
    facts: await query("story_fact_record"),
    entities: await query("story_entity_record"),
    locations: await query("story_location_record"),
    obligations: await query("obligation_record")
  };
}

function queryStoryScoped(ctx: Context, record_type: string): Promise<IndexedRecord[]> {
  return ctx.index.query({
    world_slug: ctx.world_slug,
    record_type,
    ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
  });
}

function validateCastRequirements(state: ValidationState, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!Array.isArray(value)) {
    addFailure(state, "predicate.expected_list", "cast_requirements must be a list", "cast_requirements");
    return;
  }
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      addFailure(state, "predicate.expected_object", "cast_requirements entries must be objects", `cast_requirements[${index}]`);
      return;
    }
    if ("pred" in entry) {
      validatePredicate(state, entry, `cast_requirements[${index}]`, 0);
    }
    if ("predicates" in entry) {
      validatePredicateList(state, entry.predicates, `cast_requirements[${index}].predicates`);
    }
  });
}

function validateChoiceTemplatePreconditions(state: ValidationState, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!Array.isArray(value)) {
    addFailure(state, "predicate.expected_list", "choice_templates must be a list", "choice_templates");
    return;
  }
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      return;
    }
    for (const field of ["preconditions", "hard_preconds", "soft_preconds"]) {
      if (field in entry) {
        validatePredicateList(state, entry[field], `choice_templates[${index}].${field}`);
      }
    }
  });
}

function validatePredicateList(state: ValidationState, value: unknown, path: string): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!Array.isArray(value)) {
    addFailure(state, "predicate.expected_list", `${path} must be a list of predicate objects`, path);
    return;
  }
  value.forEach((entry, index) => validatePredicate(state, entry, `${path}[${index}]`, 0));
}

function validatePredicate(state: ValidationState, value: unknown, path: string, depth: number): void {
  if (depth > MAX_DEPTH) {
    addFailure(state, "predicate.recursion_depth", `${path} exceeds predicate recursion depth ${MAX_DEPTH}`, path);
    return;
  }
  if (!isRecord(value)) {
    addFailure(state, "predicate.expected_object", `${path} must be a predicate object with pred`, path);
    return;
  }
  if (typeof value.pred !== "string") {
    addFailure(state, "predicate.missing_pred", `${path} is missing string pred`, path);
    return;
  }
  if (!PRED_TYPE_SET.has(value.pred)) {
    addFailure(state, "predicate.unknown_pred", `${path} uses unknown pred '${value.pred}'`, `${path}.pred`);
    return;
  }

  switch (value.pred) {
    case "fact_true":
      requireStoryRef(state, value.fact, "fact", idsFor(state.refs.facts, state.record), `${path}.fact`);
      return;
    case "fact_matches":
      requireActorRef(state, value.subject, `${path}.subject`);
      requireEnum(state, value.predicate, FACT_MATCHES_PREDICATE_SET, `${path}.predicate`);
      requirePresent(state, value.object, `${path}.object`);
      return;
    case "entity_state":
      requireActorRef(state, value.entity, `${path}.entity`);
      requireEnum(state, value.property, ENTITY_STATE_PROPERTY_SET, `${path}.property`);
      requireOperator(state, value.op, RELATIONAL_OPERATOR_SET, `${path}.op`);
      requirePresent(state, value.value, `${path}.value`);
      return;
    case "relationship":
      requireActorRef(state, value.from, `${path}.from`);
      requireActorRef(state, value.to, `${path}.to`);
      requireEnum(state, value.axis, RELATIONSHIP_AXIS_SET, `${path}.axis`);
      requireOperator(state, value.op, RELATIONAL_OPERATOR_SET, `${path}.op`);
      requireNumber(state, value.value, `${path}.value`);
      return;
    case "consequence_pending":
      requireOpenLabel(state, value.kind, `${path}.kind`);
      requireIntegerInRange(state, value.salience_min, 0, 10, `${path}.salience_min`);
      return;
    case "obligation_open":
      validateObligationMatcher(state, value.matcher, `${path}.matcher`);
      return;
    case "location":
      requireLocationRef(state, value.current_location, `${path}.current_location`);
      return;
    case "epistemic":
      requireStoryRef(state, value.fact, "fact", idsFor(state.refs.facts, state.record), `${path}.fact`);
      requireEnum(state, value.class, EPISTEMIC_CLASS_SET, `${path}.class`);
      requireNumberInRange(state, value.certainty_min, 0, 1, `${path}.certainty_min`);
      return;
    case "not":
      validatePredicate(state, value.predicate, `${path}.predicate`, depth + 1);
      return;
    case "all":
    case "any":
      validateNestedPredicates(state, value.predicates, `${path}.predicates`, depth);
      return;
    case "relationship_state":
      validatePair(state, value.between, `${path}.between`);
      requireOpenLabel(state, value.property, `${path}.property`);
      requireOperator(state, value.op, RELATIONAL_OPERATOR_SET, `${path}.op`);
      requirePresent(state, value.value, `${path}.value`);
      return;
    case "time_of_day":
    case "time_of_week":
    case "time_in_story":
      validateScalarOrListPredicateValue(state, value, `${path}`);
      return;
    case "time_since_event":
      requireOpenLabel(state, value.event_kind, `${path}.event_kind`);
      requireOperator(state, value.op, RELATIONAL_OPERATOR_SET, `${path}.op`);
      requireDuration(state, value.value, `${path}.value`);
      return;
    case "world_property":
      requireOpenLabel(state, value.property, `${path}.property`);
      requireOperator(state, value.op, RELATIONAL_OPERATOR_SET, `${path}.op`);
      requirePresent(state, value.value, `${path}.value`);
      return;
    case "obligation_state":
      requireStoryRef(state, value.obligation_id, "obligation", idsFor(state.refs.obligations, state.record), `${path}.obligation_id`);
      requireEnum(state, value.property, OBLIGATION_STATE_PROPERTY_SET, `${path}.property`);
      requireOperator(state, value.op, RELATIONAL_OPERATOR_SET, `${path}.op`);
      validateObligationStateValue(state, value.property, value.value, `${path}.value`);
      return;
    case "location_kind":
      requireLocationRef(state, value.location, `${path}.location`);
      requireOperator(state, value.op, EQUALITY_OR_SET_OPERATOR_SET, `${path}.op`);
      validateOpenValueOrList(state, value.value, value.op, `${path}.value`);
      return;
    case "location_id":
      requireOperator(state, value.op, EQUALITY_OPERATOR_SET, `${path}.op`);
      requireWorldEntityRef(state, value.value, `${path}.value`);
      return;
    case "location_class":
      requireLocationRef(state, value.location, `${path}.location`);
      requireOperator(state, value.op, EQUALITY_OR_SET_OPERATOR_SET, `${path}.op`);
      validateOpenValueOrList(state, value.value, value.op, `${path}.value`);
      return;
  }
}

function validateNestedPredicates(state: ValidationState, value: unknown, path: string, depth: number): void {
  if (!Array.isArray(value)) {
    addFailure(state, "predicate.expected_list", `${path} must be a list`, path);
    return;
  }
  value.forEach((entry, index) => validatePredicate(state, entry, `${path}[${index}]`, depth + 1));
}

function validateScalarOrListPredicateValue(state: ValidationState, value: Record<string, unknown>, path: string): void {
  const allowedOps = new Set([...EQUALITY_OPERATOR_SET, ...SET_OPERATOR_SET]);
  requireOperator(state, value.op, allowedOps, `${path}.op`);
  validateOpenValueOrList(state, value.value, value.op, `${path}.value`);
}

function validateOpenValueOrList(state: ValidationState, value: unknown, op: unknown, path: string): void {
  if (op === "in") {
    if (!Array.isArray(value) || value.length === 0) {
      addFailure(state, "predicate.expected_list", `${path} must be a non-empty list when op is in`, path);
      return;
    }
    value.forEach((item, index) => requireOpenLabel(state, item, `${path}[${index}]`));
    return;
  }
  requireOpenLabel(state, value, path);
}

function validateObligationMatcher(state: ValidationState, value: unknown, path: string): void {
  if (!isRecord(value)) {
    addFailure(state, "predicate.expected_object", `${path} must be an obligation matcher object`, path);
    return;
  }
  if ("id" in value) {
    requireStoryRef(state, value.id, "obligation", idsFor(state.refs.obligations, state.record), `${path}.id`);
  }
  if ("type" in value) {
    requireOpenLabel(state, value.type, `${path}.type`);
  }
  if ("owner" in value && value.owner !== null) {
    requireActorRef(state, value.owner, `${path}.owner`);
  }
  if ("subjects" in value) {
    if (!Array.isArray(value.subjects)) {
      addFailure(state, "predicate.expected_list", `${path}.subjects must be a list`, `${path}.subjects`);
    } else {
      value.subjects.forEach((subject, index) => requireActorRef(state, subject, `${path}.subjects[${index}]`));
    }
  }
  if ("salience_min" in value) {
    requireIntegerInRange(state, value.salience_min, 0, 10, `${path}.salience_min`);
  }
  if ("urgency_min" in value) {
    requireIntegerInRange(state, value.urgency_min, 0, 10, `${path}.urgency_min`);
  }
  if ("status" in value) {
    requireEnum(state, value.status, OBLIGATION_STATUS_SET, `${path}.status`);
  }
  if ("payoff_mode_filter" in value) {
    if (!Array.isArray(value.payoff_mode_filter) || value.payoff_mode_filter.length === 0) {
      addFailure(state, "predicate.expected_list", `${path}.payoff_mode_filter must be a non-empty list`, `${path}.payoff_mode_filter`);
    } else {
      value.payoff_mode_filter.forEach((mode, index) => requireOpenLabel(state, mode, `${path}.payoff_mode_filter[${index}]`));
    }
  }
}

function validatePair(state: ValidationState, value: unknown, path: string): void {
  if (!Array.isArray(value) || value.length !== 2) {
    addFailure(state, "predicate.invalid_pair", `${path} must be a two-item pair`, path);
    return;
  }
  requireActorRef(state, value[0], `${path}[0]`);
  requireActorRef(state, value[1], `${path}[1]`);
}

function validateObligationStateValue(state: ValidationState, property: unknown, value: unknown, path: string): void {
  if (property === "status") {
    requireEnum(state, value, OBLIGATION_STATUS_SET, path);
  } else if (property === "salience" || property === "urgency") {
    requireNumber(state, value, path);
  } else {
    requirePresent(state, value, path);
  }
}

function requireActorRef(state: ValidationState, value: unknown, path: string): void {
  if (typeof value === "string" && ROLE_REF.test(value)) {
    return;
  }
  requireStoryRef(state, value, "entity", idsFor(state.refs.entities, state.record), path);
}

function requireLocationRef(state: ValidationState, value: unknown, path: string): void {
  if (typeof value === "string" && ROLE_REF.test(value)) {
    return;
  }
  requireStoryRef(state, value, "location", idsFor(state.refs.locations, state.record), path);
}

function requireStoryRef(
  state: ValidationState,
  value: unknown,
  kind: keyof typeof STORY_ID_PATTERNS,
  knownIds: Set<string>,
  path: string
): void {
  if (typeof value !== "string" || !STORY_ID_PATTERNS[kind].test(value)) {
    addFailure(state, "predicate.invalid_reference", `${path} must be a ${kind} record id`, path);
    return;
  }
  if (!knownIds.has(value)) {
    addFailure(state, "predicate.unresolved_reference", `${path} references missing ${value}`, path);
  }
}

function requireOpenLabel(state: ValidationState, value: unknown, path: string): void {
  if (typeof value !== "string" || !OPEN_LABEL.test(value)) {
    addFailure(state, "predicate.invalid_open_value", `${path} must be a typed lower-case story/domain label`, path);
  }
}

function requireWorldEntityRef(state: ValidationState, value: unknown, path: string): void {
  if (typeof value !== "string" || !WORLD_ENTITY_REF.test(value)) {
    addFailure(state, "predicate.invalid_reference", `${path} must be entity:<world-entity-slug>`, path);
  }
}

function requireDuration(state: ValidationState, value: unknown, path: string): void {
  if (typeof value !== "string" || !DURATION.test(value)) {
    addFailure(state, "predicate.invalid_duration", `${path} must be hours:<n>, days:<n>, or weeks:<n>`, path);
  }
}

function requireEnum(state: ValidationState, value: unknown, allowed: ReadonlySet<string>, path: string): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    addFailure(state, "predicate.invalid_enum", `${path} must be one of ${[...allowed].join(", ")}`, path);
  }
}

function requireOperator(state: ValidationState, value: unknown, allowed: ReadonlySet<string>, path: string): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    addFailure(state, "predicate.invalid_operator", `${path} has unsupported operator`, path);
  }
}

function requireNumber(state: ValidationState, value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    addFailure(state, "predicate.invalid_number", `${path} must be a finite number`, path);
  }
}

function requireNumberInRange(state: ValidationState, value: unknown, min: number, max: number, path: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    addFailure(state, "predicate.invalid_number", `${path} must be a number from ${min} to ${max}`, path);
  }
}

function requireIntegerInRange(state: ValidationState, value: unknown, min: number, max: number, path: string): void {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    addFailure(state, "predicate.invalid_integer", `${path} must be an integer from ${min} to ${max}`, path);
  }
}

function requirePresent(state: ValidationState, value: unknown, path: string): void {
  if (value === undefined || value === null) {
    addFailure(state, "predicate.missing_field", `${path} is required`, path);
  }
}

function addFailure(state: ValidationState, code: string, message: string, path: string): void {
  state.verdicts.push({
    validator: VALIDATOR,
    severity: "fail",
    code,
    message: `${recordLabel(state.record)} ${message}`,
    location: locationFor(state.record),
    suggested_fix: `Rewrite ${path} so it matches the Predicate DSL structural grammar.`
  });
}

function recordLabel(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  const id = typeof parsed.id === "string" ? parsed.id : bareStoryId(record.node_id) ?? record.node_id;
  return `${id}:`;
}

function idsFor(idsByStory: Map<string, Set<string>>, record: IndexedRecord): Set<string> {
  return idsByStory.get(storyKeyFor(record)) ?? new Set<string>();
}

function storyKeyFor(record: IndexedRecord): string {
  if (record.story_slug) {
    return record.story_slug;
  }
  const [maybeStory] = record.node_id.split(":");
  return record.node_id.includes(":") && maybeStory ? maybeStory : "__world__";
}

function bareStoryId(nodeId: string): string | null {
  const parts = nodeId.split(":");
  return parts.length > 1 ? parts[parts.length - 1] ?? null : nodeId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
