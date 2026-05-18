import { canonicalJsonStringify, computePgStateHash } from "@worldloom/world-index/hash/content";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  ACTIVE_RECORDS_CLASSES,
  OPTIONAL_ACTIVE_RECORDS_CLASSES,
  SnapshotReplayError,
  replayUnresolvedMysteryClaims,
  replayActiveRecords,
  replayStateSnapshot,
  type StateDelta,
  type StateSnapshot,
  type StoryEventOp
} from "../_helpers/state-snapshot-replay.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue
} from "./utils.js";

export const snapshotReplayEquality: Validator = {
  name: "snapshot_replay_equality",
  severity_mode: "fail",
  applies_to: (ctx: Context) => ctx.patch_plan?.patches.some((patch) => patch.op === "create_pg_record") === true,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const page of records.filter((record) => record.node_type === "page_record")) {
      const parsed = asPlainRecord(page.parsed);
      if (!isCreatedPageInPlan(parsed, ctx)) {
        continue;
      }

      const parentPageId = stringValue(parsed.parent_page_id);
      if (parentPageId === undefined) {
        continue;
      }

      const recordMap = recordMapForStory(records, page.story_slug ?? null);
      const parent = recordMap.byId.get(parentPageId);
      if (parent === undefined) {
        verdicts.push(fail(page, "snapshot_replay_equality.parent_missing", `${pageId(parsed)} cites missing parent_page_id ${parentPageId}`));
        continue;
      }

      // Schema discrimination: legacy pages carry applied_event_ops + SE.ops with
      // op_type vocabulary; new-schema pages (story state contract §4.3) carry
      // input.resolved_event_id + SE.state_delta.{create,supersede,close}, and
      // their state_snapshot.active_records is the replay surface. The two
      // schemas are mutually exclusive in their event-link shape.
      if (parsed.applied_event_ops === undefined) {
        verdicts.push(...runNewSchemaReplay(page, parsed, parent, recordMap.byId));
        continue;
      }

      const eventRecords = stringArray(parsed.applied_event_ops).map((eventId) => recordMap.byId.get(eventId));
      const missingEventIds = stringArray(parsed.applied_event_ops).filter((eventId, index) => eventRecords[index] === undefined);
      for (const missingEventId of missingEventIds) {
        verdicts.push(fail(page, "snapshot_replay_equality.event_missing", `${pageId(parsed)} cites missing applied_event_ops entry ${missingEventId}`));
      }
      if (missingEventIds.length > 0) {
        continue;
      }

      const ops = eventRecords.flatMap((record) => storyEventOps(record));
      let expected: StateSnapshot;
      try {
        expected = replayStateSnapshot(asPlainRecord(parent.state_snapshot), ops, recordMap.byId);
      } catch (err) {
        verdicts.push(replayErrorVerdict(page, err));
        continue;
      }

      const got = asPlainRecord(parsed.state_snapshot);
      const drifts = snapshotDrifts(expected, got);
      if (drifts.length > 0) {
        verdicts.push({
          validator: "snapshot_replay_equality",
          severity: "fail",
          code: "snapshot_replay_equality.snapshot_drift",
          message: `${pageId(parsed)} state_snapshot does not match replayed parent snapshot and applied_event_ops`,
          location: locationFor(page),
          detail: { drifts },
          suggested_fix: `Recompute ${pageId(parsed)} state_snapshot from parent ${parentPageId} and the cited SE ops.`
        });
      }

      const lastEvent = eventRecords.at(-1);
      const expectedHash = stringValue(lastEvent?.state_hash_after);
      const gotHash = stringValue(parsed.state_hash);
      if (expectedHash !== undefined && gotHash !== expectedHash) {
        verdicts.push({
          validator: "snapshot_replay_equality",
          severity: "fail",
          code: "snapshot_replay_equality.state_hash_mismatch",
          message: `${pageId(parsed)} state_hash ${gotHash ?? "<missing>"} does not match last SE state_hash_after ${expectedHash}`,
          location: locationFor(page),
          suggested_fix: `Set ${pageId(parsed)} state_hash to the final applied event's state_hash_after.`
        });
      }

    }

    return verdicts;
  }
};

interface RecordMaps {
  byId: Map<string, Record<string, unknown>>;
}

function recordMapForStory(records: readonly IndexedRecord[], storySlug: string | null): RecordMaps {
  const byId = new Map<string, Record<string, unknown>>();
  for (const record of records.filter((candidate) => (candidate.story_slug ?? null) === storySlug)) {
    const parsed = asPlainRecord(record.parsed);
    byId.set(record.node_id, parsed);
    const id = stringValue(parsed.id);
    if (id !== undefined) {
      byId.set(id, parsed);
    }
  }
  return { byId };
}

function isCreatedPageInPlan(page: Record<string, unknown>, ctx: Context): boolean {
  const pageIdValue = stringValue(page.id);
  if (pageIdValue === undefined) {
    return false;
  }
  return ctx.patch_plan?.patches.some((patch) => {
    if (patch.op !== "create_pg_record") {
      return false;
    }
    const payload = patch.payload as { record?: unknown };
    return stringValue(asPlainRecord(payload.record).id) === pageIdValue;
  }) === true;
}

function storyEventOps(value: unknown): StoryEventOp[] {
  const ops = asPlainRecord(value).ops;
  return Array.isArray(ops) ? ops.filter((op): op is StoryEventOp => typeof op === "object" && op !== null && !Array.isArray(op)) : [];
}

function replayErrorVerdict(page: IndexedRecord, err: unknown): Verdict {
  if (err instanceof SnapshotReplayError) {
    return fail(page, err.code, err.message);
  }
  return fail(page, "snapshot_replay_equality.replay_error", err instanceof Error ? err.message : String(err));
}

// Fields stamped onto state_snapshot by Phase-level workflow logic rather than
// by replayable SE.ops.
const POST_REPLAY_STAMPED_FIELDS: ReadonlySet<string> = new Set([
  "applied_effect_variant"
]);

function snapshotDrifts(expected: StateSnapshot, got: StateSnapshot): Array<{ field: string; expected: unknown; got: unknown }> {
  const fields = [...new Set([...Object.keys(expected), ...Object.keys(got)])].sort();
  return fields
    .filter((field) => !POST_REPLAY_STAMPED_FIELDS.has(field))
    .filter((field) => canonicalJsonStringify(expected[field]) !== canonicalJsonStringify(got[field]))
    .map((field) => ({ field, expected: expected[field], got: got[field] }));
}

function fail(page: IndexedRecord, code: string, message: string): Verdict {
  return {
    validator: "snapshot_replay_equality",
    severity: "fail",
    code,
    message,
    location: locationFor(page)
  };
}

function pageId(parsed: Record<string, unknown>): string {
  return stringValue(parsed.id) ?? "<unknown page>";
}

// New-schema (story state contract §4.3) replay: SE.state_delta against parent's
// state_snapshot.active_records. entity_status is derived from the replayed
// active STSTAT set; unresolved_mystery_claims are compared on
// (mystery_id, authority, status, evidence_records) lineage while in-page
// derivation beyond those fields remains page-local. Only genuinely
// page-local workflow-stamped fields (visible_affordances, continuation) are
// excluded.
function runNewSchemaReplay(
  page: IndexedRecord,
  parsed: Record<string, unknown>,
  parent: Record<string, unknown>,
  byId: ReadonlyMap<string, Record<string, unknown>>
): Verdict[] {
  const input = asPlainRecord(parsed.input);
  const resolvedEventId = stringValue(input.resolved_event_id);
  if (resolvedEventId === undefined) {
    return [
      fail(
        page,
        "snapshot_replay_equality.event_missing",
        `${pageId(parsed)} lacks both applied_event_ops (legacy) and input.resolved_event_id (new schema); no event is bound for replay.`
      )
    ];
  }

  const event = byId.get(resolvedEventId);
  if (event === undefined) {
    return [
      fail(
        page,
        "snapshot_replay_equality.event_missing",
        `${pageId(parsed)} input.resolved_event_id ${resolvedEventId} is not present in story records.`
      )
    ];
  }

  const stateDelta = asPlainRecord(event.state_delta);
  const delta: StateDelta = {
    create: stringArray(stateDelta.create),
    supersede: stringArray(stateDelta.supersede),
    close: stringArray(stateDelta.close)
  };

  const parentSnapshot = asPlainRecord(parent.state_snapshot);
  const parentActive = normalizeOptionalActiveRecordKeys(asPlainRecord(parentSnapshot.active_records));
  const expectedActive = replayActiveRecords(parentActive, delta);
  const expectedEntityStatus = deriveEntityStatus(expectedActive.STSTAT, byId);
  const gotSnapshot = asPlainRecord(parsed.state_snapshot);
  const mysteryClaimsReplay = replayUnresolvedMysteryClaims(
    parentSnapshot.unresolved_mystery_claims,
    gotSnapshot.unresolved_mystery_claims,
    mysteryEvidenceRecordsForEvent(resolvedEventId, delta)
  );

  const gotActive = asPlainRecord(gotSnapshot.active_records);

  const drifts: Array<{ field: string; expected: unknown; got: unknown }> = [];
  for (const cls of ACTIVE_RECORDS_CLASSES) {
    const expectedList = expectedActive[cls];
    const gotListRaw = gotActive[cls];
    const gotList = Array.isArray(gotListRaw)
      ? gotListRaw.filter((item): item is string => typeof item === "string")
      : [];
    const expectedSorted = [...expectedList].sort();
    const gotSorted = [...gotList].sort();
    if (canonicalJsonStringify(expectedSorted) !== canonicalJsonStringify(gotSorted)) {
      drifts.push({
        field: `active_records.${cls}`,
        expected: expectedList,
        got: gotList
      });
    }
  }
  const gotEntityStatus = asPlainRecord(gotSnapshot.entity_status);
  if (canonicalJsonStringify(expectedEntityStatus) !== canonicalJsonStringify(gotEntityStatus)) {
    drifts.push({
      field: "entity_status",
      expected: expectedEntityStatus,
      got: gotEntityStatus
    });
  }
  drifts.push(...mysteryClaimsReplay.drifts);

  const verdicts: Verdict[] = [];
  if (drifts.length > 0) {
    verdicts.push({
      validator: "snapshot_replay_equality",
      severity: "fail",
      code: "snapshot_replay_equality.snapshot_drift",
      message: `${pageId(parsed)} state_snapshot.active_records does not match parent.active_records + SE.state_delta`,
      location: locationFor(page),
      detail: { drifts },
      suggested_fix: `Recompute ${pageId(parsed)} state_snapshot.active_records by applying ${resolvedEventId}.state_delta (create/supersede/close) to the parent page's active_records.`
    });
  }

  // state_hash equality: re-derive the canonical hash from the on-disk record
  // and compare against the stored state_hash. Catches authoring errors where
  // the skill computed the hash against a slightly-different draft (truncated
  // strings in validation_trace, missing fields, locale-sensitive key order)
  // before submitting. Shared canonical-JSON helpers from
  // @worldloom/world-index/hash/content are the same utilities the
  // compute-pg-hashes CLI uses, so authoring-time and validation-time hashes
  // are byte-identical by construction.
  const declaredStateHash = stringValue(parsed.state_hash);
  if (declaredStateHash !== undefined) {
    const recomputed = computePgStateHash(parsed);
    if (recomputed !== declaredStateHash) {
      verdicts.push({
        validator: "snapshot_replay_equality",
        severity: "fail",
        code: "snapshot_replay_equality.state_hash_mismatch",
        message: `${pageId(parsed)} state_hash ${declaredStateHash} does not match the canonical sha256 of its fork-state payload (${recomputed}); the authoring skill computed the hash against a draft that differed from the submitted record.`,
        location: locationFor(page),
        suggested_fix: `Recompute ${pageId(parsed)} state_hash using tools/world-mcp/dist/src/cli/compute-pg-hashes.js against the final draft bytes (page plan + PG record) and re-stamp the value before validation.`
      });
    }
  }

  return verdicts;
}

function normalizeOptionalActiveRecordKeys(activeRecords: Record<string, unknown>): Record<string, readonly string[]> {
  const normalized: Record<string, readonly string[]> = { ...activeRecords } as Record<string, readonly string[]>;
  for (const cls of OPTIONAL_ACTIVE_RECORDS_CLASSES) {
    if (Array.isArray(normalized[cls])) {
      continue;
    }
    normalized[cls] = [];
  }
  return normalized;
}

function mysteryEvidenceRecordsForEvent(resolvedEventId: string, delta: StateDelta): string[] {
  const evidenceIds = new Set<string>([resolvedEventId]);
  for (const id of delta.create ?? []) {
    if (/^(?:SF|BEL|DA|SE)-[0-9]+$/.test(id)) {
      evidenceIds.add(id);
    }
  }
  return [...evidenceIds];
}

function deriveEntityStatus(
  activeStatusIds: readonly string[],
  byId: ReadonlyMap<string, Record<string, unknown>>
): Record<string, { life: string; agency: string; location: string }> {
  const statusByEntity: Record<string, { life: string; agency: string; location: string }> = {};
  for (const statusId of activeStatusIds) {
    const statusRecord = byId.get(statusId);
    if (statusRecord === undefined) {
      continue;
    }
    const entity = stringValue(statusRecord.entity);
    const life = stringValue(statusRecord.life);
    const agency = stringValue(statusRecord.agency);
    const location = stringValue(statusRecord.location);
    if (entity === undefined || life === undefined || agency === undefined || location === undefined) {
      continue;
    }
    statusByEntity[entity] = { life, agency, location };
  }
  return statusByEntity;
}
