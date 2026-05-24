import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "turn_cycle_output_grounding_integrity";
const TARGET_CLASSES = new Set(["CNSQ", "SF", "DA"]);
const PLAYER_DRIVER_KINDS = new Set(["player_action", "player_write_in"]);
const NON_PLAYER_RESPONSE_MODES = new Set(["responds", "witnesses", "chooses_continuation"]);
const EVENT_CREATE_OPS = new Set(["create_se_record", "create_pg_record"]);
const ALLOWED_GROUNDING_PREFIXES = new Set([
  "SE",
  "SF",
  "BEL",
  "OBL",
  "CNSQ",
  "STINT",
  "SREL",
  "DA",
  "CLK",
  "STSEC",
  "STQ",
  "STSTAT",
  "STPLAN",
  "STEMO"
]);

export const turnCycleOutputGroundingIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => EVENT_CREATE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:events|pages|choices|consequences|facts|artifacts)\/(?:SE|PG|CHC|CNSQ|SF|DA)-\d+\.yaml$/),
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
  const childPageId = stringValue(parsed.created_at_page);
  const eventId = stringValue(parsed.id) ?? bareNodeId(event);

  if (parentPageId === undefined || childPageId === undefined || childPageId === "PG-1" || stringValue(parsed.event_kind) === "story_start") {
    return [];
  }

  const activeOrCreatedIds = activeIdsForPage(parentPageId, maps);
  activeOrCreatedIds.add(eventId);
  for (const createdId of createdIds) {
    activeOrCreatedIds.add(createdId);
  }

  const verdicts: Verdict[] = [];
  for (const createdId of createdIds) {
    if (!TARGET_CLASSES.has(recordClassForId(createdId) ?? "")) {
      continue;
    }
    const record = maps.byId.get(createdId);
    if (record === undefined) {
      continue;
    }
    verdicts.push(...validateCreatedOutput(record, activeOrCreatedIds));
  }
  verdicts.push(...validateResponseChoiceGrounding(event, parsed, createdIds, maps));
  return verdicts;
}

function validateCreatedOutput(record: IndexedRecord, activeOrCreatedIds: Set<string>): Verdict[] {
  const parsed = asPlainRecord(record.parsed);
  const recordId = stringValue(parsed.id) ?? bareNodeId(record);
  const derivedFrom = stringArray(parsed.derived_from);
  const verdicts: Verdict[] = [];

  if (derivedFrom.length === 0) {
    verdicts.push(fail(record, "turn_cycle_output_missing_derived_from", `${recordId}.derived_from must name at least one parent-active or same-event-created grounding record.`, {
      record_id: recordId
    }));
    return verdicts;
  }

  for (const groundingId of derivedFrom) {
    if (!isAllowedGroundingId(groundingId) || !activeOrCreatedIds.has(groundingId)) {
      verdicts.push(fail(record, "turn_cycle_output_grounding_missing", `${recordId}.derived_from entry ${groundingId} is not an allowed parent-active or same-event-created grounding record.`, {
        record_id: recordId,
        grounding_record: groundingId
      }));
    }
  }

  return verdicts;
}

function validateResponseChoiceGrounding(
  event: IndexedRecord,
  parsedEvent: Record<string, unknown>,
  createdIds: ReadonlySet<string>,
  maps: RecordMaps
): Verdict[] {
  const turnDriver = asPlainRecord(parsedEvent.turn_driver);
  const driverKind = stringValue(turnDriver.kind);
  const responseMode = stringValue(turnDriver.player_response_mode);
  const driverRecords = new Set(stringArray(turnDriver.driver_records));
  if (driverKind === undefined || PLAYER_DRIVER_KINDS.has(driverKind) || driverRecords.size === 0) {
    return [];
  }

  const verdicts: Verdict[] = [];
  if (!NON_PLAYER_RESPONSE_MODES.has(responseMode ?? "")) {
    verdicts.push(fail(event, "turn_driver_response_mode_invalid", `${stringValue(parsedEvent.id) ?? bareNodeId(event)} has invalid turn_driver.player_response_mode ${responseMode ?? "<missing>"} for non-player driver ${driverKind}.`, {
      event_id: stringValue(parsedEvent.id) ?? bareNodeId(event),
      driver_kind: driverKind,
      player_response_mode: responseMode,
      allowed_response_modes: [...NON_PLAYER_RESPONSE_MODES].sort()
    }));
    return verdicts;
  }
  if (responseMode !== "responds") {
    return verdicts;
  }

  for (const createdId of createdIds) {
    if (recordClassForId(createdId) !== "CHC") {
      continue;
    }
    const choice = maps.byId.get(createdId);
    if (choice === undefined) {
      continue;
    }
    const parsedChoice = asPlainRecord(choice.parsed);
    const groundedRecords = new Set(stringArray(asPlainRecord(parsedChoice.grounded_in).records));
    if (!hasIntersection(groundedRecords, driverRecords)) {
      verdicts.push(fail(choice, "chc_response_topical_grounding_missing", `${createdId} responds to ${stringValue(parsedEvent.id) ?? bareNodeId(event)} but grounds in no turn_driver.driver_records entry.`, {
        choice_id: createdId,
        event_id: stringValue(parsedEvent.id) ?? bareNodeId(event),
        driver_records: [...driverRecords].sort(),
        grounded_records: [...groundedRecords].sort()
      }));
    }
  }
  return verdicts;
}

function hasIntersection(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  for (const value of left) {
    if (right.has(value)) {
      return true;
    }
  }
  return false;
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

function recordClassForId(id: string): string | undefined {
  return id.split("-")[0];
}

function isAllowedGroundingId(id: string): boolean {
  const prefix = recordClassForId(id);
  return prefix !== undefined && ALLOWED_GROUNDING_PREFIXES.has(prefix);
}

function fail(record: IndexedRecord, code: string, message: string, detail: Record<string, unknown>): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(record),
    detail
  };
}

function bareNodeId(record: IndexedRecord): string {
  const parts = record.node_id.split(":");
  return parts.at(-1) ?? record.node_id;
}
