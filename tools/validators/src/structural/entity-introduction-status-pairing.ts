import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { readSeIntroductions } from "./midstory-introduction-utils.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "entity_introduction_status_pairing";
const ENTITY_CREATE_OPS = new Set(["create_se_record", "create_pg_record", "create_stent_record", "create_ststat_record"]);

export const entityIntroductionStatusPairing: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => ENTITY_CREATE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:events|pages|entities|status)\/(?:SE|PG|STENT|STSTAT)-\d+\.yaml$/),
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
  const childPageId = stringValue(parsed.created_at_page);
  const childActive = activeRecordsForPage(childPageId, maps);
  const createdStatusRecords = [...createdIds]
    .filter((createdId) => createdId.startsWith("STSTAT-"))
    .map((statusId) => maps.byId.get(statusId))
    .filter((record): record is IndexedRecord => record !== undefined);

  const verdicts: Verdict[] = [];
  for (const createdId of introducedRecordIds(event, "STENT")) {
    const entity = maps.byId.get(createdId);
    const createdAtPage = entity === undefined ? childPageId : stringValue(asPlainRecord(entity.parsed).created_at_page);
    if (createdAtPage === "PG-1") {
      continue;
    }

    const pairedStatuses = createdStatusRecords.filter((status) => stringValue(asPlainRecord(status.parsed).entity) === createdId);
    const activePairedStatuses = pairedStatuses.filter((status) => childActive.status.has(bareNodeId(status)));
    const target = entity ?? event;

    if (!childActive.entities.has(createdId)) {
      verdicts.push(missingStatus(target, createdId, "Fresh STENT is absent from the child PG active_records.STENT list."));
    }
    if (pairedStatuses.length === 0) {
      verdicts.push(missingStatus(target, createdId, "Fresh STENT has no same-event STSTAT whose entity field points to it."));
      continue;
    }
    if (pairedStatuses.length > 1 || activePairedStatuses.length > 1) {
      verdicts.push(multipleStatus(target, createdId, pairedStatuses.map(bareNodeId)));
      continue;
    }
    const status = pairedStatuses[0];
    if (status === undefined || !childActive.status.has(bareNodeId(status))) {
      verdicts.push(missingStatus(target, createdId, "Fresh STENT's paired same-event STSTAT is absent from the child PG active_records.STSTAT list."));
    }
  }

  return verdicts;
}

function introducedRecordIds(event: IndexedRecord, recordClass: "STENT"): string[] {
  return readSeIntroductions(event)
    .filter((intro) => intro.class === recordClass)
    .map((intro) => intro.recordId);
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

function activeRecordsForPage(pageId: string | undefined, maps: RecordMaps): { entities: Set<string>; status: Set<string> } {
  if (pageId === undefined) {
    return { entities: new Set(), status: new Set() };
  }
  const page = maps.byId.get(pageId);
  const activeRecords = asPlainRecord(asPlainRecord(asPlainRecord(page?.parsed).state_snapshot).active_records);
  return {
    entities: new Set(stringArray(activeRecords.STENT)),
    status: new Set(stringArray(activeRecords.STSTAT))
  };
}

function missingStatus(record: IndexedRecord, entityId: string, reason: string): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "entity_intro_missing_status",
    message: `${entityId} was introduced mid-story without exactly one active same-event STSTAT status pair.`,
    location: locationFor(record),
    detail: { entity_id: entityId, reason },
    suggested_fix: `Create exactly one same-event STSTAT whose entity field is ${entityId}, and include both records in the child PG active_records map.`
  };
}

function multipleStatus(record: IndexedRecord, entityId: string, statusIds: string[]): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "entity_intro_multiple_active_status",
    message: `${entityId} was introduced mid-story with multiple same-event STSTAT status pairs.`,
    location: locationFor(record),
    detail: { entity_id: entityId, status_ids: statusIds },
    suggested_fix: `Keep exactly one same-event STSTAT whose entity field is ${entityId}; supersede later status changes in a later event.`
  };
}

function bareNodeId(record: IndexedRecord): string {
  const parts = record.node_id.split(":");
  return parts.at(-1) ?? record.node_id;
}
