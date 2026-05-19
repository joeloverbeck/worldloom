import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { extractIntroTags, type MidstoryIntroductionClass, type ParsedIntroTag } from "@worldloom/world-index/parse/intro-tag-parser";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "midstory_record_introduction_grounding";
const INTRO_CLASSES = new Set<MidstoryIntroductionClass>(["CLK", "STSEC", "STQ", "THR", "STENT", "SREL", "STPLAN", "STEMO"]);
const INTRO_CREATE_OPS = new Set([
  "create_clk_record",
  "create_stsec_record",
  "create_stq_record",
  "create_thr_record",
  "create_stent_record",
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
      /^stories\/[^/]+\/_source\/(?:events|pages|clocks|secrets|story-questions|threads|entities|relationships|plans|emotions)\/(?:SE|PG|CLK|STSEC|STQ|THR|STENT|SREL|STPLAN|STEMO)-\d+\.yaml$/
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
  const rationale = stringValue(parsed.world_logic_rationale) ?? "";
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
  let tags: ParsedIntroTag[] = [];
  try {
    tags = extractIntroTags(rationale);
  } catch (error) {
    verdicts.push(missingTag(event, undefined, error instanceof Error ? error.message : String(error)));
  }

  const tagsByRecordId = new Map(tags.map((tag) => [tag.recordId, tag]));
  for (const tag of tags) {
    if (!createdIds.has(tag.recordId)) {
      verdicts.push(missingStateDelta(event, tag));
    }

    const introducedRecord = maps.byId.get(tag.recordId);
    const actualCreatedAt = introducedRecord === undefined
      ? undefined
      : stringValue(asPlainRecord(introducedRecord.parsed).created_at_page);
    if (childPageId !== undefined && actualCreatedAt !== childPageId) {
      verdicts.push(createdAtMismatch(introducedRecord ?? event, tag, childPageId, actualCreatedAt));
    }

    for (const evidenceId of tag.evidence) {
      if (!parentActiveIds.has(evidenceId)) {
        verdicts.push(evidenceMissing(event, tag, evidenceId));
      }
    }
  }

  for (const createdId of createdIds) {
    const createdClass = introClassForId(createdId);
    if (createdClass === undefined) {
      continue;
    }
    const tag = tagsByRecordId.get(createdId);
    if (tag === undefined || tag.class !== createdClass) {
      verdicts.push(missingTag(event, createdId));
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

function missingStateDelta(event: IndexedRecord, tag: ParsedIntroTag): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "midstory_intro_missing_state_delta",
    message: `${tag.recordId} has an intro:${tag.class}(...) tag on ${bareNodeId(event)} but is absent from SE.state_delta.create[].`,
    location: locationFor(event),
    detail: { event_id: bareNodeId(event), record_id: tag.recordId, class: tag.class },
    suggested_fix: `Add ${tag.recordId} to ${bareNodeId(event)}.state_delta.create[] or remove the intro tag.`
  };
}

function createdAtMismatch(record: IndexedRecord, tag: ParsedIntroTag, expected: string, actual: string | undefined): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "midstory_intro_created_at_mismatch",
    message: `${tag.recordId} created_at_page ${actual ?? "<missing>"} does not match creating event page ${expected}.`,
    location: locationFor(record),
    detail: { record_id: tag.recordId, expected_created_at_page: expected, actual_created_at_page: actual ?? null },
    suggested_fix: `Set ${tag.recordId}.created_at_page to ${expected}, or bind the intro tag to the event that created the record.`
  };
}

function missingTag(event: IndexedRecord, recordId?: string, reason?: string): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "midstory_intro_missing_tag",
    message: recordId === undefined
      ? `${bareNodeId(event)} has a malformed intro tag.`
      : `${bareNodeId(event)} creates ${recordId} without a matching intro:<CLASS>(id=${recordId}, ...) tag.`,
    location: locationFor(event),
    detail: { event_id: bareNodeId(event), record_id: recordId, reason },
    suggested_fix: "Carry every mid-story-created CLK/STSEC/STQ/THR/STENT/SREL/STPLAN/STEMO as a parseable intro:<CLASS>(...) tag in SE.world_logic_rationale."
  };
}

function evidenceMissing(event: IndexedRecord, tag: ParsedIntroTag, evidenceId: string): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "midstory_intro_evidence_missing",
    message: `${tag.recordId} intro tag cites evidence ${evidenceId}, but it is neither parent-active nor same-event-created.`,
    location: locationFor(event),
    detail: { event_id: bareNodeId(event), record_id: tag.recordId, evidence_id: evidenceId },
    suggested_fix: `Use evidence records active in the parent PG snapshot or created by the same ${bareNodeId(event)} event.`
  };
}
