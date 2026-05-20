import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor } from "../structural/utils.js";
import {
  ACTION_FAMILIES,
  AFFECT_KINDS,
  BEHAVIORAL_PRESSURES,
  BELIEF_MODES,
  CONFIDENCE_LEVELS,
  EMOTION_INTENSITIES,
  PRED_TYPES,
  RELATIONSHIP_AXES
} from "./_shared/predicate-dsl-grammar.js";

const VALIDATOR = "storylet_predicate_dsl_parsability";
const MAX_DEPTH = 10;

const PRED_TYPE_SET = new Set<string>(PRED_TYPES);
const RELATIONSHIP_AXIS_SET = new Set<string>(RELATIONSHIP_AXES);
const ACTION_FAMILY_SET = new Set<string>(ACTION_FAMILIES);
const AFFECT_KIND_SET = new Set<string>(AFFECT_KINDS);
const BEHAVIORAL_PRESSURE_SET = new Set<string>(BEHAVIORAL_PRESSURES);
const BELIEF_MODE_SET = new Set<string>(BELIEF_MODES);
const CONFIDENCE_LEVEL_SET = new Set<string>(CONFIDENCE_LEVELS);
const EMOTION_INTENSITY_SET = new Set<string>(EMOTION_INTENSITIES);
const ENTITY_STATUS_AXES = new Set(["life", "agency", "location"]);
const URGENCY_LEVELS = new Set(["low", "medium", "high"]);
const SALIENCE_LEVELS = new Set(["low", "medium", "high"]);
const CLOCK_KINDS = new Set(["danger", "racing", "mission", "faction", "exposure", "pursuit", "deadline"]);
const SECRET_KINDS = new Set(["identity", "motive", "location", "event_cause", "artifact_truth", "relationship", "institutional"]);
const STORY_QUESTION_KINDS = new Set(["setup", "dramatic_question", "promise"]);
const STORY_QUESTION_STATUSES = new Set(["open", "complicated", "answered", "paid_off", "abandoned", "inherited", "superseded"]);
export const STORY_ROLES = [
  "viewpoint",
  "player_proxy",
  "primary_actor",
  "opposing_actor",
  "allied_actor",
  "authority",
  "dependent",
  "witness",
  "information_source",
  "pressure_source",
  "social_bridge",
  "background"
] as const;
const STORY_ROLE_SET = new Set<string>(STORY_ROLES);
const TRUTH_RELATIONS = new Set(["true", "false", "partly_true", "unknown", "contested", "branch_counterfactual", "future_contingent"]);
const BELIEF_VISIBILITIES = new Set(["private", "shared", "factional", "public", "rumored", "concealed", "suppressed"]);
const RELATIONSHIP_COMPARATORS = new Set([">=", "<=", "==", "!="]);
const RECORD_AGE_COMPARATORS = new Set([">=", "<=", "==", "!="]);

const ALIAS = /^[a-z][a-z0-9_-]*$/;
const ROLE_REF = /^role:[a-z][a-z0-9_-]*$/;
const OPEN_LABEL = /^[a-z][a-z0-9_:-]*$/;
// FOUNDATIONS-002 mandates unpadded natural-integer suffixes (e.g. STENT-1, not STENT-0001).
// Pre-FOUNDATIONS-002 fixtures (padded form) remain accepted by \d+.
const STORY_ID_PATTERNS = {
  fact: /^SF-\d+$/,
  entity: /^STENT-\d+$/,
  belief: /^BEL-\d+$/,
  obligation: /^OBL-\d+$/,
  consequence: /^CNSQ-\d+$/,
  thread: /^THR-\d+$/,
  clock: /^CLK-\d+$/,
  secret: /^STSEC-\d+$/,
  question: /^STQ-\d+$/,
  relationship: /^SREL-\d+$/,
  location: /^STLOC-\d+$/,
  object: /^STOBJ-\d+$/,
  artifact: /^DA-\d+$/,
  intention: /^STINT-\d+$/,
  plan: /^STPLAN-\d+$/,
  emotion: /^STEMO-\d+$/
} as const;
const RECORD_ACTIVE_PATTERN = /^(?:STENT|STINT|SF|BEL|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|STSTAT|CLK|STSEC|STQ|STPLAN|STEMO)-\d+$/;
const DERIVED_FROM_PATTERN = /^(?:SE|STENT|STINT|SF|BEL|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|STSTAT)-\d+$/;
const BOUND_EFFECT_PATTERN = /^bound:([a-z][a-z0-9_-]*)$/;

type RefKind = keyof typeof STORY_ID_PATTERNS;

interface ReferenceSets {
  facts: Map<string, Set<string>>;
  entities: Map<string, Set<string>>;
  beliefs: Map<string, Set<string>>;
  obligations: Map<string, Set<string>>;
  consequences: Map<string, Set<string>>;
  threads: Map<string, Set<string>>;
  clocks: Map<string, Set<string>>;
  secrets: Map<string, Set<string>>;
  questions: Map<string, Set<string>>;
  relationships: Map<string, Set<string>>;
  locations: Map<string, Set<string>>;
  objects: Map<string, Set<string>>;
  artifacts: Map<string, Set<string>>;
  statuses: Map<string, Set<string>>;
  intentions: Map<string, Set<string>>;
  plans: Map<string, Set<string>>;
  emotions: Map<string, Set<string>>;
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
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some((patch) => patch.op === "create_slt_record")) ||
    (ctx.run_mode === "incremental" && ctx.touched_files.some((file) => /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d+\.yaml$|(?:^|\/)_source\/storylets\/SLT-\d+\.yaml$/.test(file))),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const storylets = await queryStoryScoped(ctx, "storylet_record");
    const refs = await loadReferenceSets(ctx);
    const verdicts: Verdict[] = [];

    for (const record of storylets) {
      const state: ValidationState = { record, refs, verdicts };
      const parsed = asPlainRecord(record.parsed);
      const preconditions = parsed.preconditions;
      if (preconditions === undefined || preconditions === null) {
        continue;
      }
      if (!isRecord(preconditions)) {
        addFailure(state, "predicate.expected_object", "preconditions must be an object with hard and optional soft lists", "preconditions");
        continue;
      }
      const boundAliases = new Set<string>();
      collectPredicateListAliases(preconditions.hard, boundAliases);
      collectPredicateListAliases(preconditions.soft, boundAliases);
      validatePredicateList(state, preconditions.hard, "preconditions.hard", boundAliases);
      validatePredicateList(state, preconditions.soft, "preconditions.soft", boundAliases);
      validateBoundEffectReferences(state, parsed, boundAliases);
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
        const key = storyKeyFor(record);
        let ids = idsByStory.get(key);
        if (!ids) {
          ids = new Set<string>();
          idsByStory.set(key, ids);
        }
        ids.add(authoredId);
      }
    }
    return idsByStory;
  };

  return {
    facts: await query("story_fact_record"),
    entities: await query("story_entity_record"),
    beliefs: await query("belief_record"),
    obligations: await query("obligation_record"),
    // VALENH-013: pre-apply in-plan creates are supplied by ctx.index's overlay.
    // Keep these keys aligned to the live index node types so overlay and on-disk reads match.
    consequences: await query("consequence_record"),
    threads: await query("thread_record"),
    clocks: await query("pressure_clock_record"),
    secrets: await query("story_secret_record"),
    questions: await query("story_question_record"),
    relationships: await query("relationship_record_story"),
    locations: await query("story_location_record"),
    objects: await query("story_object_record"),
    artifacts: await query("story_diegetic_artifact_record"),
    statuses: await query("story_status_record"),
    intentions: await query("intention_record"),
    plans: await query("story_plan_record"),
    emotions: await query("story_emotion_record")
  };
}

function queryStoryScoped(ctx: Context, record_type: string): Promise<IndexedRecord[]> {
  return ctx.index.query({
    world_slug: ctx.world_slug,
    record_type,
    ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
  });
}

function validatePredicateList(state: ValidationState, value: unknown, path: string, boundAliases: Set<string>): void {
  if (value === undefined || value === null) {
    if (path === "preconditions.hard") {
      addFailure(state, "predicate.expected_list", `${path} must be a list of predicate objects`, path);
    }
    return;
  }
  if (!Array.isArray(value)) {
    addFailure(state, "predicate.expected_list", `${path} must be a list of predicate objects`, path);
    return;
  }
  value.forEach((entry, index) => validatePredicate(state, entry, `${path}[${index}]`, 0, boundAliases));
}

function validatePredicate(state: ValidationState, value: unknown, path: string, depth: number, boundAliases: Set<string>): void {
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
    case "belief_record":
      requireActorRef(state, value.holder, `${path}.holder`);
      requireBeliefRecordRef(state, value.belief_id, idsFor(state.refs.beliefs, state.record), `${path}.belief_id`);
      if ("mode" in value) {
        requireEnum(state, value.mode, BELIEF_MODE_SET, `${path}.mode`);
      }
      if ("confidence_floor" in value) {
        requireEnum(state, value.confidence_floor, CONFIDENCE_LEVEL_SET, `${path}.confidence_floor`);
      }
      return;
    case "entity_status":
      requireActorRef(state, value.entity, `${path}.entity`);
      requireEnum(state, value.field, ENTITY_STATUS_AXES, `${path}.field`);
      requirePresent(state, value.value, `${path}.value`);
      return;
    case "relationship_axis":
      requireActorRef(state, value.from, `${path}.from`);
      requireActorRef(state, value.to, `${path}.to`);
      requireEnum(state, value.axis, RELATIONSHIP_AXIS_SET, `${path}.axis`);
      requirePresent(state, value.value, `${path}.value`);
      return;
    case "obligation_open":
      requireStoryRef(state, value.obligation, "obligation", idsFor(state.refs.obligations, state.record), `${path}.obligation`);
      return;
    case "consequence_pending":
      requireStoryRef(state, value.consequence, "consequence", idsFor(state.refs.consequences, state.record), `${path}.consequence`);
      return;
    case "thread_active":
      requireStoryRef(state, value.thread, "thread", idsFor(state.refs.threads, state.record), `${path}.thread`);
      return;
    case "clock_at_least":
      requireStoryRef(state, value.clock, "clock", idsFor(state.refs.clocks, state.record), `${path}.clock`);
      requireNonNegativeInteger(state, value.value, `${path}.value`);
      return;
    case "clock_below":
      requireStoryRef(state, value.clock, "clock", idsFor(state.refs.clocks, state.record), `${path}.clock`);
      requireNonNegativeInteger(state, value.value, `${path}.value`);
      return;
    case "clock_full":
      requireStoryRef(state, value.clock, "clock", idsFor(state.refs.clocks, state.record), `${path}.clock`);
      return;
    case "secret_unrevealed":
    case "secret_revealed":
    case "revelation_ready":
      requireStoryRef(state, value.secret, "secret", idsFor(state.refs.secrets, state.record), `${path}.secret`);
      return;
    case "story_question_open":
      requireStoryRef(state, value.question, "question", idsFor(state.refs.questions, state.record), `${path}.question`);
      return;
    case "story_question_status":
      requireStoryRef(state, value.question, "question", idsFor(state.refs.questions, state.record), `${path}.question`);
      requireEnum(state, value.status, STORY_QUESTION_STATUSES, `${path}.status`);
      return;
    case "promise_due":
      requireStoryRef(state, value.question, "question", idsFor(state.refs.questions, state.record), `${path}.question`);
      requireIntegerPages(state, value.age_pages, `${path}.age_pages`);
      return;
    case "plan_active":
      requireActorRef(state, value.holder, `${path}.holder`);
      requireOptionalStoryRef(state, value.plan, "plan", idsFor(state.refs.plans, state.record), `${path}.plan`);
      return;
    case "plan_blocked":
      requireActorRef(state, value.holder, `${path}.holder`);
      return;
    case "any_plan_active":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireOptionalRole(state, value.holder_role, `${path}.holder_role`);
      return;
    case "emotion_active":
      requireActorRef(state, value.holder, `${path}.holder`);
      requireOptionalEnum(state, value.kind, AFFECT_KIND_SET, `${path}.kind`);
      requireOptionalEnum(state, value.min_intensity, EMOTION_INTENSITY_SET, `${path}.min_intensity`);
      return;
    case "any_emotion_active":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireOptionalRole(state, value.holder_role, `${path}.holder_role`);
      requireOptionalEnum(state, value.kind, AFFECT_KIND_SET, `${path}.kind`);
      requireOptionalEnum(state, value.min_intensity, EMOTION_INTENSITY_SET, `${path}.min_intensity`);
      return;
    case "emotion_pressure":
      requireActorRef(state, value.holder, `${path}.holder`);
      requireEnum(state, value.pressure, BEHAVIORAL_PRESSURE_SET, `${path}.pressure`);
      return;
    case "any_obligation_open":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireOptionalOpenLabel(state, value.kind, `${path}.kind`);
      requireOptionalEnum(state, value.urgency, URGENCY_LEVELS, `${path}.urgency`);
      requireOptionalRole(state, value.owed_by_role, `${path}.owed_by_role`);
      requireOptionalRole(state, value.owed_to_role, `${path}.owed_to_role`);
      return;
    case "any_consequence_pending":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireOptionalOpenLabel(state, value.kind, `${path}.kind`);
      requireOptionalEnum(state, value.urgency, URGENCY_LEVELS, `${path}.urgency`);
      requireOptionalPattern(state, value.derived_from, DERIVED_FROM_PATTERN, `${path}.derived_from`, "a story event or story record id");
      return;
    case "any_thread_active":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireOptionalOpenLabel(state, value.tag, `${path}.tag`);
      requireOptionalEnum(state, value.urgency, URGENCY_LEVELS, `${path}.urgency`);
      return;
    case "any_clock_active":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireOptionalEnum(state, value.kind, CLOCK_KINDS, `${path}.kind`);
      requireOptionalEnum(state, value.salience, SALIENCE_LEVELS, `${path}.salience`);
      return;
    case "any_secret_unrevealed":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireOptionalEnum(state, value.salience, SALIENCE_LEVELS, `${path}.salience`);
      requireOptionalEnum(state, value.kind, SECRET_KINDS, `${path}.kind`);
      return;
    case "any_story_question_open":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireOptionalEnum(state, value.salience, SALIENCE_LEVELS, `${path}.salience`);
      requireOptionalEnum(state, value.setup_kind, STORY_QUESTION_KINDS, `${path}.setup_kind`);
      return;
    case "any_relationship_axis":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireEnum(state, value.axis, RELATIONSHIP_AXIS_SET, `${path}.axis`);
      requireEnum(state, value.comparator, RELATIONSHIP_COMPARATORS, `${path}.comparator`);
      requirePresent(state, value.value, `${path}.value`);
      requireOptionalRole(state, value.participant_role, `${path}.participant_role`);
      return;
    case "any_belief":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireOptionalRole(state, value.holder_role, `${path}.holder_role`);
      requireOptionalEnum(state, value.mode, BELIEF_MODE_SET, `${path}.mode`);
      requireOptionalEnum(state, value.truth_relation, TRUTH_RELATIONS, `${path}.truth_relation`);
      requireOptionalEnum(state, value.visibility, BELIEF_VISIBILITIES, `${path}.visibility`);
      return;
    case "any_intention":
      requireExistentialScope(state, value.pred, path);
      requireAlias(state, value.alias, `${path}.alias`, boundAliases);
      requireOptionalRole(state, value.holder_role, `${path}.holder_role`);
      requireOptionalEnum(state, value.urgency, URGENCY_LEVELS, `${path}.urgency`);
      return;
    case "location":
      requireActorRef(state, value.entity, `${path}.entity`);
      requireLocationRef(state, value.location, `${path}.location`);
      return;
    case "has_affordance":
      requireEnum(state, value.action_family, ACTION_FAMILY_SET, `${path}.action_family`);
      return;
    case "record_active":
      requireActiveRecordRef(state, value.record, `${path}.record`);
      return;
    case "record_age":
      requireActiveRecordOrBoundAlias(state, value.record, boundAliases, `${path}.record`);
      requireEnum(state, value.comparator, RECORD_AGE_COMPARATORS, `${path}.comparator`);
      requireIntegerPages(state, value.pages, `${path}.pages`);
      return;
    case "intention_active":
      requireStoryRef(state, value.intention, "intention", idsFor(state.refs.intentions, state.record), `${path}.intention`);
      return;
    case "object_accessible":
      requireActorRef(state, value.entity, `${path}.entity`);
      requireStoryRef(state, value.object, "object", idsFor(state.refs.objects, state.record), `${path}.object`);
      return;
    case "artifact_accessible":
      requireActorRef(state, value.entity, `${path}.entity`);
      requireStoryRef(state, value.artifact, "artifact", idsFor(state.refs.artifacts, state.record), `${path}.artifact`);
      return;
    case "affordance_available_to":
      requireActorRef(state, value.entity, `${path}.entity`);
      requireEnum(state, value.action_family, ACTION_FAMILY_SET, `${path}.action_family`);
      return;
    case "not":
      validatePredicate(state, value.predicate, `${path}.predicate`, depth + 1, boundAliases);
      return;
    case "all":
    case "any":
      validateNestedPredicates(state, value.predicates, `${path}.predicates`, depth, boundAliases);
      return;
  }
}

function validateNestedPredicates(state: ValidationState, value: unknown, path: string, depth: number, boundAliases: Set<string>): void {
  if (!Array.isArray(value)) {
    addFailure(state, "predicate.expected_list", `${path} must be a list`, path);
    return;
  }
  value.forEach((entry, index) => validatePredicate(state, entry, `${path}[${index}]`, depth + 1, boundAliases));
}

function collectPredicateListAliases(value: unknown, boundAliases: Set<string>): void {
  if (!Array.isArray(value)) {
    return;
  }
  for (const entry of value) {
    collectPredicateAliases(entry, boundAliases, 0);
  }
}

function collectPredicateAliases(value: unknown, boundAliases: Set<string>, depth: number): void {
  if (depth > MAX_DEPTH || !isRecord(value) || typeof value.pred !== "string") {
    return;
  }

  if (value.pred.startsWith("any_") && typeof value.alias === "string" && ALIAS.test(value.alias)) {
    boundAliases.add(value.alias);
  }

  if (value.pred === "not") {
    collectPredicateAliases(value.predicate, boundAliases, depth + 1);
    return;
  }
  if ((value.pred === "all" || value.pred === "any") && Array.isArray(value.predicates)) {
    for (const entry of value.predicates) {
      collectPredicateAliases(entry, boundAliases, depth + 1);
    }
  }
}

function validateBoundEffectReferences(state: ValidationState, parsed: Record<string, unknown>, boundAliases: Set<string>): void {
  const effects = asPlainRecord(parsed.effects);
  for (const field of ["create", "supersede", "close"] as const) {
    validateBoundReferencesInList(state, effects[field], `effects.${field}`, boundAliases);
  }

  const exitOptions = parsed.exit_options;
  if (Array.isArray(exitOptions)) {
    exitOptions.forEach((option, index) => {
      const record = asPlainRecord(option);
      validateBoundReferencesInList(state, record.likely_effects, `exit_options[${index}].likely_effects`, boundAliases);
    });
  }
}

function validateBoundReferencesInList(state: ValidationState, value: unknown, path: string, boundAliases: Set<string>): void {
  if (!Array.isArray(value)) {
    return;
  }
  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      return;
    }
    const match = BOUND_EFFECT_PATTERN.exec(entry);
    if (match && !boundAliases.has(match[1]!)) {
      addFailure(state, "predicate.unbound_alias", `${path}[${index}] references ${entry} with no matching binding precondition`, `${path}[${index}]`);
    }
  });
}

function requireExistentialScope(state: ValidationState, pred: unknown, path: string): void {
  const parsed = asPlainRecord(state.record.parsed);
  const scope = asPlainRecord(parsed.scope);
  const visibility = typeof scope.visibility === "string" ? scope.visibility : "";
  if (visibility !== "global_author_pool" && visibility !== "branch_prefix_scoped") {
    addFailure(state, "predicate.invalid_scope", `${path} uses ${String(pred)} outside global_author_pool or branch_prefix_scoped scope`, `${path}.pred`);
  }
}

function requireAlias(state: ValidationState, value: unknown, path: string, boundAliases: Set<string>): void {
  if (typeof value !== "string" || !ALIAS.test(value)) {
    addFailure(state, "predicate.invalid_alias", `${path} must be a lower-case alias`, path);
    return;
  }
  boundAliases.add(value);
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
  kind: RefKind,
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

function requireBeliefRecordRef(state: ValidationState, value: unknown, knownIds: Set<string>, path: string): void {
  if (typeof value !== "string" || !STORY_ID_PATTERNS.belief.test(value)) {
    addFailure(state, "belief_record_argument_invalid", `${path} must be a BEL-<integer> record id`, path);
    return;
  }
  if (!knownIds.has(value)) {
    addFailure(state, "predicate.unresolved_reference", `${path} references missing ${value}`, path);
  }
}

function requireActiveRecordRef(state: ValidationState, value: unknown, path: string): void {
  if (typeof value !== "string" || !RECORD_ACTIVE_PATTERN.test(value)) {
    addFailure(state, "predicate.invalid_reference", `${path} must be an active story record id`, path);
    return;
  }
  const ids = activeRecordIds(state);
  if (!ids.has(value)) {
    addFailure(state, "predicate.unresolved_reference", `${path} references missing ${value}`, path);
  }
}

function requireActiveRecordOrBoundAlias(state: ValidationState, value: unknown, boundAliases: ReadonlySet<string>, path: string): void {
  if (typeof value === "string") {
    const match = BOUND_EFFECT_PATTERN.exec(value);
    if (match) {
      if (!boundAliases.has(match[1]!)) {
        addFailure(state, "predicate.unbound_alias", `${path} references ${value} with no matching binding precondition`, path);
      }
      return;
    }
  }
  requireActiveRecordRef(state, value, path);
}

function activeRecordIds(state: ValidationState): Set<string> {
  return new Set([
    ...idsFor(state.refs.entities, state.record),
    ...idsFor(state.refs.intentions, state.record),
    ...idsFor(state.refs.facts, state.record),
    ...idsFor(state.refs.beliefs, state.record),
    ...idsFor(state.refs.obligations, state.record),
    ...idsFor(state.refs.consequences, state.record),
    ...idsFor(state.refs.threads, state.record),
    ...idsFor(state.refs.clocks, state.record),
    ...idsFor(state.refs.secrets, state.record),
    ...idsFor(state.refs.questions, state.record),
    ...idsFor(state.refs.relationships, state.record),
    ...idsFor(state.refs.locations, state.record),
    ...idsFor(state.refs.objects, state.record),
    ...idsFor(state.refs.artifacts, state.record),
    ...idsFor(state.refs.statuses, state.record),
    ...idsFor(state.refs.plans, state.record),
    ...idsFor(state.refs.emotions, state.record)
  ]);
}

function requireOptionalStoryRef(
  state: ValidationState,
  value: unknown,
  kind: RefKind,
  knownIds: Set<string>,
  path: string
): void {
  if (value === undefined || value === null) {
    return;
  }
  requireStoryRef(state, value, kind, knownIds, path);
}

function requireOpenLabel(state: ValidationState, value: unknown, path: string): void {
  if (typeof value !== "string" || !OPEN_LABEL.test(value)) {
    addFailure(state, "predicate.invalid_open_value", `${path} must be a typed lower-case story/domain label`, path);
  }
}

function requireOptionalOpenLabel(state: ValidationState, value: unknown, path: string): void {
  if (value === undefined || value === null) {
    return;
  }
  requireOpenLabel(state, value, path);
}

function requireEnum(state: ValidationState, value: unknown, allowed: ReadonlySet<string>, path: string): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    addFailure(state, "predicate.invalid_enum", `${path} must be one of ${[...allowed].join(", ")}`, path);
  }
}

function requireOptionalEnum(state: ValidationState, value: unknown, allowed: ReadonlySet<string>, path: string): void {
  if (value === undefined || value === null) {
    return;
  }
  requireEnum(state, value, allowed, path);
}

function requireOptionalRole(state: ValidationState, value: unknown, path: string): void {
  if (value === undefined || value === null) {
    return;
  }
  requireEnum(state, value, STORY_ROLE_SET, path);
}

function requireOptionalPattern(state: ValidationState, value: unknown, pattern: RegExp, path: string, expected: string): void {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== "string" || !pattern.test(value)) {
    addFailure(state, "predicate.invalid_reference", `${path} must be ${expected}`, path);
  }
}

function requirePresent(state: ValidationState, value: unknown, path: string): void {
  if (value === undefined || value === null) {
    addFailure(state, "predicate.missing_field", `${path} is required`, path);
  }
}

function requireIntegerPages(state: ValidationState, value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    addFailure(state, "predicate.invalid_integer", `${path} must be a non-negative integer page count`, path);
  }
}

function requireNonNegativeInteger(state: ValidationState, value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    addFailure(state, "predicate.invalid_integer", `${path} must be a non-negative integer`, path);
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
