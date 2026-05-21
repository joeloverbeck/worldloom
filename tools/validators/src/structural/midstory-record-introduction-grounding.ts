import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { readSeIntroductions, type MidstoryIntroductionClass, type ParsedIntroduction } from "./midstory-introduction-utils.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "midstory_record_introduction_grounding";
const INTRO_CLASSES = new Set<MidstoryIntroductionClass>([
  "CLK",
  "STSEC",
  "STQ",
  "THR",
  "STENT",
  "STCHAR",
  "SREL",
  "STPLAN",
  "STEMO"
]);
const INTRO_CREATE_OPS = new Set([
  "create_clk_record",
  "create_stsec_record",
  "create_stq_record",
  "create_thr_record",
  "create_stent_record",
  "append_story_character_authority_record",
  "create_srel_record",
  "create_stplan_record",
  "create_stemo_record"
]);

export const midstoryRecordIntroductionGrounding: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) =>
      patch.op === "create_se_record" ||
      patch.op === "create_pg_record" ||
      INTRO_CREATE_OPS.has(patch.op)
    ) === true ||
    touchedFilesInclude(
      ctx,
      /^stories\/[^/]+\/(?:_source\/(?:events|pages|clocks|secrets|story-questions|threads|entities|relationships|plans|emotions)\/(?:SE|PG|CLK|STSEC|STQ|THR|STENT|SREL|STPLAN|STEMO)-\d+\.yaml|story-characters\/STCHAR-\d+\.md)$/
    ),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];
    const storySlugs = new Set(records.map((record) => record.story_slug).filter((slug): slug is string => typeof slug === "string"));

    for (const storySlug of storySlugs) {
      const maps = recordMapsForStory(records, storySlug);
      for (const event of maps.byType.get("story_event_record") ?? []) {
        verdicts.push(...validateEvent(event, maps));
      }
    }

    return verdicts;
  }
};

interface RecordMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

function validateEvent(event: IndexedRecord, maps: RecordMaps): Verdict[] {
  const parsed = asPlainRecord(event.parsed);
  const stateDelta = asPlainRecord(parsed.state_delta);
  const createdIds = new Set(stringArray(stateDelta.create));
  const eventId = stringValue(parsed.id) ?? bareNodeId(event);
  const childPageId = stringValue(parsed.created_at_page);
  const parentPageId = stringValue(parsed.parent_page_id);

  if (parentPageId === undefined || childPageId === undefined || childPageId === "PG-1" || stringValue(parsed.event_kind) === "story_start") {
    return [];
  }
  if (isLegacyCompatibilityPage(childPageId, maps)) {
    return [];
  }

  const parentActiveIds = activeIdsForPage(parentPageId, maps);
  parentActiveIds.add(eventId);
  for (const createdId of createdIds) {
    parentActiveIds.add(createdId);
  }

  const verdicts: Verdict[] = [];
  const introductions = readSeIntroductions(event);
  const introductionsByRecordId = new Map(introductions.map((intro) => [intro.recordId, intro]));
  for (const intro of introductions) {
    if (!createdIds.has(intro.recordId)) {
      verdicts.push(missingStateDelta(event, intro));
    }

    const introducedRecord = maps.byId.get(intro.recordId);
    const actualCreatedAt = introducedRecord === undefined
      ? undefined
      : stringValue(asPlainRecord(introducedRecord.parsed).created_at_page);
    if (childPageId !== undefined && actualCreatedAt !== childPageId) {
      verdicts.push(createdAtMismatch(introducedRecord ?? event, intro, childPageId, actualCreatedAt));
    }

    for (const evidenceId of intro.evidence) {
      if (!parentActiveIds.has(evidenceId)) {
        verdicts.push(evidenceMissing(event, intro, evidenceId));
      }
    }
  }

  for (const createdId of createdIds) {
    const createdClass = introClassForId(createdId);
    if (createdClass === undefined) {
      continue;
    }
    const intro = introductionsByRecordId.get(createdId);
    if (intro === undefined || intro.class !== createdClass) {
      verdicts.push(missingIntroduction(event, createdId));
    }
  }

  return verdicts;
}

function recordMapsForStory(records: readonly IndexedRecord[], storySlug: string): RecordMaps {
  const byId = new Map<string, IndexedRecord>();
  const byType = new Map<string, IndexedRecord[]>();

  for (const record of records) {
    if (record.story_slug !== storySlug) {
      continue;
    }
    const parsed = asPlainRecord(record.parsed);
    byId.set(record.node_id, record);
    byId.set(bareNodeId(record), record);
    const id = stringValue(parsed.id);
    if (id !== undefined) {
      byId.set(id, record);
    }
    const typed = byType.get(record.node_type) ?? [];
    typed.push(record);
    byType.set(record.node_type, typed);
  }

  return { byId, byType };
}

function activeIdsForPage(pageId: string | undefined, maps: RecordMaps): Set<string> {
  if (pageId === undefined) {
    return new Set();
  }
  const page = maps.byId.get(pageId);
  const activeRecords = asPlainRecord(asPlainRecord(asPlainRecord(page?.parsed).state_snapshot).active_records);
  const ids = new Set<string>();
  for (const value of Object.values(activeRecords)) {
    for (const id of stringArray(value)) {
      ids.add(id);
    }
  }
  return ids;
}

function isLegacyCompatibilityPage(pageId: string, maps: RecordMaps): boolean {
  const page = maps.byId.get(pageId);
  const activeRecords = asPlainRecord(asPlainRecord(asPlainRecord(page?.parsed).state_snapshot).active_records);
  return (
    Object.keys(activeRecords).length > 0 &&
    (!Array.isArray(activeRecords.CLK) || !Array.isArray(activeRecords.STSEC) || !Array.isArray(activeRecords.STQ))
  );
}

function introClassForId(id: string): MidstoryIntroductionClass | undefined {
  const prefix = id.split("-", 1)[0] as MidstoryIntroductionClass | undefined;
  return prefix !== undefined && INTRO_CLASSES.has(prefix) ? prefix : undefined;
}

function bareNodeId(record: IndexedRecord): string {
  const parts = record.node_id.split(":");
  return parts.at(-1) ?? record.node_id;
}

function missingStateDelta(event: IndexedRecord, intro: ParsedIntroduction): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "midstory_intro_missing_state_delta",
    message: `${intro.recordId} has a record_introductions[] entry on ${bareNodeId(event)} but is absent from SE.state_delta.create[].`,
    location: locationFor(event),
    detail: { event_id: bareNodeId(event), record_id: intro.recordId, class: intro.class },
    suggested_fix: `Add ${intro.recordId} to ${bareNodeId(event)}.state_delta.create[] or remove the structured introduction entry.`
  };
}

function createdAtMismatch(record: IndexedRecord, intro: ParsedIntroduction, expected: string, actual: string | undefined): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "midstory_intro_created_at_mismatch",
    message: `${intro.recordId} created_at_page ${actual ?? "<missing>"} does not match creating event page ${expected}.`,
    location: locationFor(record),
    detail: { record_id: intro.recordId, expected_created_at_page: expected, actual_created_at_page: actual ?? null },
    suggested_fix: `Set ${intro.recordId}.created_at_page to ${expected}, or bind the structured introduction to the event that created the record.`
  };
}

function missingIntroduction(event: IndexedRecord, recordId: string): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "midstory_intro_missing_tag",
    message: `${bareNodeId(event)} creates ${recordId} without a matching SE.record_introductions[] entry.`,
    location: locationFor(event),
    detail: { event_id: bareNodeId(event), record_id: recordId, reason: undefined },
    suggested_fix: "Carry every mid-story-created CLK/STSEC/STQ/THR/STENT/STCHAR/SREL/STPLAN/STEMO as a structured entry in SE.record_introductions[] (record_id, class, trigger, evidence, distinct_from)."
  };
}

function evidenceMissing(event: IndexedRecord, intro: ParsedIntroduction, evidenceId: string): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "midstory_intro_evidence_missing",
    message: `${intro.recordId} structured introduction cites evidence ${evidenceId}, but it is neither parent-active nor same-event-created.`,
    location: locationFor(event),
    detail: { event_id: bareNodeId(event), record_id: intro.recordId, evidence_id: evidenceId },
    suggested_fix: `Use evidence records active in the parent PG snapshot or created by the same ${bareNodeId(event)} event.`
  };
}
