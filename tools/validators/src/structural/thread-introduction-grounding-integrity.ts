import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "thread_introduction_grounding_integrity";
const THREAD_CREATE_OPS = new Set(["create_se_record", "create_pg_record", "create_thr_record"]);
const ALLOWED_GROUNDING_PREFIXES = new Set(["SE", "SF", "BEL", "OBL", "CNSQ", "STINT", "SREL", "DA"]);

export const threadIntroductionGroundingIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => THREAD_CREATE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:events|pages|threads)\/(?:SE|PG|THR)-\d+\.yaml$/),
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
  for (const createdId of createdIds) {
    if (!createdId.startsWith("THR-")) {
      continue;
    }
    const thread = maps.byId.get(createdId);
    if (thread === undefined) {
      continue;
    }
    const createdAtPage = stringValue(asPlainRecord(thread.parsed).created_at_page);
    if (createdAtPage === "PG-1") {
      continue;
    }
    verdicts.push(...validateThread(thread, activeOrCreated));
  }
  return verdicts;
}

function validateThread(thread: IndexedRecord, activeOrCreatedIds: Set<string>): Verdict[] {
  const parsed = asPlainRecord(thread.parsed);
  const threadId = stringValue(parsed.id) ?? bareNodeId(thread);
  const derivedFrom = stringArray(parsed.derived_from);
  const verdicts: Verdict[] = [];

  if (derivedFrom.length === 0) {
    verdicts.push(fail(thread, "thread_intro_missing_derived_from", `${threadId}.derived_from must name at least one parent-active or same-event-created grounding record.`, { thread_id: threadId }));
    return verdicts;
  }

  for (const groundingId of derivedFrom) {
    if (!isAllowedGroundingId(groundingId) || !activeOrCreatedIds.has(groundingId)) {
      verdicts.push(fail(thread, "thread_intro_grounding_missing", `${threadId}.derived_from entry ${groundingId} is not an allowed parent-active or same-event-created grounding record.`, {
        thread_id: threadId,
        grounding_record: groundingId
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

function isAllowedGroundingId(id: string): boolean {
  const prefix = id.split("-")[0];
  return prefix !== undefined && ALLOWED_GROUNDING_PREFIXES.has(prefix);
}

function fail(thread: IndexedRecord, code: string, message: string, detail: Record<string, unknown>): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(thread),
    detail
  };
}

function bareNodeId(record: IndexedRecord): string {
  const parts = record.node_id.split(":");
  return parts.at(-1) ?? record.node_id;
}
