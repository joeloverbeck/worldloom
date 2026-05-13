import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  SnapshotReplayError,
  replayStateSnapshot,
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
    .filter((field) => stableJson(expected[field]) !== stableJson(got[field]))
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

function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right, "en-US"))
        .map(([key, nested]) => [key, sortJson(nested)])
    );
  }
  return value;
}
