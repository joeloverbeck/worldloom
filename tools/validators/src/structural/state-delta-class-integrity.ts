import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue,
  touchedFilesInclude,
  toPosixPath
} from "./utils.js";

export const STATE_DELTA_CLASSES = new Set([
  "STENT",
  "STCHAR",
  "STSTAT",
  "STINT",
  "SF",
  "BEL",
  "OBL",
  "CNSQ",
  "THR",
  "CLK",
  "STSEC",
  "STQ",
  "STPLAN",
  "STEMO",
  "SREL",
  "STLOC",
  "STOBJ",
  "DA"
]);

const STORY_RECORD_NODE_TYPES = new Set([
  "story_entity_record",
  "story_character_authority_record",
  "story_status_record",
  "intention_record",
  "story_fact_record",
  "belief_record",
  "story_event_record",
  "obligation_record",
  "consequence_record",
  "thread_record",
  "pressure_clock_record",
  "story_secret_record",
  "story_question_record",
  "story_plan_record",
  "story_emotion_record",
  "relationship_record_story",
  "story_location_record",
  "story_object_record",
  "story_diegetic_artifact_record",
  "branch_record",
  "page_record",
  "choice_record",
  "storylet_record"
]);

const STATE_DELTA_SE_OPS = new Set(["create_se_record"]);

export const stateDeltaClassIntegrity: Validator = {
  name: "state_delta_class_integrity",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => STATE_DELTA_SE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/events\/SE-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const recordsByStory = storyRecordIds(records);
    const verdicts: Verdict[] = [];

    for (const event of records.filter((record) => record.node_type === "story_event_record")) {
      verdicts.push(...validateEventStateDelta(event, recordsByStory));
    }

    return verdicts;
  }
};

function validateEventStateDelta(
  event: IndexedRecord,
  recordsByStory: ReadonlyMap<string, ReadonlySet<string>>
): Verdict[] {
  const parsed = asPlainRecord(event.parsed);
  const stateDelta = asPlainRecord(parsed.state_delta);
  const eventId = stringValue(parsed.id) ?? bareNodeId(event);
  const storySlug = storySlugFor(event);
  const knownIds = recordsByStory.get(storySlug) ?? new Set<string>();
  const verdicts: Verdict[] = [];

  for (const key of ["create", "supersede", "close"] as const) {
    for (const id of stringArray(stateDelta[key])) {
      const prefix = idPrefix(id);
      if (prefix === undefined || !STATE_DELTA_CLASSES.has(prefix)) {
        verdicts.push(classDriftVerdict(event, eventId, key, id));
        continue;
      }

      if (!knownIds.has(id)) {
        verdicts.push(unresolvedVerdict(event, eventId, key, id));
      }
    }
  }

  return verdicts;
}

function storyRecordIds(records: readonly IndexedRecord[]): Map<string, Set<string>> {
  const byStory = new Map<string, Set<string>>();

  for (const record of records) {
    if (!STORY_RECORD_NODE_TYPES.has(record.node_type)) {
      continue;
    }
    const id = stringValue(asPlainRecord(record.parsed).id) ?? bareNodeId(record);
    const prefix = idPrefix(id);
    if (prefix === undefined || !STATE_DELTA_CLASSES.has(prefix)) {
      continue;
    }
    const storySlug = storySlugFor(record);
    const ids = byStory.get(storySlug) ?? new Set<string>();
    ids.add(id);
    byStory.set(storySlug, ids);
  }

  return byStory;
}

function idPrefix(id: string): string | undefined {
  const match = /^([A-Z]+)-\d+$/.exec(id);
  return match?.[1];
}

function storySlugFor(record: IndexedRecord): string {
  if (typeof record.story_slug === "string" && record.story_slug.length > 0) {
    return record.story_slug;
  }
  const match = toPosixPath(record.file_path).match(/^stories\/([^/]+)\//);
  return match?.[1] ?? "";
}

function bareNodeId(record: IndexedRecord): string {
  return record.node_id.includes(":") ? record.node_id.split(":").at(-1) ?? record.node_id : record.node_id;
}

function classDriftVerdict(event: IndexedRecord, eventId: string, stateDeltaKey: string, id: string): Verdict {
  return {
    validator: "state_delta_class_integrity",
    severity: "fail",
    code: "state_delta_class_integrity_violation",
    message: `${eventId} state_delta.${stateDeltaKey} references ${id}, whose class prefix is outside the permitted story-state class set.`,
    location: locationFor(event),
    detail: { event_id: eventId, state_delta_key: stateDeltaKey, reference_id: id, failure_mode: "class_drift" },
    suggested_fix: "Use one of the permitted story-state record classes in SE.state_delta or update the schema and validator class set together."
  };
}

function unresolvedVerdict(event: IndexedRecord, eventId: string, stateDeltaKey: string, id: string): Verdict {
  return {
    validator: "state_delta_class_integrity",
    severity: "fail",
    code: "state_delta_class_integrity_violation",
    message: `${eventId} state_delta.${stateDeltaKey} references ${id} which does not resolve to a record in the patch plan or repository.`,
    location: locationFor(event),
    detail: { event_id: eventId, state_delta_key: stateDeltaKey, reference_id: id, failure_mode: "unresolved_id" },
    suggested_fix: `Create ${id} in the same patch plan, reference an existing record id, or remove the dangling state_delta reference.`
  };
}
