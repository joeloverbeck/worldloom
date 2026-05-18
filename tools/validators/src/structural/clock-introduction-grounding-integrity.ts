import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "clock_introduction_grounding_integrity";
const CLOCK_CREATE_OPS = new Set(["create_se_record", "create_pg_record", "create_clk_record"]);

export const clockIntroductionGroundingIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => CLOCK_CREATE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:events|pages|clocks)\/(?:SE|PG|CLK)-\d+\.yaml$/),
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
  const activeOrCreated = activeIdsForPage(parentPageId, maps);
  for (const createdId of createdIds) {
    activeOrCreated.add(createdId);
  }

  const verdicts: Verdict[] = [];
  for (const createdId of createdIds) {
    if (!createdId.startsWith("CLK-")) {
      continue;
    }
    const clock = maps.byId.get(createdId);
    if (clock === undefined) {
      continue;
    }
    const createdAtPage = stringValue(asPlainRecord(clock.parsed).created_at_page);
    if (createdAtPage === "PG-1") {
      continue;
    }
    verdicts.push(...validateClock(clock, activeOrCreated));
  }
  return verdicts;
}

function validateClock(clock: IndexedRecord, activeOrCreatedIds: Set<string>): Verdict[] {
  const parsed = asPlainRecord(clock.parsed);
  const clockId = stringValue(parsed.id) ?? bareNodeId(clock);
  const verdicts: Verdict[] = [];

  if (stringValue(parsed.driver) === undefined) {
    verdicts.push(fail(clock, "clock_intro_missing_driver", `${clockId} introduced mid-story without a non-empty driver.`, { clock_id: clockId }));
  }

  const max = parsed.max;
  const maxValue = typeof max === "number" && Number.isInteger(max) ? max : null;
  if (maxValue === null || maxValue < 1) {
    verdicts.push(fail(clock, "clock_intro_invalid_max", `${clockId}.max must be a positive integer for mid-story introduction.`, { clock_id: clockId, max: max ?? null }));
  }

  const thresholdValue = parsed.thresholds;
  if (!Array.isArray(thresholdValue)) {
    verdicts.push(fail(clock, "clock_intro_invalid_threshold", `${clockId}.thresholds must be an array.`, { clock_id: clockId }));
  } else if (maxValue !== null) {
    for (const [index, threshold] of thresholdValue.entries()) {
      const at = asPlainRecord(threshold).at;
      if (typeof at !== "number" || !Number.isInteger(at) || at < 1 || at > maxValue) {
        verdicts.push(fail(clock, "clock_intro_invalid_threshold", `${clockId}.thresholds[${index}].at must be between 1 and max ${maxValue}.`, { clock_id: clockId, index, at: at ?? null, max: maxValue }));
      }
    }
  }

  const linkedValue = parsed.linked_records;
  if (!Array.isArray(linkedValue)) {
    verdicts.push(fail(clock, "clock_intro_missing_linked_record", `${clockId}.linked_records must be an array.`, { clock_id: clockId }));
    verdicts.push(fail(clock, "clock_intro_missing_grounding_link", `${clockId} has no active or same-event grounding link.`, { clock_id: clockId, linked_records: [] }));
    return verdicts;
  }

  const linkedRecords = stringArray(linkedValue);
  if (linkedRecords.length === 0) {
    verdicts.push(fail(clock, "clock_intro_missing_grounding_link", `${clockId} has no active or same-event grounding link.`, { clock_id: clockId, linked_records: [] }));
    return verdicts;
  }

  const activeLinks = linkedRecords.filter((linkedId) => activeOrCreatedIds.has(linkedId));
  if (activeLinks.length === 0) {
    for (const linkedId of linkedRecords) {
      verdicts.push(fail(clock, "clock_intro_link_not_active", `${clockId}.linked_records entry ${linkedId} is neither parent-active nor same-event-created.`, { clock_id: clockId, linked_record: linkedId }));
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

function fail(clock: IndexedRecord, code: string, message: string, detail: Record<string, unknown>): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(clock),
    detail
  };
}

function bareNodeId(record: IndexedRecord): string {
  const parts = record.node_id.split(":");
  return parts.at(-1) ?? record.node_id;
}
