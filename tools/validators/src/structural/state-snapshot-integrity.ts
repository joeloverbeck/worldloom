import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  isPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringValue
} from "./utils.js";

const STORY_LOCAL_ID = /^(?:STENT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|DA|STSTAT|SLT|CHC|BR|PG)-\d+$/;

const ARRAY_FIELDS = [
  "objective_facts",
  "apparent_facts",
  "disputed_facts",
  "reader_known_facts",
  "rumor_state",
  "obligations_open",
  "obligations_paid_off",
  "obligations_complicated",
  "obligations_abandoned",
  "consequences_pending",
  "consequences_addressed",
  "threads_active",
  "relationships_current",
  "intentions_current",
  "cast_present",
  "accessible_locations",
  "objects_in_scope"
] as const;

const OBJECT_FIELDS = [
  "belief_state_by_actor",
  "inventory_by_entity",
  "entity_status"
] as const;

export const stateSnapshotIntegrity: Validator = {
  name: "state_snapshot_integrity",
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

      const snapshot = asPlainRecord(parsed.state_snapshot);
      const pageLabel = pageId(parsed);
      const maps = recordMapForStory(records, page.story_slug ?? null);
      const activeRecords = asPlainRecord(snapshot.active_records);

      if (Object.keys(activeRecords).length > 0) {
        for (const [recordClass, ids] of Object.entries(activeRecords)) {
          if (!Array.isArray(ids)) {
            verdicts.push(missingOrMalformed(page, pageLabel, `state_snapshot.active_records.${recordClass}`, "must be present as an array"));
          }
        }
      } else {
        for (const field of ARRAY_FIELDS) {
          if (!Array.isArray(snapshot[field])) {
            verdicts.push(missingOrMalformed(page, pageLabel, `state_snapshot.${field}`, "must be present as an array"));
          }
        }

        for (const field of OBJECT_FIELDS) {
          if (!isPlainRecord(snapshot[field])) {
            verdicts.push(missingOrMalformed(page, pageLabel, `state_snapshot.${field}`, "must be present as an object"));
          }
        }

        const currentLocation = stringValue(snapshot.current_location);
        if (currentLocation === undefined) {
          verdicts.push(missingOrMalformed(page, pageLabel, "state_snapshot.current_location", "must be a non-empty STLOC id"));
        }
      }

      for (const reference of storyLocalReferences(snapshot, "state_snapshot")) {
        const target = maps.byId.get(reference.id);
        if (target !== undefined) {
          continue;
        }
        if (maps.worldLevelIds.has(reference.id)) {
          continue;
        }
        verdicts.push(danglingReference(page, pageLabel, reference));
      }
    }

    return verdicts;
  }
};

interface StoryReference {
  id: string;
  path: string;
}

interface RecordMaps {
  byId: Map<string, IndexedRecord>;
  worldLevelIds: Set<string>;
}

function recordMapForStory(records: readonly IndexedRecord[], storySlug: string | null): RecordMaps {
  const byId = new Map<string, IndexedRecord>();
  const worldLevelIds = new Set<string>();

  for (const record of records) {
    const parsed = asPlainRecord(record.parsed);
    const id = stringValue(parsed.id);
    if ((record.story_slug ?? null) !== storySlug) {
      if ((record.story_slug ?? null) === null && id !== undefined) {
        worldLevelIds.add(id);
      }
      continue;
    }
    byId.set(record.node_id, record);
    if (id !== undefined) {
      byId.set(id, record);
    }
  }

  return { byId, worldLevelIds };
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

function storyLocalReferences(value: unknown, basePath: string): StoryReference[] {
  const references: StoryReference[] = [];
  collectStoryLocalReferences(value, basePath, references);
  return references;
}

function collectStoryLocalReferences(value: unknown, path: string, references: StoryReference[]): void {
  if (typeof value === "string") {
    if (STORY_LOCAL_ID.test(value)) {
      references.push({ id: value, path });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStoryLocalReferences(item, `${path}[${index}]`, references));
    return;
  }

  if (!isPlainRecord(value)) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (STORY_LOCAL_ID.test(key)) {
      references.push({ id: key, path: `${path}.${key}` });
    }
    collectStoryLocalReferences(nested, `${path}.${key}`, references);
  }
}

function missingOrMalformed(page: IndexedRecord, pageLabel: string, field: string, reason: string): Verdict {
  return {
    validator: "state_snapshot_integrity",
    severity: "fail",
    code: "state_snapshot_integrity.missing_required_field",
    message: `${pageLabel} ${field} ${reason}`,
    location: locationFor(page),
    detail: { field },
    suggested_fix: `Populate ${field} on ${pageLabel}'s state_snapshot before submit.`
  };
}

function danglingReference(page: IndexedRecord, pageLabel: string, reference: StoryReference): Verdict {
  return {
    validator: "state_snapshot_integrity",
    severity: "fail",
    code: "state_snapshot_integrity.dangling_reference",
    message: `${pageLabel} state_snapshot cites missing story-local record ${reference.id} via ${reference.path}`,
    location: locationFor(page),
    detail: {
      reference_id: reference.id,
      reference_path: reference.path
    },
    suggested_fix: `Create ${reference.id} in the same story scope or remove it from ${reference.path}.`
  };
}

function pageId(page: Record<string, unknown>): string {
  return stringValue(page.id) ?? "<unknown page>";
}
