import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { readSeIntroductions } from "./midstory-introduction-utils.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "relationship_introduction_grounding_integrity";
const RELATIONSHIP_CREATE_OPS = new Set(["create_se_record", "create_pg_record", "create_srel_record", "create_stent_record"]);
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

export const relationshipIntroductionGroundingIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => RELATIONSHIP_CREATE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:events|pages|relationships|entities)\/(?:SE|PG|SREL|STENT)-\d+\.yaml$/),
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
  const activeOrCreatedEntities = activeEntitiesForPage(parentPageId, maps);
  const activeOrCreatedGroundingIds = activeIdsForPage(parentPageId, maps);
  activeOrCreatedGroundingIds.add(eventId);
  for (const createdId of createdIds) {
    if (createdId.startsWith("STENT-")) {
      activeOrCreatedEntities.add(createdId);
    }
    activeOrCreatedGroundingIds.add(createdId);
  }

  const verdicts: Verdict[] = [];
  for (const createdId of introducedRecordIds(event, "SREL")) {
    const relationship = maps.byId.get(createdId);
    if (relationship === undefined) {
      continue;
    }
    const createdAtPage = stringValue(asPlainRecord(relationship.parsed).created_at_page);
    if (createdAtPage === "PG-1") {
      continue;
    }
    verdicts.push(...validateRelationship(relationship, parentPageId, activeOrCreatedEntities, activeOrCreatedGroundingIds, maps));
  }

  return verdicts;
}

function introducedRecordIds(event: IndexedRecord, recordClass: "SREL"): string[] {
  return readSeIntroductions(event)
    .filter((intro) => intro.class === recordClass)
    .map((intro) => intro.recordId);
}

function validateRelationship(
  relationship: IndexedRecord,
  parentPageId: string | undefined,
  activeOrCreatedEntities: Set<string>,
  activeOrCreatedGroundingIds: Set<string>,
  maps: RecordMaps
): Verdict[] {
  const parsed = asPlainRecord(relationship.parsed);
  const relationshipId = stringValue(parsed.id) ?? bareNodeId(relationship);
  const participants = stringArray(parsed.participants);
  const derivedFrom = stringArray(parsed.derived_from);
  const verdicts: Verdict[] = [];

  for (const participantId of participants) {
    if (!activeOrCreatedEntities.has(participantId)) {
      verdicts.push(fail(relationship, "srel_intro_participant_inactive", `${relationshipId}.participants contains ${participantId}, which is not active in the parent PG and was not created in the same event.`, {
        relationship_id: relationshipId,
        participant_id: participantId
      }));
    }
  }

  if (derivedFrom.length === 0) {
    verdicts.push(fail(relationship, "srel_intro_missing_derived_from", `${relationshipId}.derived_from must name at least one present causal grounding record.`, {
      relationship_id: relationshipId
    }));
  }
  for (const groundingId of derivedFrom) {
    if (!isAllowedGroundingId(groundingId)) {
      verdicts.push(fail(relationship, "srel_intro_grounding_class_not_allowed", `${relationshipId}.derived_from entry ${groundingId} uses a disallowed grounding class for a fresh relationship introduction; use a present-causal record instead.`, {
        relationship_id: relationshipId,
        grounding_record: groundingId
      }));
    } else if (!activeOrCreatedGroundingIds.has(groundingId)) {
      verdicts.push(fail(relationship, "srel_intro_grounding_missing", `${relationshipId}.derived_from entry ${groundingId} is not parent-active or same-event-created.`, {
        relationship_id: relationshipId,
        grounding_record: groundingId
      }));
    }
  }

  const duplicate = activeRelationshipDuplicate(relationship, parentPageId, maps);
  if (duplicate !== undefined && stringValue(parsed.supersedes) !== duplicate) {
    verdicts.push({
      validator: VALIDATOR,
      severity: "fail",
      code: "srel_intro_duplicate_axis",
      message: `${relationshipId} duplicates active relationship ${duplicate} on the same participants, axis, and direction without superseding it.`,
      location: locationFor(relationship),
      detail: { relationship_id: relationshipId, duplicate_relationship_id: duplicate },
      suggested_fix: `Set ${relationshipId}.supersedes to ${duplicate}, choose a distinct axis/direction, or avoid creating a duplicate active SREL.`
    });
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

function activeEntitiesForPage(pageId: string | undefined, maps: RecordMaps): Set<string> {
  if (pageId === undefined) {
    return new Set();
  }
  const page = maps.byId.get(pageId);
  const activeRecords = asPlainRecord(asPlainRecord(asPlainRecord(page?.parsed).state_snapshot).active_records);
  return new Set(stringArray(activeRecords.STENT));
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

function activeRelationshipsForPage(pageId: string | undefined, maps: RecordMaps): IndexedRecord[] {
  if (pageId === undefined) {
    return [];
  }
  const page = maps.byId.get(pageId);
  const activeRecords = asPlainRecord(asPlainRecord(asPlainRecord(page?.parsed).state_snapshot).active_records);
  return stringArray(activeRecords.SREL)
    .map((id) => maps.byId.get(id))
    .filter((record): record is IndexedRecord => record !== undefined);
}

function activeRelationshipDuplicate(relationship: IndexedRecord, parentPageId: string | undefined, maps: RecordMaps): string | undefined {
  const parsed = asPlainRecord(relationship.parsed);
  const relationshipId = stringValue(parsed.id) ?? bareNodeId(relationship);
  const participantsKey = participantsIdentity(stringArray(parsed.participants));
  const axis = stringValue(parsed.axis);
  const directionKey = JSON.stringify(asPlainRecord(parsed.direction));

  for (const active of activeRelationshipsForPage(parentPageId, maps)) {
    const activeParsed = asPlainRecord(active.parsed);
    const activeId = stringValue(activeParsed.id) ?? bareNodeId(active);
    if (activeId === relationshipId) {
      continue;
    }
    if (
      stringValue(activeParsed.axis) === axis &&
      participantsIdentity(stringArray(activeParsed.participants)) === participantsKey &&
      JSON.stringify(asPlainRecord(activeParsed.direction)) === directionKey
    ) {
      return activeId;
    }
  }

  return undefined;
}

function participantsIdentity(participants: string[]): string {
  return [...participants].sort().join("|");
}

function isAllowedGroundingId(id: string): boolean {
  const prefix = id.split("-")[0];
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
