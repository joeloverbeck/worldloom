import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { readSeIntroductions } from "./midstory-introduction-utils.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "story_question_introduction_grounding_integrity";
const STQ_CREATE_OPS = new Set(["create_se_record", "create_pg_record", "create_stq_record"]);

export const storyQuestionIntroductionGroundingIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => STQ_CREATE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:events|pages|story-questions)\/(?:SE|PG|STQ)-\d+\.yaml$/),
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
  const parentPageId = stringValue(parsed.parent_page_id);
  const eventId = stringValue(parsed.id) ?? bareNodeId(event);
  const activeOrCreated = activeIdsForPage(parentPageId, maps);
  activeOrCreated.add(eventId);
  for (const createdId of createdIds) {
    activeOrCreated.add(createdId);
  }

  const verdicts: Verdict[] = [];
  for (const createdId of introducedRecordIds(event, "STQ")) {
    const question = maps.byId.get(createdId);
    if (question === undefined) {
      continue;
    }
    const createdAtPage = stringValue(asPlainRecord(question.parsed).created_at_page);
    if (createdAtPage === "PG-1") {
      continue;
    }
    verdicts.push(...validateQuestion(question, eventId, activeOrCreated));
  }
  return verdicts;
}

function introducedRecordIds(event: IndexedRecord, recordClass: "STQ"): string[] {
  return readSeIntroductions(event)
    .filter((intro) => intro.class === recordClass)
    .map((intro) => intro.recordId);
}

function validateQuestion(question: IndexedRecord, creatingEventId: string, activeOrCreatedIds: Set<string>): Verdict[] {
  const parsed = asPlainRecord(question.parsed);
  const questionId = stringValue(parsed.id) ?? bareNodeId(question);
  const verdicts: Verdict[] = [];

  const sourceEvent = stringValue(parsed.source_event);
  if (sourceEvent !== creatingEventId) {
    verdicts.push(fail(question, "stq_intro_source_event_mismatch", `${questionId}.source_event ${sourceEvent ?? "<missing>"} does not match creating event ${creatingEventId}.`, {
      question_id: questionId,
      source_event: sourceEvent ?? null,
      creating_event: creatingEventId
    }));
  }

  for (const sourceRecord of stringArray(parsed.source_records)) {
    if (!activeOrCreatedIds.has(sourceRecord)) {
      verdicts.push(fail(question, "stq_intro_source_not_active", `${questionId}.source_records entry ${sourceRecord} is neither parent-active nor same-event-created.`, {
        question_id: questionId,
        source_record: sourceRecord
      }));
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

function fail(question: IndexedRecord, code: string, message: string, detail: Record<string, unknown>): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(question),
    detail
  };
}

function bareNodeId(record: IndexedRecord): string {
  const parts = record.node_id.split(":");
  return parts.at(-1) ?? record.node_id;
}
