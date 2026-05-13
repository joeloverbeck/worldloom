import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor } from "../structural/utils.js";
import {
  ACTION_FAMILIES,
  BELIEF_MODES,
  CONFIDENCE_LEVELS,
  PRED_TYPES,
  RELATIONSHIP_AXES
} from "./_shared/predicate-dsl-grammar.js";

const VALIDATOR = "storylet_predicate_dsl_parsability";
const MAX_DEPTH = 10;

const PRED_TYPE_SET = new Set<string>(PRED_TYPES);
const RELATIONSHIP_AXIS_SET = new Set<string>(RELATIONSHIP_AXES);
const ACTION_FAMILY_SET = new Set<string>(ACTION_FAMILIES);
const BELIEF_MODE_SET = new Set<string>(BELIEF_MODES);
const CONFIDENCE_LEVEL_SET = new Set<string>(CONFIDENCE_LEVELS);
const ENTITY_STATUS_AXES = new Set(["life", "agency", "location"]);

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
  relationship: /^SREL-\d+$/,
  location: /^STLOC-\d+$/,
  object: /^STOBJ-\d+$/,
  artifact: /^DA-\d+$/,
  intention: /^STINT-\d+$/
} as const;
const RECORD_ACTIVE_PATTERN = /^(?:STENT|STINT|SF|BEL|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA)-\d+$/;

type RefKind = keyof typeof STORY_ID_PATTERNS;

interface ReferenceSets {
  facts: Map<string, Set<string>>;
  entities: Map<string, Set<string>>;
  beliefs: Map<string, Set<string>>;
  obligations: Map<string, Set<string>>;
  consequences: Map<string, Set<string>>;
  threads: Map<string, Set<string>>;
  relationships: Map<string, Set<string>>;
  locations: Map<string, Set<string>>;
  objects: Map<string, Set<string>>;
  artifacts: Map<string, Set<string>>;
  intentions: Map<string, Set<string>>;
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
      validatePredicateList(state, preconditions.hard, "preconditions.hard");
      validatePredicateList(state, preconditions.soft, "preconditions.soft");
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
    relationships: await query("relationship_record_story"),
    locations: await query("story_location_record"),
    objects: await query("story_object_record"),
    artifacts: await query("story_diegetic_artifact_record"),
    intentions: await query("intention_record")
  };
}

function queryStoryScoped(ctx: Context, record_type: string): Promise<IndexedRecord[]> {
  return ctx.index.query({
    world_slug: ctx.world_slug,
    record_type,
    ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
  });
}

function validatePredicateList(state: ValidationState, value: unknown, path: string): void {
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
    case "belief":
      requireActorRef(state, value.holder, `${path}.holder`);
      requireStoryRef(state, value.claim, "belief", idsFor(state.refs.beliefs, state.record), `${path}.claim`);
      if ("mode" in value) {
        requireEnum(state, value.mode, BELIEF_MODE_SET, `${path}.mode`);
      }
      if ("confidence_floor" in value) {
        requireEnum(state, value.confidence_floor, CONFIDENCE_LEVEL_SET, `${path}.confidence_floor`);
      }
      return;
    case "entity_status":
      requireActorRef(state, value.entity, `${path}.entity`);
      requireEnum(state, value.axis, ENTITY_STATUS_AXES, `${path}.axis`);
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
      validatePredicate(state, value.predicate, `${path}.predicate`, depth + 1);
      return;
    case "all":
    case "any":
      validateNestedPredicates(state, value.predicates, `${path}.predicates`, depth);
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

function activeRecordIds(state: ValidationState): Set<string> {
  return new Set([
    ...idsFor(state.refs.entities, state.record),
    ...idsFor(state.refs.intentions, state.record),
    ...idsFor(state.refs.facts, state.record),
    ...idsFor(state.refs.beliefs, state.record),
    ...idsFor(state.refs.obligations, state.record),
    ...idsFor(state.refs.consequences, state.record),
    ...idsFor(state.refs.threads, state.record),
    ...idsFor(state.refs.relationships, state.record),
    ...idsFor(state.refs.locations, state.record),
    ...idsFor(state.refs.objects, state.record),
    ...idsFor(state.refs.artifacts, state.record)
  ]);
}

function requireOpenLabel(state: ValidationState, value: unknown, path: string): void {
  if (typeof value !== "string" || !OPEN_LABEL.test(value)) {
    addFailure(state, "predicate.invalid_open_value", `${path} must be a typed lower-case story/domain label`, path);
  }
}

function requireEnum(state: ValidationState, value: unknown, allowed: ReadonlySet<string>, path: string): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    addFailure(state, "predicate.invalid_enum", `${path} must be one of ${[...allowed].join(", ")}`, path);
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
