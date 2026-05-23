import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "turn_driver_schema_compliance";

const TURN_DRIVER_KINDS = new Set([
  "player_action",
  "player_write_in",
  "npc_action",
  "offstage_action",
  "world_pressure",
  "clock_fire",
  "secret_reveal",
  "multi_actor_collision"
]);

const NON_PLAYER_KINDS = new Set([
  "npc_action",
  "offstage_action",
  "world_pressure",
  "clock_fire",
  "secret_reveal",
  "multi_actor_collision"
]);

const DRIVER_CLASS_BY_TYPE: Readonly<Record<string, string>> = {
  story_plan_record: "STPLAN",
  story_emotion_record: "STEMO",
  pressure_clock_record: "CLK",
  thread_record: "THR",
  story_secret_record: "STSEC",
  story_question_record: "STQ",
  obligation_record: "OBL",
  consequence_record: "CNSQ",
  relationship_record_story: "SREL",
  story_character_authority_record: "STCHAR"
};

const PLAYER_KINDS = new Set(["player_action", "player_write_in"]);
const STENT_ID = /^STENT-\d+$/;

export const turnDriverSchemaCompliance: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some(isStoryEventOrPagePatch)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/_source\/(?:events\/SE-\d+|pages\/PG-\d+)\.yaml$|(?:^|\/)_source\/(?:events\/SE-\d+|pages\/PG-\d+)\.yaml$/)),
  skip_reason: "turn-driver story event/page surfaces only",
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const maps = recordMaps(records);
    const verdicts: Verdict[] = [];

    for (const event of maps.byType.get("story_event_record") ?? []) {
      verdicts.push(...validateEvent(event, maps));
    }

    return verdicts;
  }
};

interface RecordMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

function isStoryEventOrPagePatch(patch: { op: string }): boolean {
  return patch.op === "create_se_record" || patch.op === "create_pg_record";
}

function recordMaps(records: readonly IndexedRecord[]): RecordMaps {
  const byId = new Map<string, IndexedRecord>();
  const byType = new Map<string, IndexedRecord[]>();

  for (const record of records) {
    byId.set(recordId(record), record);
    byType.set(record.node_type, [...(byType.get(record.node_type) ?? []), record]);
  }

  return { byId, byType };
}

function validateEvent(event: IndexedRecord, maps: RecordMaps): Verdict[] {
  const parsed = asPlainRecord(event.parsed);
  if (stringValue(parsed.event_kind) !== "turn_resolution") {
    return [];
  }

  const turnDriver = asPlainRecord(parsed.turn_driver);
  if (Object.keys(turnDriver).length === 0) {
    return [eventVerdict(event, "turn_driver_missing", `${recordId(event)} is a turn_resolution event but has no turn_driver object.`)];
  }

  const kind = stringValue(turnDriver.kind);
  if (kind === undefined || !TURN_DRIVER_KINDS.has(kind)) {
    return [eventVerdict(event, "turn_driver_kind_invalid", `${recordId(event)} has invalid turn_driver.kind ${kind ?? "<missing>"}.`, { kind })];
  }

  const parentPage = maps.byId.get(stringValue(parsed.parent_page_id) ?? "");
  const activeRecords = activeRecordIds(parentPage);
  const driverRecords = stringArray(turnDriver.driver_records);
  const verdicts: Verdict[] = [];

  verdicts.push(...validateKindConstraints(event, kind, turnDriver, driverRecords, maps));

  for (const driverRecord of driverRecords) {
    if (!activeRecords.has(driverRecord)) {
      verdicts.push(eventVerdict(event, "turn_driver_driver_record_inactive", `${recordId(event)} cites inactive driver record ${driverRecord}.`, {
        event_id: recordId(event),
        driver_record: driverRecord,
        parent_page_id: stringValue(parsed.parent_page_id)
      }));
    }
  }

  return verdicts;
}

function validateKindConstraints(
  event: IndexedRecord,
  kind: string,
  turnDriver: Record<string, unknown>,
  driverRecords: readonly string[],
  maps: RecordMaps
): Verdict[] {
  const initiator = stringValue(turnDriver.initiator);
  const playerResponseMode = stringValue(turnDriver.player_response_mode);
  const povVisibility = stringValue(turnDriver.pov_visibility);
  const verdicts: Verdict[] = [];

  if (PLAYER_KINDS.has(kind)) {
    if (initiator !== "player" || playerResponseMode !== "initiates" || povVisibility !== "perceived_directly") {
      verdicts.push(eventVerdict(event, "turn_driver_initiator_pattern_violation", `${recordId(event)} has invalid player turn_driver fields for ${kind}.`, {
        event_id: recordId(event),
        kind,
        initiator,
        player_response_mode: playerResponseMode,
        pov_visibility: povVisibility
      }));
    }
    if (driverRecords.length > 0) {
      verdicts.push(eventVerdict(event, "turn_driver_player_kind_with_driver_records", `${recordId(event)} uses ${kind} with non-empty driver_records.`, {
        event_id: recordId(event),
        kind,
        driver_records: driverRecords
      }));
    }
    return verdicts;
  }

  if (NON_PLAYER_KINDS.has(kind) && driverRecords.length === 0) {
    verdicts.push(eventVerdict(event, "turn_driver_driver_records_empty_for_non_player", `${recordId(event)} uses non-player ${kind} with empty driver_records.`, {
      event_id: recordId(event),
      kind
    }));
  }

  if (kind === "npc_action" && (!isStent(initiator) || !hasAnyClass(driverRecords, ["STPLAN", "STEMO", "CLK", "THR", "STCHAR"]))) {
    verdicts.push(initiatorPatternVerdict(event, kind, initiator, driverRecords));
  }
  if (kind === "offstage_action") {
    if (!isStent(initiator)) {
      verdicts.push(initiatorPatternVerdict(event, kind, initiator, driverRecords));
    }
    if (povVisibility === "perceived_directly") {
      verdicts.push(eventVerdict(event, "turn_driver_offstage_perceived_directly", `${recordId(event)} uses offstage_action with pov_visibility perceived_directly.`, {
        event_id: recordId(event),
        kind,
        pov_visibility: povVisibility
      }));
    }
  }
  if (kind === "clock_fire" && ((initiator !== "world" && initiator !== "system") || !hasAnyClass(driverRecords, ["CLK"]))) {
    verdicts.push(initiatorPatternVerdict(event, kind, initiator, driverRecords));
  }
  if (kind === "world_pressure" && initiator !== "world") {
    verdicts.push(initiatorPatternVerdict(event, kind, initiator, driverRecords));
  }
  if (kind === "secret_reveal" && !hasAnyClass(driverRecords, ["STSEC"])) {
    verdicts.push(initiatorPatternVerdict(event, kind, initiator, driverRecords));
  }
  if (kind === "multi_actor_collision" && (initiator !== "unknown" || distinctDriverActors(driverRecords, maps).size < 2)) {
    verdicts.push(initiatorPatternVerdict(event, kind, initiator, driverRecords));
  }

  return verdicts;
}

function activeRecordIds(page: IndexedRecord | undefined): Set<string> {
  const activeRecords = asPlainRecord(asPlainRecord(page?.parsed).state_snapshot).active_records;
  const ids = new Set<string>();

  for (const value of Object.values(asPlainRecord(activeRecords))) {
    for (const id of stringArray(value)) {
      ids.add(id);
    }
  }

  return ids;
}

function hasAnyClass(recordIds: readonly string[], classes: readonly string[]): boolean {
  return recordIds.some((recordId) => classes.includes(recordClass(recordId)));
}

function distinctDriverActors(recordIds: readonly string[], maps: RecordMaps): Set<string> {
  const actors = new Set<string>();
  for (const id of recordIds) {
    const owner = ownerStent(maps.byId.get(id));
    if (owner !== undefined) {
      actors.add(owner);
    }
  }
  return actors;
}

function ownerStent(record: IndexedRecord | undefined): string | undefined {
  const parsed = asPlainRecord(record?.parsed);
  for (const key of ["holder", "actor", "subject", "entity_id", "stent_id"]) {
    const value = stringValue(parsed[key]);
    if (isStent(value)) {
      return value;
    }
  }
  const direction = asPlainRecord(parsed.direction);
  const from = stringValue(direction.from);
  const to = stringValue(direction.to);
  if (isStent(from)) {
    return from;
  }
  if (isStent(to)) {
    return to;
  }
  return undefined;
}

function recordId(record: IndexedRecord): string {
  return stringValue(asPlainRecord(record.parsed).id) ?? record.node_id.split(":").at(-1) ?? record.node_id;
}

function recordClass(recordId: string): string {
  return recordId.split("-")[0] ?? "";
}

function isStent(value: string | undefined): value is string {
  return value !== undefined && STENT_ID.test(value);
}

function initiatorPatternVerdict(
  event: IndexedRecord,
  kind: string,
  initiator: string | undefined,
  driverRecords: readonly string[]
): Verdict {
  return eventVerdict(event, "turn_driver_initiator_pattern_violation", `${recordId(event)} has invalid turn_driver initiator or required record pattern for ${kind}.`, {
    event_id: recordId(event),
    kind,
    initiator,
    driver_records: driverRecords
  });
}

function eventVerdict(event: IndexedRecord, code: string, message: string, detail?: unknown): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(event),
    detail
  };
}
