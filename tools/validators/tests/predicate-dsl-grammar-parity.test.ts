import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Ajv2020Module from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";

import { PRED_TYPES, PREDICATE_ARG_SCHEMAS } from "../src/rules/_shared/predicate-dsl-grammar.js";
import {
  STORY_ROLES,
  storyletPredicateDslParsability
} from "../src/rules/rule_storylet_predicate_dsl_parsability.js";
import { context, record } from "./structural/helpers.js";

type Ajv2020Instance = {
  compile(schema: unknown): ValidateFunction;
  errorsText(errors?: ErrorObject[] | null): string;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;
const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;

type PredicateSchema = {
  $id: string;
  oneOf: Array<{
    title: string;
    required: string[];
    properties: Record<string, { enum?: string[] } | unknown>;
  }>;
};

type StoryletSchema = {
  $defs: {
    scopeRestrictedPrefilterPredicate: {
      properties: {
        pred: {
          enum: string[];
        };
      };
    };
  };
};

const EXISTENTIAL_ROLE_FILTER_FIELDS = [
  ["any_plan_active", "holder_role"],
  ["any_emotion_active", "holder_role"],
  ["any_obligation_open", "owed_by_role"],
  ["any_obligation_open", "owed_to_role"],
  ["any_relationship_axis", "participant_role"],
  ["any_belief", "holder_role"],
  ["any_intention", "holder_role"]
] as const;

const SCOPE_RESTRICTED_PREFILTER_PREDICATES = [
  "any_plan_active",
  "any_emotion_active",
  "any_obligation_open",
  "any_consequence_pending",
  "any_thread_active",
  "any_clock_active",
  "any_secret_unrevealed",
  "any_story_question_open",
  "any_relationship_axis",
  "any_belief",
  "any_intention",
  "has_affordance"
] as const;

function readPredicateSchema(): PredicateSchema {
  return JSON.parse(
    readFileSync(path.resolve(process.cwd(), "src/schemas/predicate-dsl-grammar.schema.json"), "utf8")
  ) as PredicateSchema;
}

function readStoryletSchema(): StoryletSchema {
  return JSON.parse(
    readFileSync(path.resolve(process.cwd(), "src/schemas/story-storylet.schema.json"), "utf8")
  ) as StoryletSchema;
}

function sampleFor(pred: (typeof PRED_TYPES)[number]): Record<string, unknown> {
  switch (pred) {
    case "fact_true":
      return { pred, fact: "SF-1" };
    case "belief_record":
      return { pred, holder: "STENT-1", belief_id: "BEL-1" };
    case "entity_status":
      return { pred, entity: "STENT-1", field: "life", value: "alive" };
    case "relationship_axis":
      return { pred, from: "STENT-1", to: "STENT-2", axis: "trust", value: 1 };
    case "obligation_open":
      return { pred, obligation: "OBL-1" };
    case "consequence_pending":
      return { pred, consequence: "CNSQ-1" };
    case "thread_active":
      return { pred, thread: "THR-1" };
    case "clock_at_least":
    case "clock_below":
      return { pred, clock: "CLK-1", value: 2 };
    case "clock_full":
      return { pred, clock: "CLK-1" };
    case "secret_unrevealed":
    case "secret_revealed":
    case "revelation_ready":
      return { pred, secret: "STSEC-1" };
    case "story_question_open":
      return { pred, question: "STQ-1" };
    case "story_question_status":
      return { pred, question: "STQ-1", status: "open" };
    case "promise_due":
      return { pred, question: "STQ-1", age_pages: 3 };
    case "plan_active":
      return { pred, holder: "STENT-1", plan: "STPLAN-1" };
    case "plan_blocked":
      return { pred, holder: "STENT-1" };
    case "any_plan_active":
      return { pred, alias: "matched_record" };
    case "emotion_active":
      return { pred, holder: "STENT-1", kind: "fear", min_intensity: "medium" };
    case "any_emotion_active":
      return { pred, alias: "matched_record", kind: "relief", min_intensity: "low" };
    case "emotion_pressure":
      return { pred, holder: "STENT-1", pressure: "conceal" };
    case "any_obligation_open":
    case "any_consequence_pending":
    case "any_thread_active":
    case "any_clock_active":
    case "any_secret_unrevealed":
    case "any_story_question_open":
    case "any_belief":
    case "any_intention":
      return { pred, alias: "matched_record" };
    case "any_relationship_axis":
      return { pred, alias: "matched_record", axis: "trust", comparator: ">=", value: 1 };
    case "location":
      return { pred, entity: "STENT-1", location: "STLOC-1" };
    case "has_affordance":
      return { pred, action_family: "move" };
    case "record_active":
      return { pred, record: "SF-1" };
    case "record_age":
      return { pred, record: "SF-1", comparator: ">=", pages: 1 };
    case "intention_active":
      return { pred, intention: "STINT-1" };
    case "object_accessible":
      return { pred, entity: "STENT-1", object: "STOBJ-1" };
    case "artifact_accessible":
      return { pred, entity: "STENT-1", artifact: "DA-1" };
    case "affordance_available_to":
      return { pred, entity: "STENT-1", action_family: "move" };
    case "not":
      return { pred, predicate: { pred: "record_active", record: "SF-1" } };
    case "all":
    case "any":
      return { pred, predicates: [{ pred: "record_active", record: "SF-1" }] };
  }
}

function storyletWithPredicate(
  pred: (typeof SCOPE_RESTRICTED_PREFILTER_PREDICATES)[number],
  visibility: "global_author_pool" | "branch_prefix_scoped" | "branch_scoped",
  list: "hard" | "soft"
): Record<string, unknown> {
  const branchScoped = visibility === "branch_scoped";
  const branchPrefixScoped = visibility === "branch_prefix_scoped";
  return {
    id: "SLT-1",
    story_id: "STORY-1",
    scope: {
      visibility,
      branch_id: branchScoped || branchPrefixScoped ? "BR-1" : null,
      ...(branchPrefixScoped ? { visible_branch_path_prefix: ["PG-1"] } : {})
    },
    title: "Predicate scope parity fixture",
    move_family: "investigation",
    preconditions: {
      hard: list === "hard" ? [sampleFor(pred)] : [{ pred: "record_active", record: "STENT-1" }],
      ...(list === "soft" ? { soft: [sampleFor(pred)] } : { soft: [] })
    },
    beats: [
      {
        beat_id: "setup",
        function: "setup",
        instruction: "Hold the fixture shape stable."
      }
    ],
    exit_options: [
      {
        action_family: "communicate",
        surface_hint: "Continue."
      }
    ],
    saliency: {
      urgency: "medium",
      cooldown_pages: 0
    },
    mystery_policy: {
      allowed_authority: "none"
    },
    provenance: {
      origin: "manual_authoring"
    }
  };
}

async function recordAgeRuntimeCodes(recordValue: string): Promise<string[]> {
  const verdicts = await storyletPredicateDslParsability.run(null, context([
    record("story_fact_record", "marla:SF-1", "stories/marla/_source/facts/SF-1.yaml", { id: "SF-1" }),
    record("pressure_clock_record", "marla:CLK-1", "stories/marla/_source/clocks/CLK-1.yaml", { id: "CLK-1" }),
    record("storylet_record", "marla:SLT-1", "stories/marla/_source/storylets/SLT-1.yaml", {
      id: "SLT-1",
      scope: { visibility: "global_author_pool", branch_id: null },
      preconditions: {
        hard: [
          { pred: "any_clock_active", alias: "matured_clock" },
          { pred: "record_age", record: recordValue, comparator: ">=", pages: 2 }
        ],
        soft: []
      },
      grounding: {
        compatible_turn_drivers: ["clock_fire"],
        reason_to_exist: "Exercises clock-age predicate parsing in parity tests."
      }
    })
  ]));

  return verdicts.map((verdict) => verdict.code);
}

test("predicate DSL schema mirrors predicate names and required argument table", () => {
  const schema = readPredicateSchema();
  const schemasByTitle = new Map(schema.oneOf.map((entry) => [entry.title, entry]));

  assert.equal(schema.$id, "https://worldloom.local/schemas/predicate-dsl-grammar.schema.json");
  assert.deepEqual(schema.oneOf.map((entry) => entry.title), [...PRED_TYPES]);

  for (const pred of PRED_TYPES) {
    const entry = schemasByTitle.get(pred);
    assert.ok(entry, `missing schema entry for ${pred}`);
    assert.deepEqual(entry.required, ["pred", ...PREDICATE_ARG_SCHEMAS[pred].required]);
    assert.deepEqual(entry.properties.pred, { const: pred });
  }
});

test("predicate DSL schema accepts valid samples and rejects missing required args", () => {
  const schema = readPredicateSchema();
  const ajv = new Ajv2020({ strict: true });
  const validate = ajv.compile(schema);

  for (const pred of PRED_TYPES) {
    const validSample = sampleFor(pred);
    assert.equal(validate(validSample), true, `${pred} valid sample should pass: ${ajv.errorsText(validate.errors)}`);

    const requiredArg = PREDICATE_ARG_SCHEMAS[pred].required[0];
    const invalidSample = { ...validSample };
    delete invalidSample[requiredArg];
    assert.equal(validate(invalidSample), false, `${pred} missing ${requiredArg} should fail`);
  }
});

test("predicate DSL schema exposes runtime-derived ID patterns for representative predicates", () => {
  const schema = readPredicateSchema();
  const ajv = new Ajv2020({ strict: true });
  const validate = ajv.compile(schema);

  assert.equal(validate({ pred: "obligation_open", obligation: "CNSQ-1" }), false);
  assert.equal(validate({ pred: "consequence_pending", consequence: "OBL-1" }), false);
  assert.equal(validate({ pred: "location", entity: "STENT-1", location: "STENT-2" }), false);
  assert.equal(validate({ pred: "intention_active", intention: "STENT-1" }), false);
  assert.equal(validate({ pred: "plan_active", holder: "STENT-1", plan: "STINT-1" }), false);
  assert.equal(validate({ pred: "emotion_active", holder: "STENT-1", kind: "surprise" }), false);
  assert.equal(validate({ pred: "emotion_pressure", holder: "STENT-1", pressure: "teleport" }), false);
  // any_consequence_pending.derived_from now admits the SPEC-42/47 active classes
  // a consequence can actually be derived from (CLK/STSEC/STQ/STPLAN/STEMO).
  assert.equal(validate({ pred: "any_consequence_pending", alias: "fallout", derived_from: "CLK-1" }), true);
  assert.equal(validate({ pred: "any_consequence_pending", alias: "fallout", derived_from: "STEMO-1" }), true);
});

test("predicate DSL schema exposes runtime role enum for existential role filters", () => {
  const schema = readPredicateSchema();
  const schemasByTitle = new Map(schema.oneOf.map((entry) => [entry.title, entry]));
  const ajv = new Ajv2020({ strict: true });
  const validate = ajv.compile(schema);

  for (const [pred, field] of EXISTENTIAL_ROLE_FILTER_FIELDS) {
    const entry = schemasByTitle.get(pred);
    assert.ok(entry, `missing schema entry for ${pred}`);
    const propertySchema = entry.properties[field] as { enum?: string[] };
    assert.deepEqual(propertySchema.enum, [...STORY_ROLES], `${pred}.${field} should mirror runtime role enum`);

    assert.equal(
      validate({ ...sampleFor(pred), [field]: "viewpoint" }),
      true,
      `${pred}.${field} should accept bare role enum values: ${ajv.errorsText(validate.errors)}`
    );
    assert.equal(validate({ ...sampleFor(pred), [field]: "role:viewpoint" }), false, `${pred}.${field} should reject role: prefixes`);
  }
});

test("storylet schema mirrors runtime branch-scoped restrictions for author-pool prefilter predicates", () => {
  const schema = readStoryletSchema();
  const restrictedPredicates = schema.$defs.scopeRestrictedPrefilterPredicate.properties.pred.enum;
  const runtimeSource = readFileSync(
    path.resolve(process.cwd(), "src/rules/rule_storylet_predicate_dsl_parsability.ts"),
    "utf8"
  );
  const ajv = new Ajv2020({ strict: true });
  const validate = ajv.compile(schema);

  assert.deepEqual(restrictedPredicates, [...SCOPE_RESTRICTED_PREFILTER_PREDICATES]);

  for (const pred of SCOPE_RESTRICTED_PREFILTER_PREDICATES) {
    assert.match(
      runtimeSource,
      new RegExp(`case "${pred}":[\\s\\S]*?requireExistentialScope\\(state, value\\.pred, path\\);`),
      `${pred} should still invoke requireExistentialScope at runtime`
    );

    for (const list of ["hard", "soft"] as const) {
      assert.equal(
        validate(storyletWithPredicate(pred, "branch_scoped", list)),
        false,
        `${pred} in preconditions.${list} should fail schema validation under branch_scoped`
      );
      assert.equal(
        validate(storyletWithPredicate(pred, "global_author_pool", list)),
        true,
        `${pred} in preconditions.${list} should pass under global_author_pool: ${ajv.errorsText(validate.errors)}`
      );
      assert.equal(
        validate(storyletWithPredicate(pred, "branch_prefix_scoped", list)),
        true,
        `${pred} in preconditions.${list} should pass under branch_prefix_scoped: ${ajv.errorsText(validate.errors)}`
      );
    }
  }
});

test("predicate DSL schema accepts STCHAR/STPLAN/STEMO for record_active and record_age", () => {
  // The discoverable schema must mirror the runtime active-record vocabulary.
  const schema = readPredicateSchema();
  const ajv = new Ajv2020({ strict: true });
  const validate = ajv.compile(schema);

  for (const cls of ["STCHAR-1", "STPLAN-1", "STEMO-2"]) {
    assert.equal(validate({ pred: "record_active", record: cls }), true, `record_active should accept ${cls}`);
    assert.equal(
      validate({ pred: "record_age", record: cls, comparator: ">=", pages: 1 }),
      true,
      `record_age should accept ${cls}`
    );
  }
  // control: world-canon classes remain outside record_active / record_age
  assert.equal(validate({ pred: "record_active", record: "CF-1" }), false);
  assert.equal(validate({ pred: "record_age", record: "CF-1", comparator: ">=", pages: 1 }), false);
});

test("predicate DSL schema mirrors runtime bound-alias form for record_age.record", async () => {
  const schema = readPredicateSchema();
  const ajv = new Ajv2020({ strict: true });
  const validate = ajv.compile(schema);

  assert.equal(validate({ pred: "record_age", record: "matured_clock", comparator: ">=", pages: 2 }), false);
  assert.ok(
    (await recordAgeRuntimeCodes("matured_clock")).includes("predicate.invalid_reference"),
    "runtime should reject bare aliases as invalid active-record references"
  );

  assert.equal(
    validate({ pred: "record_age", record: "bound:matured_clock", comparator: ">=", pages: 2 }),
    true,
    `bound alias should pass schema validation: ${ajv.errorsText(validate.errors)}`
  );
  assert.deepEqual(await recordAgeRuntimeCodes("bound:matured_clock"), []);

  assert.equal(
    validate({ pred: "record_age", record: "SF-1", comparator: ">=", pages: 2 }),
    true,
    `record id should pass schema validation: ${ajv.errorsText(validate.errors)}`
  );
  assert.deepEqual(await recordAgeRuntimeCodes("SF-1"), []);
});
