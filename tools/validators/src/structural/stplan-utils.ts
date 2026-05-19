import { readFileSync } from "node:fs";
import path from "node:path";

import Ajv2020Module from "ajv/dist/2020.js";
import type { AnySchema, ErrorObject, ValidateFunction } from "ajv";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { readSeStateRelations } from "./midstory-introduction-utils.js";
import {
  asPlainRecord,
  locationFor,
  nestedRecord,
  queryRecordsByType,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

type Ajv2020Instance = {
  compile(schema: AnySchema): ValidateFunction;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;

const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;
const STORY_PLAN_MUTATION_OPS = new Set(["create_stplan_record"]);
const STORY_PLAN_TOUCHED_FILE = /(?:^|\/)stories\/[^/]+\/_source\/plans\/STPLAN-\d+\.yaml$/;
const RECORD_ID = /\b(?:STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|INV|SEC)-[0-9]+\b/g;
const CLOSING_STATE_RELATIONS = new Set(["fulfills", "abandons", "blocks"]);

let storyPlanSchemaValidator: ValidateFunction | null = null;

export interface StoryMaps {
  all: readonly IndexedRecord[];
  plans: readonly IndexedRecord[];
  byId: ReadonlyMap<string, IndexedRecord>;
  pagesById: ReadonlyMap<string, IndexedRecord>;
}

export function stplanValidatorApplies(ctx: Context): boolean {
  if (ctx.run_mode === "full-world") {
    return true;
  }
  if (ctx.run_mode === "pre-apply") {
    return (ctx.patch_plan?.patches ?? []).some((patch) => STORY_PLAN_MUTATION_OPS.has(patch.op));
  }
  return touchedFilesInclude(ctx, STORY_PLAN_TOUCHED_FILE);
}

export function defineStplanValidator(
  name: string,
  runPlan: (plan: IndexedRecord, ctx: Context, maps: StoryMaps) => Promise<Verdict[]> | Verdict[]
): Validator {
  return {
    name,
    severity_mode: "fail",
    applies_to: stplanValidatorApplies,
    run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
      const maps = await loadStoryMaps(ctx);
      const verdicts: Verdict[] = [];
      for (const plan of maps.plans) {
        verdicts.push(...await runPlan(plan, ctx, maps));
      }
      return verdicts;
    }
  };
}

export async function loadStoryMaps(ctx: Context): Promise<StoryMaps> {
  const recordTypes = [
    "story_plan_record",
    "story_entity_record",
    "story_fact_record",
    "belief_record",
    "story_event_record",
    "obligation_record",
    "consequence_record",
    "thread_record",
    "pressure_clock_record",
    "story_secret_record",
    "story_question_record",
    "relationship_record_story",
    "intention_record",
    "story_location_record",
    "story_object_record",
    "story_diegetic_artifact_record",
    "branch_record",
    "page_record",
    "choice_record",
    "storylet_record"
  ];
  const all: IndexedRecord[] = [];
  for (const recordType of recordTypes) {
    all.push(...await queryRecordsByType(ctx, recordType));
  }

  const byId = new Map<string, IndexedRecord>();
  const pagesById = new Map<string, IndexedRecord>();
  const plans = all.filter((record) => record.node_type === "story_plan_record");
  for (const record of all) {
    const id = recordId(record);
    byId.set(record.node_id, record);
    if (id !== undefined) {
      byId.set(id, record);
      if (record.story_slug) {
        byId.set(`${record.story_slug}:${id}`, record);
      }
    }
    if (record.node_type === "page_record" && id !== undefined) {
      pagesById.set(id, record);
      if (record.story_slug) {
        pagesById.set(`${record.story_slug}:${id}`, record);
      }
    }
  }

  return { all, plans, byId, pagesById };
}

export function storyPlanSchemaVerdicts(plan: IndexedRecord): Verdict[] {
  const validate = getStoryPlanSchemaValidator();
  if (validate(plan.parsed)) {
    return [];
  }
  return (validate.errors ?? []).map((error) => schemaVerdict(plan, error));
}

export function planId(plan: IndexedRecord): string {
  return recordId(plan) ?? bareStoryId(plan.node_id) ?? plan.node_id;
}

export function recordId(record: IndexedRecord | undefined): string | undefined {
  if (record === undefined) {
    return undefined;
  }
  return stringValue(asPlainRecord(record.parsed).id) ?? bareStoryId(record.node_id);
}

export function planField(plan: IndexedRecord, field: string): string | undefined {
  return stringValue(asPlainRecord(plan.parsed)[field]);
}

export function planStringArray(plan: IndexedRecord, field: string): string[] {
  return stringArray(asPlainRecord(plan.parsed)[field]);
}

export function resourceBasisIds(plan: IndexedRecord): Array<{ field: string; id: string }> {
  const resourceBasis = nestedRecord(asPlainRecord(plan.parsed), "resource_basis");
  const fields = ["facts", "objects", "locations", "artifacts", "relationships", "obligations"];
  return fields.flatMap((field) =>
    stringArray(resourceBasis[field]).map((id) => ({ field: `resource_basis.${field}`, id }))
  );
}

export function currentStepTargetIds(plan: IndexedRecord): string[] {
  return stringArray(nestedRecord(asPlainRecord(plan.parsed), "current_step").target_records);
}

export function successConditionRecordIds(plan: IndexedRecord): string[] {
  const predicates = nestedRecord(nestedRecord(asPlainRecord(plan.parsed), "current_step"), "success_condition").predicates;
  return idsInValue(predicates);
}

export function activeRecordIdsAt(plan: IndexedRecord, maps: StoryMaps): ReadonlySet<string> {
  const pageId = planField(plan, "created_at_page");
  const page = pageId === undefined ? undefined : maps.pagesById.get(scopedId(plan, pageId)) ?? maps.pagesById.get(pageId);
  return activeIdsFromPage(page);
}

export function isActiveAtPlanPage(plan: IndexedRecord, id: string, maps: StoryMaps): boolean {
  return activeRecordIdsAt(plan, maps).has(id);
}

export function scopedId(source: IndexedRecord, id: string): string {
  return source.story_slug ? `${source.story_slug}:${id}` : id;
}

export function resolveRecord(source: IndexedRecord, id: string, maps: StoryMaps): IndexedRecord | undefined {
  return maps.byId.get(scopedId(source, id)) ?? maps.byId.get(id);
}

export function isRecordAccessibleToHolder(record: IndexedRecord, holder: string): boolean {
  const parsed = asPlainRecord(record.parsed);
  if (record.node_type === "story_fact_record" || record.node_type === "story_location_record") {
    return true;
  }
  const recordHolder = stringValue(parsed.holder);
  if (recordHolder === holder || recordHolder === "public" || recordHolder === "narrator") {
    return true;
  }

  const basisAccessRecords = stringArray(nestedRecord(parsed, "basis").access_records);
  if (basisAccessRecords.includes(holder)) {
    return true;
  }

  if (stringValue(parsed.owner) === holder || stringValue(parsed.current_location) === `carried_by:${holder}`) {
    return true;
  }
  if (stringValue(parsed.owed_by) === holder || stringValue(parsed.owed_to) === holder) {
    return true;
  }
  if (stringArray(parsed.participants).includes(holder)) {
    return true;
  }
  return false;
}

export function pageBranchPathFor(plan: IndexedRecord, maps: StoryMaps): string[] {
  const pageId = planField(plan, "created_at_page");
  const page = pageId === undefined ? undefined : maps.pagesById.get(scopedId(plan, pageId)) ?? maps.pagesById.get(pageId);
  return stringArray(asPlainRecord(page?.parsed).branch_path);
}

export function pageNumber(id: string): number | null {
  const match = /^PG-(\d+)$/.exec(id);
  return match === null ? null : Number(match[1]);
}

export function idsInValue(value: unknown): string[] {
  const ids = new Set<string>();
  collectIds(value, ids);
  return [...ids].sort();
}

export function eventsWithClosureFor(plan: IndexedRecord, maps: StoryMaps): IndexedRecord[] {
  const id = planId(plan);
  return maps.all.filter((record) => {
    if (record.node_type !== "story_event_record") {
      return false;
    }
    for (const relation of readSeStateRelations(record)) {
      if (relation.targetRecord === id && CLOSING_STATE_RELATIONS.has(relation.relation)) {
        return true;
      }
    }
    return false;
  });
}

export function planAdvanceRelations(maps: StoryMaps): Array<{ event: IndexedRecord; planId: string }> {
  const relations: Array<{ event: IndexedRecord; planId: string }> = [];
  for (const event of maps.all.filter((record) => record.node_type === "story_event_record")) {
    for (const relation of readSeStateRelations(event)) {
      if (relation.relation === "advances") {
        relations.push({ event, planId: relation.targetRecord });
      }
    }
  }
  return relations;
}

export function eventCreatedOrSupersededIds(event: IndexedRecord): string[] {
  const stateDelta = nestedRecord(asPlainRecord(event.parsed), "state_delta");
  return [...stringArray(stateDelta.create), ...stringArray(stateDelta.supersede)];
}

export function fail(plan: IndexedRecord, validator: string, code: string, message: string, detail?: unknown): Verdict {
  return {
    validator,
    severity: "fail",
    code,
    message: `${planId(plan)}: ${message}`,
    location: locationFor(plan),
    detail
  };
}

function activeIdsFromPage(page: IndexedRecord | undefined): ReadonlySet<string> {
  const active = nestedRecord(nestedRecord(asPlainRecord(page?.parsed), "state_snapshot"), "active_records");
  const ids = new Set<string>();
  for (const value of Object.values(active)) {
    for (const id of stringArray(value)) {
      ids.add(id);
    }
  }
  return ids;
}

function getStoryPlanSchemaValidator(): ValidateFunction {
  if (storyPlanSchemaValidator !== null) {
    return storyPlanSchemaValidator;
  }
  const schemaRoot = path.resolve(import.meta.dirname, "../../../src/schemas");
  const schema = JSON.parse(readFileSync(path.join(schemaRoot, "story-plan.schema.json"), "utf8")) as AnySchema;
  storyPlanSchemaValidator = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  return storyPlanSchemaValidator;
}

function schemaVerdict(plan: IndexedRecord, error: ErrorObject): Verdict {
  return fail(
    plan,
    "stplan_schema_compliance",
    `stplan_schema_compliance.${error.keyword}`,
    `schema violation at ${error.instancePath || "/"}: ${error.message ?? error.keyword}`
  );
}

function collectIds(value: unknown, ids: Set<string>): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(RECORD_ID)) {
      ids.add(match[0]);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectIds(item, ids));
    return;
  }
  if (typeof value !== "object" || value === null) {
    return;
  }
  for (const nested of Object.values(value)) {
    collectIds(nested, ids);
  }
}

function bareStoryId(nodeId: string): string | undefined {
  const parts = nodeId.split(":");
  return parts.length > 1 ? parts[parts.length - 1] : nodeId;
}
