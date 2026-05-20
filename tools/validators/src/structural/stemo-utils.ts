import { readFileSync } from "node:fs";
import path from "node:path";

import Ajv2020Module from "ajv/dist/2020.js";
import type { AnySchema, ErrorObject, ValidateFunction } from "ajv";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { readSeNonPropagationFacts, readSeStateRelations } from "./midstory-introduction-utils.js";
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
const STORY_EMOTION_MUTATION_OPS = new Set(["create_stemo_record"]);
const STORY_EMOTION_TOUCHED_FILE = /(?:^|\/)stories\/[^/]+\/_source\/emotions\/STEMO-\d+\.yaml$/;
const RECORD_ID = /\b(?:STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|INV|SEC)-[0-9]+\b/g;
const TERMINAL_STATUSES = new Set(["settled", "transformed", "dissociated"]);
const AFFECT_KINDS = new Set([
  "fear", "anxiety", "anger", "disgust", "grief", "shame", "guilt", "humiliation", "hope",
  "relief", "joy", "awe", "tenderness", "desire", "envy", "contempt", "confusion", "dread"
]);
const INTENSITIES = new Set(["low", "medium", "high", "extreme"]);
const STATUSES = new Set(["active", "suppressed", "settled", "transformed", "dissociated"]);
const BEHAVIORAL_PRESSURES = new Set([
  "approach", "flee", "freeze", "attack", "reject", "dominate", "submit", "seek_contact",
  "protect_other", "seek_help", "confess", "conceal", "withdraw_socially", "plan",
  "accommodate", "self_soothe", "ruminate", "collapse"
]);
const AGENCY_EFFECTS = new Set(["none", "constraining"]);
const COMPATIBLE_AGENCY = new Set(["constrained", "coerced"]);

let storyEmotionSchemaValidator: ValidateFunction | null = null;

export interface EmotionMaps {
  all: readonly IndexedRecord[];
  emotions: readonly IndexedRecord[];
  byId: ReadonlyMap<string, IndexedRecord>;
  pagesById: ReadonlyMap<string, IndexedRecord>;
}

export function stemoValidatorApplies(ctx: Context): boolean {
  if (ctx.run_mode === "full-world") {
    return true;
  }
  if (ctx.run_mode === "pre-apply") {
    return (ctx.patch_plan?.patches ?? []).some((patch) => STORY_EMOTION_MUTATION_OPS.has(patch.op));
  }
  return touchedFilesInclude(ctx, STORY_EMOTION_TOUCHED_FILE);
}

export function defineStemoValidator(
  name: string,
  runEmotion: (emotion: IndexedRecord, ctx: Context, maps: EmotionMaps) => Promise<Verdict[]> | Verdict[]
): Validator {
  return {
    name,
    severity_mode: "fail",
    applies_to: stemoValidatorApplies,
    run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
      const maps = await loadEmotionMaps(ctx);
      const verdicts: Verdict[] = [];
      for (const emotion of maps.emotions) {
        verdicts.push(...await runEmotion(emotion, ctx, maps));
      }
      return verdicts;
    }
  };
}

export async function loadEmotionMaps(ctx: Context): Promise<EmotionMaps> {
  const recordTypes = [
    "story_emotion_record",
    "story_entity_record",
    "story_status_record",
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
    "storylet_record",
    "story_plan_record"
  ];
  const all: IndexedRecord[] = [];
  for (const recordType of recordTypes) {
    all.push(...await queryRecordsByType(ctx, recordType));
  }

  const byId = new Map<string, IndexedRecord>();
  const pagesById = new Map<string, IndexedRecord>();
  const emotions = all.filter((record) => record.node_type === "story_emotion_record");
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

  return { all, emotions, byId, pagesById };
}

export function storyEmotionSchemaVerdicts(emotion: IndexedRecord): Verdict[] {
  const validate = getStoryEmotionSchemaValidator();
  if (validate(emotion.parsed)) {
    return [];
  }
  return (validate.errors ?? []).map((error) => schemaVerdict(emotion, error));
}

export function emotionId(emotion: IndexedRecord): string {
  return recordId(emotion) ?? bareStoryId(emotion.node_id) ?? emotion.node_id;
}

export function recordId(record: IndexedRecord | undefined): string | undefined {
  if (record === undefined) {
    return undefined;
  }
  return stringValue(asPlainRecord(record.parsed).id) ?? bareStoryId(record.node_id);
}

export function emotionField(emotion: IndexedRecord, field: string): string | undefined {
  return stringValue(asPlainRecord(emotion.parsed)[field]);
}

export function emotionStringArray(emotion: IndexedRecord, field: string): string[] {
  return stringArray(asPlainRecord(emotion.parsed)[field]);
}

export function orientationRecordIds(emotion: IndexedRecord): string[] {
  return stringArray(nestedRecord(asPlainRecord(emotion.parsed), "orientation").toward_records);
}

export function activeRecordIdsAt(emotion: IndexedRecord, maps: EmotionMaps): ReadonlySet<string> {
  const pageId = emotionField(emotion, "created_at_page");
  const page = pageId === undefined ? undefined : maps.pagesById.get(scopedId(emotion, pageId)) ?? maps.pagesById.get(pageId);
  return activeIdsFromPage(page);
}

export function isActiveAtEmotionPage(emotion: IndexedRecord, id: string, maps: EmotionMaps): boolean {
  return activeRecordIdsAt(emotion, maps).has(id);
}

export function scopedId(source: IndexedRecord, id: string): string {
  return source.story_slug ? `${source.story_slug}:${id}` : id;
}

export function resolveRecord(source: IndexedRecord, id: string, maps: EmotionMaps): IndexedRecord | undefined {
  return maps.byId.get(scopedId(source, id)) ?? maps.byId.get(id);
}

export function isRecordAccessibleToHolder(record: IndexedRecord, holder: string): boolean {
  const parsed = asPlainRecord(record.parsed);
  // FOUNDATIONS §6b treats active branch-public state as already available to the holder.
  if (
    record.node_type === "story_fact_record" ||
    record.node_type === "story_location_record" ||
    record.node_type === "thread_record" ||
    record.node_type === "consequence_record"
  ) {
    return true;
  }

  // Story questions expose audience-visible setup state, but hidden setups stay fail-closed.
  if (record.node_type === "story_question_record" && stringValue(parsed.audience_visibility) !== "hidden") {
    return true;
  }

  const recordHolder = stringValue(parsed.holder);
  if (recordHolder === holder || recordHolder === "public" || recordHolder === "narrator") {
    return true;
  }
  if (stringArray(nestedRecord(parsed, "basis").access_records).includes(holder)) {
    return true;
  }
  if (stringArray(parsed.holders).includes(holder)) {
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

export function isOrientationTargetAccessibleToHolder(record: IndexedRecord, holder: string | undefined): boolean {
  if (holder === undefined) {
    return false;
  }
  return isRecordAccessibleToHolder(record, holder);
}

export function pageBranchPathFor(emotion: IndexedRecord, maps: EmotionMaps): string[] {
  const pageId = emotionField(emotion, "created_at_page");
  const page = pageId === undefined ? undefined : maps.pagesById.get(scopedId(emotion, pageId)) ?? maps.pagesById.get(pageId);
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

export function eventIsOnBranchOrSameEvent(
  emotion: IndexedRecord,
  eventId: string,
  maps: EmotionMaps
): boolean {
  const event = resolveRecord(emotion, eventId, maps);
  if (event?.node_type !== "story_event_record") {
    return false;
  }
  if (eventId === emotionField(emotion, "created_by_event")) {
    return true;
  }
  const eventPage = stringValue(asPlainRecord(event.parsed).created_at_page);
  const createdAtPage = emotionField(emotion, "created_at_page");
  if (eventPage === undefined || createdAtPage === undefined) {
    return false;
  }
  const branchPath = pageBranchPathFor(emotion, maps);
  return branchPath.includes(eventPage) && (pageNumber(eventPage) ?? 0) <= (pageNumber(createdAtPage) ?? 0);
}

export function statusRequiresTransitionEvent(emotion: IndexedRecord): boolean {
  return TERMINAL_STATUSES.has(emotionField(emotion, "status") ?? "");
}

export function hasTransitionEvent(emotion: IndexedRecord, maps: EmotionMaps): boolean {
  const createdBy = emotionField(emotion, "created_by_event");
  const trigger = emotionField(emotion, "trigger_event");
  return (createdBy !== undefined && eventIsOnBranchOrSameEvent(emotion, createdBy, maps)) ||
    (trigger !== undefined && eventIsOnBranchOrSameEvent(emotion, trigger, maps));
}

export function enumVerdicts(emotion: IndexedRecord): Verdict[] {
  const parsed = asPlainRecord(emotion.parsed);
  const verdicts: Verdict[] = [];
  const status = stringValue(parsed.status);
  if (status !== undefined && !STATUSES.has(status)) {
    verdicts.push(fail(emotion, "stemo_enum_compliance", "stemo_enum_compliance.invalid_status", `status ${status} is not in the closed STEMO status enum.`));
  }
  const affectKind = parsed.affect_kind;
  if (status === "dissociated") {
    if (affectKind !== null) {
      verdicts.push(fail(emotion, "stemo_enum_compliance", "stemo_enum_compliance.affect_not_null_for_dissociated", "status dissociated requires affect_kind: null."));
    }
  } else if (typeof affectKind !== "string" || !AFFECT_KINDS.has(affectKind)) {
    verdicts.push(fail(emotion, "stemo_enum_compliance", "stemo_enum_compliance.invalid_affect_kind", "non-dissociated STEMO records require a closed-enum affect_kind."));
  }
  const intensity = stringValue(parsed.intensity);
  if (status !== "dissociated" && (intensity === undefined || !INTENSITIES.has(intensity))) {
    verdicts.push(fail(emotion, "stemo_enum_compliance", "stemo_enum_compliance.invalid_intensity", "non-dissociated STEMO records require a closed-enum intensity."));
  }
  const pressures = stringArray(parsed.behavioral_pressure);
  if (status !== "dissociated" && pressures.length === 0) {
    verdicts.push(fail(emotion, "stemo_enum_compliance", "stemo_enum_compliance.missing_behavioral_pressure", "non-dissociated STEMO records require at least one behavioral_pressure value."));
  }
  const seenPressures = new Set<string>();
  for (const pressure of pressures) {
    if (!BEHAVIORAL_PRESSURES.has(pressure)) {
      verdicts.push(fail(emotion, "stemo_enum_compliance", "stemo_enum_compliance.invalid_behavioral_pressure", `behavioral_pressure ${pressure} is not in the closed enum.`));
    }
    if (seenPressures.has(pressure)) {
      verdicts.push(fail(emotion, "stemo_enum_compliance", "stemo_enum_compliance.duplicate_behavioral_pressure", `behavioral_pressure ${pressure} must not be duplicated in one STEMO record.`));
    }
    seenPressures.add(pressure);
  }
  const agencyEffect = stringValue(parsed.agency_effect);
  if (agencyEffect !== undefined && !AGENCY_EFFECTS.has(agencyEffect)) {
    verdicts.push(fail(emotion, "stemo_enum_compliance", "stemo_enum_compliance.invalid_agency_effect", `agency_effect ${agencyEffect} is not in the closed enum.`));
  }
  return verdicts;
}

export function holderHasCompatibleAgency(emotion: IndexedRecord, maps: EmotionMaps): boolean {
  const holder = emotionField(emotion, "holder");
  if (holder === undefined) {
    return false;
  }
  for (const record of maps.all) {
    if (record.node_type !== "story_status_record") {
      continue;
    }
    const parsed = asPlainRecord(record.parsed);
    if (stringValue(parsed.entity) === holder && COMPATIBLE_AGENCY.has(stringValue(parsed.agency) ?? "")) {
      const statusId = recordId(record);
      if (statusId === undefined || isActiveAtEmotionPage(emotion, statusId, maps)) {
        return true;
      }
    }
  }
  return false;
}

export function sameEventExplainsConstrainedAgency(emotion: IndexedRecord, maps: EmotionMaps): boolean {
  const createdBy = emotionField(emotion, "created_by_event");
  if (createdBy === undefined) {
    return false;
  }
  const event = resolveRecord(emotion, createdBy, maps);
  if (event?.node_type !== "story_event_record") {
    return false;
  }
  return readSeStateRelations(event).length > 0 || readSeNonPropagationFacts(event).length > 0;
}

export function fail(emotion: IndexedRecord, validator: string, code: string, message: string, detail?: unknown): Verdict {
  return {
    validator,
    severity: "fail",
    code,
    message: `${emotionId(emotion)}: ${message}`,
    location: locationFor(emotion),
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

function getStoryEmotionSchemaValidator(): ValidateFunction {
  if (storyEmotionSchemaValidator !== null) {
    return storyEmotionSchemaValidator;
  }
  const schemaRoot = path.resolve(import.meta.dirname, "../../../src/schemas");
  const schema = JSON.parse(readFileSync(path.join(schemaRoot, "story-emotion.schema.json"), "utf8")) as AnySchema;
  storyEmotionSchemaValidator = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  return storyEmotionSchemaValidator;
}

function schemaVerdict(emotion: IndexedRecord, error: ErrorObject): Verdict {
  return fail(
    emotion,
    "stemo_schema_compliance",
    `stemo_schema_compliance.${error.keyword}`,
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
