import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

const DRIFT_CLASSIFICATION_PATTERN = /\b(compatible|grandfathered)\b/i;
const CH_ID_PATTERN = /\bCH-\d+\b/g;

export const canonDriftClassificationEvidence: Validator = {
  name: "canon_drift_classification_evidence",
  severity_mode: "warn",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_pg_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/pages\/PG-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const changeIds = records
      .filter((record) => record.node_type === "change_log_entry")
      .map((record) => stringValue(asPlainRecord(record.parsed).change_id) ?? stripScopedId(record.node_id))
      .filter((id): id is string => parseChNumber(id) !== undefined);
    const latestCh = latestChangeId(changeIds);
    if (!latestCh) {
      return [];
    }

    const eventTextById = storyEventTextById(records);
    const verdicts: Verdict[] = [];

    for (const page of records.filter((record) => record.node_type === "page_record")) {
      const parsed = asPlainRecord(page.parsed);
      const snapshot = asPlainRecord(parsed.state_snapshot);
      const baseline = stringValue(snapshot.canon_revision);
      if (!baseline) {
        continue;
      }

      const windowIds = changeWindow(changeIds, baseline, latestCh);
      if (windowIds.length < 2) {
        continue;
      }

      const evidenceText = driftEvidenceText(parsed, eventTextById);
      if (!DRIFT_CLASSIFICATION_PATTERN.test(evidenceText)) {
        continue;
      }

      const citedWindowIds = citedChangeIds(evidenceText).filter((id) => windowIds.includes(id));
      if (citedWindowIds.length === 0) {
        verdicts.push(missingEvidenceVerdict(page, baseline, latestCh, windowIds));
      }
    }

    return verdicts;
  },
  skip_reason: "create_pg_record-only"
};

function storyEventTextById(records: readonly IndexedRecord[]): Map<string, string> {
  const byId = new Map<string, string>();
  for (const event of records.filter((record) => record.node_type === "story_event_record")) {
    const parsed = asPlainRecord(event.parsed);
    const eventId = stringValue(parsed.id) ?? stripScopedId(event.node_id);
    const text = [
      stringValue(parsed.world_logic_rationale),
      JSON.stringify(asPlainRecord(parsed.validation_trace))
    ]
      .filter(Boolean)
      .join("\n");
    byId.set(eventId, text);
  }
  return byId;
}

function driftEvidenceText(page: Record<string, unknown>, eventTextById: ReadonlyMap<string, string>): string {
  const validationTrace = asPlainRecord(page.validation_trace);
  const input = asPlainRecord(page.input);
  const eventId = stringValue(input.resolved_event_id);
  return [
    JSON.stringify(validationTrace),
    eventId ? eventTextById.get(eventId) : undefined
  ]
    .filter(Boolean)
    .join("\n");
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

function missingEvidenceVerdict(
  page: IndexedRecord,
  baseline: string,
  latest: string,
  windowIds: readonly string[]
): Verdict {
  return {
    validator: "canon_drift_classification_evidence",
    severity: "warn",
    code: "canon_drift_classification_missing_evidence",
    message: `${stripScopedId(page.node_id)} classifies stale canon-baseline drift without citing a CH id from ${baseline}..${latest}.`,
    location: locationFor(page),
    detail: {
      baseline,
      latest,
      required_window_ids: windowIds
    },
    suggested_fix:
      "Cite at least one intervening CH id considered during compatible/grandfathered drift classification."
  };
}
