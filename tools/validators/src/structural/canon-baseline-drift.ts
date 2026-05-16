import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

const CLASSIFICATION_VALUES = [
  "compatible",
  "grandfathered",
  "requires_health_audit",
  "requires_repair_turn",
  "promotion_or_retcon_conflict"
] as const;

const CLASSIFICATION_VALUE_SET = new Set<string>(CLASSIFICATION_VALUES);
const CLASSIFICATION_PATTERN = new RegExp(`\\b(${CLASSIFICATION_VALUES.join("|")})\\b`, "i");
const CH_ID_PATTERN = /\bCH-\d+\b/g;

// FOUNDATIONS §Story Bundles §4b and §7 gate 2 require full canon-baseline
// drift classification before a page proceeds from a stale canon_revision.
export const canonBaselineDrift: Validator = {
  name: "canon_baseline_drift",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_pg_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/pages\/PG-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const changes = changeRecords(records);
    const latestCh = latestChangeId(changes.map((change) => change.id));
    if (!latestCh) {
      return [];
    }

    const factsByStory = storyFactMaps(records);
    const eventTextByStory = storyEventTextMaps(records);
    const verdicts: Verdict[] = [];

    for (const page of records.filter((record) => record.node_type === "page_record")) {
      const parsed = asPlainRecord(page.parsed);
      const snapshot = asPlainRecord(parsed.state_snapshot);
      const baseline = stringValue(snapshot.canon_revision);
      if (!baseline || baseline === latestCh) {
        continue;
      }

      const windowIds = changeWindow(changes.map((change) => change.id), baseline, latestCh);
      if (windowIds.length === 0) {
        continue;
      }

      const classification = driftClassification(parsed, eventsForPage(page, eventTextByStory));
      if (!classification.text) {
        verdicts.push(unclassifiedVerdict(page, baseline, latestCh));
        continue;
      }

      if (!classification.value || !CLASSIFICATION_VALUE_SET.has(classification.value)) {
        verdicts.push(invalidClassificationVerdict(page, classification.value ?? classification.text));
        continue;
      }

      const activeFacts = activeStoryFacts(parsed, factsForPage(page, factsByStory));
      const citedChIds = new Set(citedChangeIds(classification.text));

      for (const change of changes.filter((candidate) => windowIds.includes(candidate.id))) {
        for (const affectedFactId of change.affectedFactIds) {
          for (const fact of activeFactsByDerivedCf(activeFacts, affectedFactId)) {
            if (!citedChIds.has(change.id)) {
              verdicts.push(windowIncompleteVerdict(page, change.id, affectedFactId, fact));
            }
          }
        }
      }
    }

    return verdicts;
  },
  skip_reason: "create_pg_record-only"
};

interface ChangeRecord {
  id: string;
  affectedFactIds: string[];
}

interface DriftClassification {
  text: string;
  value?: string;
}

function changeRecords(records: readonly IndexedRecord[]): ChangeRecord[] {
  return records
    .filter((record) => record.node_type === "change_log_entry")
    .map((record) => {
      const parsed = asPlainRecord(record.parsed);
      return {
        id: stringValue(parsed.change_id) ?? stripScopedId(record.node_id),
        affectedFactIds: stringArray(parsed.affected_fact_ids)
      };
    })
    .filter((record) => parseChNumber(record.id) !== undefined);
}

function storyFactMaps(records: readonly IndexedRecord[]): Map<string, Map<string, IndexedRecord>> {
  const maps = new Map<string, Map<string, IndexedRecord>>();
  for (const fact of records.filter((record) => record.node_type === "story_fact_record")) {
    const storySlug = fact.story_slug ?? "";
    const byId = maps.get(storySlug) ?? new Map<string, IndexedRecord>();
    byId.set(fact.node_id, fact);
    const id = stringValue(asPlainRecord(fact.parsed).id);
    if (id !== undefined) {
      byId.set(id, fact);
    }
    maps.set(storySlug, byId);
  }
  return maps;
}

function storyEventTextMaps(records: readonly IndexedRecord[]): Map<string, Map<string, string>> {
  const maps = new Map<string, Map<string, string>>();
  for (const event of records.filter((record) => record.node_type === "story_event_record")) {
    const storySlug = event.story_slug ?? "";
    const parsed = asPlainRecord(event.parsed);
    const eventId = stringValue(parsed.id) ?? stripScopedId(event.node_id);
    const byId = maps.get(storySlug) ?? new Map<string, string>();
    byId.set(event.node_id, eventText(parsed));
    byId.set(eventId, eventText(parsed));
    maps.set(storySlug, byId);
  }
  return maps;
}

function eventsForPage(
  page: IndexedRecord,
  eventTextByStory: ReadonlyMap<string, ReadonlyMap<string, string>>
): ReadonlyMap<string, string> {
  return eventTextByStory.get(page.story_slug ?? "") ?? new Map<string, string>();
}

function factsForPage(
  page: IndexedRecord,
  factsByStory: ReadonlyMap<string, ReadonlyMap<string, IndexedRecord>>
): ReadonlyMap<string, IndexedRecord> {
  return factsByStory.get(page.story_slug ?? "") ?? new Map<string, IndexedRecord>();
}

function eventText(parsed: Record<string, unknown>): string {
  return [
    stringValue(parsed.world_logic_rationale),
    JSON.stringify(asPlainRecord(parsed.validation_trace))
  ]
    .filter(Boolean)
    .join("\n");
}

function driftClassification(
  page: Record<string, unknown>,
  eventTextById: ReadonlyMap<string, string>
): DriftClassification {
  const validationTrace = asPlainRecord(page.validation_trace);
  const input = asPlainRecord(page.input);
  const eventId = stringValue(input.resolved_event_id);
  const text = [
    valueText(validationTrace.parent_snapshot_compatibility),
    eventId ? eventTextById.get(eventId) : undefined
  ]
    .filter(Boolean)
    .join("\n");
  const value = classificationValue(text);
  return value === undefined ? { text } : { text, value };
}

function valueText(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (value !== undefined && value !== null) {
    return JSON.stringify(value);
  }
  return undefined;
}

function classificationValue(text: string): string | undefined {
  const match = CLASSIFICATION_PATTERN.exec(text);
  return match ? match[1]?.toLowerCase() : undefined;
}

function activeStoryFacts(
  page: Record<string, unknown>,
  factsById: ReadonlyMap<string, IndexedRecord>
): IndexedRecord[] {
  const snapshot = asPlainRecord(page.state_snapshot);
  const activeRecords = asPlainRecord(snapshot.active_records);
  const activeFactIds = stringArray(activeRecords.SF);
  return activeFactIds
    .map((id) => factsById.get(id))
    .filter((record): record is IndexedRecord => record !== undefined);
}

function activeFactsByDerivedCf(facts: readonly IndexedRecord[], canonFactId: string): IndexedRecord[] {
  return facts.filter((fact) => stringArray(asPlainRecord(fact.parsed).derived_from).includes(canonFactId));
}

function latestChangeId(ids: readonly string[]): string | undefined {
  let latest: string | undefined;
  for (const id of ids) {
    const current = parseChNumber(id);
    const prior = latest ? parseChNumber(latest) : undefined;
    if (current !== undefined && (prior === undefined || current > prior)) {
      latest = id;
    }
  }
  return latest;
}

function changeWindow(ids: readonly string[], baseline: string, latest: string): string[] {
  const baselineNumber = parseChNumber(baseline);
  const latestNumber = parseChNumber(latest);
  if (baselineNumber === undefined || latestNumber === undefined || latestNumber <= baselineNumber) {
    return [];
  }
  return [...new Set(ids)]
    .filter((id) => {
      const number = parseChNumber(id);
      return number !== undefined && number > baselineNumber && number <= latestNumber;
    })
    .sort((left, right) => Number(parseChNumber(left)) - Number(parseChNumber(right)));
}

function citedChangeIds(text: string): string[] {
  return [...text.matchAll(CH_ID_PATTERN)].map((match) => match[0]);
}

function parseChNumber(id: string): number | undefined {
  const match = /^CH-(\d+)$/.exec(id);
  return match ? Number(match[1]) : undefined;
}

function stripScopedId(nodeId: string): string {
  return nodeId.includes(":") ? nodeId.slice(nodeId.lastIndexOf(":") + 1) : nodeId;
}

function windowIncompleteVerdict(
  page: IndexedRecord,
  changeId: string,
  affectedFactId: string,
  fact: IndexedRecord
): Verdict {
  const pageId = pageRecordId(page);
  const factId = storyFactId(fact);
  return {
    validator: "canon_baseline_drift",
    severity: "fail",
    code: "canon_baseline_drift_window_incomplete",
    message: `${pageId} drift classification does not cite ${changeId}, which affects ${affectedFactId} mirrored by active ${factId}.`,
    location: locationFor(page),
    detail: {
      page_id: pageId,
      missed_change_id: changeId,
      affected_fact_id: affectedFactId,
      active_story_fact_id: factId
    },
    suggested_fix:
      "Reclassify canon-baseline drift after reviewing every intervening CH entry that affects active mirrored SF records."
  };
}

function unclassifiedVerdict(page: IndexedRecord, baseline: string, latest: string): Verdict {
  const pageId = pageRecordId(page);
  return {
    validator: "canon_baseline_drift",
    severity: "fail",
    code: "canon_baseline_drift_unclassified",
    message: `${pageId} records canon_revision ${baseline} while world canon head is ${latest}, but no drift classification is recorded.`,
    location: locationFor(page),
    detail: {
      page_id: pageId,
      baseline,
      latest,
      allowed_classifications: CLASSIFICATION_VALUES
    },
    suggested_fix:
      "Record parent_snapshot_compatibility or the issuing SE world_logic_rationale with a closed-set canon-baseline drift classification."
  };
}

function invalidClassificationVerdict(page: IndexedRecord, classification: string): Verdict {
  const pageId = pageRecordId(page);
  return {
    validator: "canon_baseline_drift",
    severity: "fail",
    code: "canon_baseline_drift_classification_invalid",
    message: `${pageId} records invalid canon-baseline drift classification ${JSON.stringify(classification)}.`,
    location: locationFor(page),
    detail: {
      page_id: pageId,
      classification,
      allowed_classifications: CLASSIFICATION_VALUES
    },
    suggested_fix: `Use one of: ${CLASSIFICATION_VALUES.join(", ")}.`
  };
}

function pageRecordId(page: IndexedRecord): string {
  return stringValue(asPlainRecord(page.parsed).id) ?? stripScopedId(page.node_id);
}

function storyFactId(fact: IndexedRecord): string {
  return stringValue(asPlainRecord(fact.parsed).id) ?? stripScopedId(fact.node_id);
}
