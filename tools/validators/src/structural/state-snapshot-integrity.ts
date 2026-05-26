import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { allowedActiveStatuses, lifecycleStatus } from "../_helpers/lifecycle-status.js";
import { OPTIONAL_ACTIVE_RECORDS_CLASSES } from "../_helpers/state-snapshot-replay.js";
import {
  asPlainRecord,
  isPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringValue
} from "./utils.js";

const STORY_LOCAL_ID = /^(?:STENT|STCHAR|SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|DA|STSTAT|CLK|STSEC|STQ|STPLAN|STEMO|SLT|CHC|BR|PG)-\d+$/;
const MYSTERY_EVIDENCE_ID = /^(?:SF|BEL|DA|SE)-\d+$/;
const MYSTERY_EVIDENCE_REQUIRED_STATUSES = new Set([
  "clue_added",
  "narrowed",
  "apparent_resolution",
  "held_for_promotion"
]);
const AUDIT_ONLY_EVENT_KINDS = new Set([
  "story_start",
  "system_repair",
  "audit_repair",
  "prose_attach",
  "promotion_closeout"
]);
const NON_PLAYER_DRIVER_KINDS = new Set([
  "npc_action",
  "offstage_action",
  "world_pressure",
  "clock_fire",
  "secret_reveal",
  "multi_actor_collision"
]);
const PLAYER_DRIVER_KINDS = new Set(["player_action", "player_write_in"]);

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
      const rawActiveRecords = asPlainRecord(snapshot.active_records);
      const activeRecords = Object.keys(rawActiveRecords).length > 0
        ? normalizeOptionalActiveRecordKeys(rawActiveRecords)
        : rawActiveRecords;

      const inputLegalityViolation = validateInputLegality(page, parsed, pageLabel, maps);
      if (inputLegalityViolation !== undefined) {
        verdicts.push(inputLegalityViolation);
      }
      verdicts.push(...validateMysteryEvidence(page, snapshot, pageLabel, maps));

      if (Object.keys(activeRecords).length > 0) {
        if (!Array.isArray(activeRecords.STCHAR)) {
          verdicts.push(missingOrMalformed(page, pageLabel, "state_snapshot.active_records.STCHAR", "must be present as an array"));
        }
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
          const inactive = inactiveActiveRecordVerdict(page, pageLabel, reference, target);
          if (inactive !== undefined) {
            verdicts.push(inactive);
          }
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

function validateInputLegality(
  page: IndexedRecord,
  parsed: Record<string, unknown>,
  pageLabel: string,
  maps: RecordMaps
): Verdict | undefined {
  const input = asPlainRecord(parsed.input);
  const choiceId = input.choice_id;
  const manualActionText = input.manual_action_text;
  const resolvedEventId = stringValue(input.resolved_event_id);

  if (resolvedEventId === undefined) {
    return inputLegalityViolation(page, pageLabel, "<missing>", "<missing>", choiceId, manualActionText);
  }

  const resolvedEvent = maps.byId.get(resolvedEventId);
  const eventParsed = asPlainRecord(resolvedEvent?.parsed);
  const resolvedEventKind = stringValue(eventParsed.event_kind);
  if (resolvedEvent === undefined || resolvedEventKind === undefined) {
    return inputLegalityViolation(page, pageLabel, resolvedEventId, "<unresolved>", choiceId, manualActionText);
  }

  const hasChoice = choiceId !== null && choiceId !== undefined;
  const hasManualAction = manualActionText !== null && manualActionText !== undefined;

  if (AUDIT_ONLY_EVENT_KINDS.has(resolvedEventKind)) {
    if (!hasChoice && !hasManualAction) {
      return undefined;
    }
    return inputLegalityViolation(page, pageLabel, resolvedEventId, resolvedEventKind, choiceId, manualActionText);
  }

  if (resolvedEventKind === "turn_resolution") {
    const driverKind = stringValue(asPlainRecord(eventParsed.turn_driver).kind);
    if (driverKind !== undefined && NON_PLAYER_DRIVER_KINDS.has(driverKind)) {
      if (hasChoice && hasManualAction) {
        return inputLegalityViolation(page, pageLabel, resolvedEventId, resolvedEventKind, choiceId, manualActionText);
      }
      return undefined;
    }

    if (driverKind !== undefined && PLAYER_DRIVER_KINDS.has(driverKind)) {
      if (hasChoice !== hasManualAction) {
        return undefined;
      }
      return inputLegalityViolation(page, pageLabel, resolvedEventId, resolvedEventKind, choiceId, manualActionText);
    }
  }

  if (hasChoice !== hasManualAction) {
    return undefined;
  }

  return inputLegalityViolation(page, pageLabel, resolvedEventId, resolvedEventKind, choiceId, manualActionText);
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
    if (key === "evidence_records" && path.includes("unresolved_mystery_claims")) {
      continue;
    }
    if (STORY_LOCAL_ID.test(key)) {
      references.push({ id: key, path: `${path}.${key}` });
    }
    collectStoryLocalReferences(nested, `${path}.${key}`, references);
  }
}

function validateMysteryEvidence(
  page: IndexedRecord,
  snapshot: Record<string, unknown>,
  pageLabel: string,
  maps: RecordMaps
): Verdict[] {
  const verdicts: Verdict[] = [];
  const claims = Array.isArray(snapshot.unresolved_mystery_claims) ? snapshot.unresolved_mystery_claims : [];
  claims.forEach((claimValue, claimIndex) => {
    const claim = asPlainRecord(claimValue);
    const status = stringValue(claim.status);
    const evidenceRecords = Array.isArray(claim.evidence_records)
      ? claim.evidence_records.filter((id): id is string => typeof id === "string")
      : [];
    const path = `state_snapshot.unresolved_mystery_claims[${claimIndex}].evidence_records`;

    if (status !== undefined && MYSTERY_EVIDENCE_REQUIRED_STATUSES.has(status) && evidenceRecords.length === 0) {
      verdicts.push(mysteryEvidenceRequired(page, pageLabel, claim, status, path));
    }

    evidenceRecords.forEach((id, evidenceIndex) => {
      if (!MYSTERY_EVIDENCE_ID.test(id) || maps.byId.has(id)) {
        return;
      }
      verdicts.push(danglingReference(page, pageLabel, {
        id,
        path: `${path}[${evidenceIndex}]`
      }));
    });
  });
  return verdicts;
}

function inactiveActiveRecordVerdict(
  page: IndexedRecord,
  pageLabel: string,
  reference: StoryReference,
  target: IndexedRecord
): Verdict | undefined {
  const activeRecordMatch = reference.path.match(/^state_snapshot\.active_records\.(CLK|STSEC|STQ|STPLAN|STEMO)\[\d+\]$/);
  if (activeRecordMatch === null) {
    return undefined;
  }

  const parsed = asPlainRecord(target.parsed);
  const recordClass = activeRecordMatch[1]!;
  const status = lifecycleStatus(parsed, recordClass);
  const allowed = allowedActiveStatuses(recordClass);
  if (status !== undefined && allowed.has(status)) {
    return undefined;
  }

  return {
    validator: "state_snapshot_integrity",
    severity: "fail",
    code: "state_snapshot_integrity.inactive_active_record",
    message: `${pageLabel} state_snapshot active_records.${recordClass} lists ${reference.id} with inactive status ${status ?? "<missing>"}`,
    location: locationFor(page),
    detail: {
      reference_id: reference.id,
      reference_path: reference.path,
      status: status ?? null,
      allowed_statuses: [...allowed]
    },
    suggested_fix: `Remove ${reference.id} from ${pageLabel}.state_snapshot.active_records.${recordClass} or update its lifecycle status before submit.`
  };
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

function inputLegalityViolation(
  page: IndexedRecord,
  pageLabel: string,
  resolvedEventId: string,
  eventKind: string,
  choiceId: unknown,
  manualActionText: unknown
): Verdict {
  return {
    validator: "state_snapshot_integrity",
    severity: "fail",
    code: "state_snapshot_integrity.pg_input_legality_violation",
    message: `${pageLabel} input legality violation for resolved event ${resolvedEventId} (${eventKind}): choice_id=${formatInputState(choiceId)}, manual_action_text=${formatInputState(manualActionText)}`,
    location: locationFor(page),
    detail: {
      page_id: pageLabel,
      resolved_event_id: resolvedEventId,
      event_kind: eventKind,
      choice_id: choiceId ?? null,
      manual_action_text: manualActionText ?? null
    },
    suggested_fix: "Follow shared story state contract §4.2 input legality: story_start, audit-only events (system_repair, audit_repair, prose_attach, promotion_closeout), and turn_resolution events with non-player turn_driver.kind use both-null input fields; turn_resolution events with player_action / player_write_in driver kind use exactly one source action."
  };
}

function mysteryEvidenceRequired(
  page: IndexedRecord,
  pageLabel: string,
  claim: Record<string, unknown>,
  status: string,
  field: string
): Verdict {
  return {
    validator: "state_snapshot_integrity",
    severity: "fail",
    code: "state_snapshot_integrity.mystery_evidence_required",
    message: `${pageLabel} unresolved_mystery_claims entry for ${stringValue(claim.mystery_id) ?? "<unknown mystery>"} has status ${status} but no evidence_records`,
    location: locationFor(page),
    detail: {
      page_id: pageLabel,
      mystery_id: stringValue(claim.mystery_id) ?? null,
      status,
      field
    },
    suggested_fix: "Populate evidence_records with the story-local SF/BEL/DA/SE ids that caused this mystery claim to narrow, or use status: preserved when no evidence was added."
  };
}

function formatInputState(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  return JSON.stringify(value);
}

function pageId(page: Record<string, unknown>): string {
  return stringValue(page.id) ?? "<unknown page>";
}

function normalizeOptionalActiveRecordKeys(activeRecords: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...activeRecords };
  for (const cls of OPTIONAL_ACTIVE_RECORDS_CLASSES) {
    if (Array.isArray(normalized[cls])) {
      continue;
    }
    normalized[cls] = [];
  }
  return normalized;
}
