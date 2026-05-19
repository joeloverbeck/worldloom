import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { readSeIntroductions } from "./midstory-introduction-utils.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "secret_introduction_anchor_integrity";
const SECRET_CREATE_OPS = new Set(["create_se_record", "create_pg_record", "create_stsec_record"]);
const SCHEMA_ALLOWED_HOLDER = /^(group:[A-Za-z0-9_-]+|narrator)$/;

export const secretIntroductionAnchorIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => SECRET_CREATE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:events|pages|secrets)\/(?:SE|PG|STSEC)-\d+\.yaml$/),
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
  const eventId = stringValue(parsed.id) ?? bareNodeId(event);
  activeOrCreated.add(eventId);
  for (const createdId of createdIds) {
    activeOrCreated.add(createdId);
  }

  const verdicts: Verdict[] = [];
  for (const createdId of introducedRecordIds(event, "STSEC")) {
    const secret = maps.byId.get(createdId);
    if (secret === undefined) {
      continue;
    }
    const createdAtPage = stringValue(asPlainRecord(secret.parsed).created_at_page);
    if (createdAtPage === "PG-1") {
      continue;
    }
    verdicts.push(...validateSecret(secret, activeOrCreated));
  }
  return verdicts;
}

function introducedRecordIds(event: IndexedRecord, recordClass: "STSEC"): string[] {
  return readSeIntroductions(event)
    .filter((intro) => intro.class === recordClass)
    .map((intro) => intro.recordId);
}

function validateSecret(secret: IndexedRecord, activeOrCreatedIds: Set<string>): Verdict[] {
  const parsed = asPlainRecord(secret.parsed);
  const secretId = stringValue(parsed.id) ?? bareNodeId(secret);
  const verdicts: Verdict[] = [];

  const sourceRecords = stringArray(parsed.source_records);
  if (sourceRecords.length === 0) {
    verdicts.push(fail(secret, "secret_intro_missing_source", `${secretId}.source_records must name at least one parent-active or same-event-created grounding record.`, { secret_id: secretId }));
  } else {
    for (const sourceRecord of sourceRecords) {
      if (!activeOrCreatedIds.has(sourceRecord)) {
        verdicts.push(fail(secret, "secret_intro_missing_source", `${secretId}.source_records entry ${sourceRecord} is neither parent-active nor same-event-created.`, { secret_id: secretId, source_record: sourceRecord }));
      }
    }
  }

  const protectedMysteryRefs = stringArray(parsed.protected_mystery_refs);
  const truthAnchor = parsed.truth_anchor;
  if (truthAnchor !== null && truthAnchor !== undefined) {
    const truthAnchorId = stringValue(truthAnchor);
    if (truthAnchorId === undefined || !activeOrCreatedIds.has(truthAnchorId)) {
      verdicts.push(fail(secret, "secret_intro_truth_anchor_missing", `${secretId}.truth_anchor ${truthAnchorId ?? "<invalid>"} is not parent-active or same-event-created.`, { secret_id: secretId, truth_anchor: truthAnchorId ?? null }));
    }
  } else if (protectedMysteryRefs.length === 0) {
    verdicts.push(fail(secret, "secret_intro_truth_anchor_missing", `${secretId}.truth_anchor may be null only when protected_mystery_refs records the Mystery Reserve boundary.`, { secret_id: secretId, truth_anchor: null }));
  }

  const holders = stringArray(parsed.holders);
  for (const holder of holders) {
    if (holder.startsWith("STENT-") && !activeOrCreatedIds.has(holder)) {
      verdicts.push(fail(secret, "secret_intro_holder_missing", `${secretId}.holders entry ${holder} is neither parent-active nor same-event-created.`, { secret_id: secretId, holder }));
    } else if (!holder.startsWith("STENT-") && !SCHEMA_ALLOWED_HOLDER.test(holder)) {
      verdicts.push(fail(secret, "secret_intro_holder_missing", `${secretId}.holders entry ${holder} is not a valid STENT id or schema-allowed holder label.`, { secret_id: secretId, holder }));
    }
  }

  const hasAnchor =
    holders.length > 0 ||
    clueCarrierCount(parsed.clue_carriers) > 0 ||
    stringValue(parsed.truth_anchor) !== undefined ||
    protectedMysteryRefs.length > 0;
  if (!hasAnchor) {
    verdicts.push(fail(secret, "secret_intro_holder_missing", `${secretId} must carry at least one holder, clue carrier, truth anchor, or protected mystery reference.`, { secret_id: secretId }));
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

function clueCarrierCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function fail(secret: IndexedRecord, code: string, message: string, detail: Record<string, unknown>): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(secret),
    detail
  };
}

function bareNodeId(record: IndexedRecord): string {
  const parts = record.node_id.split(":");
  return parts.at(-1) ?? record.node_id;
}
