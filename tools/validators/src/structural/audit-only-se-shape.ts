import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

const AUDIT_ONLY_EVENT_KINDS = new Set(["prose_attach", "promotion_closeout"]);

export const auditOnlySeShape: Validator = {
  name: "audit_only_se_shape",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_se_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/events\/SE-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const pageEventRefs = pageResolvedEventRefs(records);
    const verdicts: Verdict[] = [];

    for (const event of records.filter((record) => record.node_type === "story_event_record")) {
      const parsed = asPlainRecord(event.parsed);
      const eventKind = stringValue(parsed.event_kind);
      if (!eventKind || !AUDIT_ONLY_EVENT_KINDS.has(eventKind)) {
        continue;
      }

      verdicts.push(...validateAuditOnlyEvent(event, parsed, pageEventRefs));
    }

    return verdicts;
  }
};

function validateAuditOnlyEvent(
  event: IndexedRecord,
  parsed: Record<string, unknown>,
  pageEventRefs: ReadonlyMap<string, IndexedRecord[]>
): Verdict[] {
  const verdicts: Verdict[] = [];
  const eventId = stringValue(parsed.id) ?? event.node_id;
  const commitment = asPlainRecord(parsed.commitment);
  const stateDelta = asPlainRecord(parsed.state_delta);

  if (commitment.selected_slt_id !== null) {
    verdicts.push(shapeViolation(event, `${eventId} audit-only event must set commitment.selected_slt_id to null.`));
  }

  if (commitment.selection_source !== "none") {
    verdicts.push(shapeViolation(event, `${eventId} audit-only event must set commitment.selection_source to none.`));
  }

  if (!isEmptyPlainRecord(commitment.alias_bindings)) {
    verdicts.push(shapeViolation(event, `${eventId} audit-only event must set commitment.alias_bindings to an empty object.`));
  }

  if (parsed.outcome_route !== "accept") {
    verdicts.push(shapeViolation(event, `${eventId} audit-only event must set outcome_route to accept.`));
  }

  if (Object.hasOwn(parsed, "resolution")) {
    verdicts.push(shapeViolation(event, `${eventId} audit-only event must omit resolution.`));
  }

  for (const key of ["create", "supersede", "close"] as const) {
    if (stringArray(stateDelta[key]).length > 0) {
      verdicts.push(shapeViolation(event, `${eventId} audit-only event must keep state_delta.${key} empty.`));
    }
  }

  if (!Array.isArray(parsed.promotion_claims) || parsed.promotion_claims.length > 0) {
    verdicts.push(shapeViolation(event, `${eventId} audit-only event must set promotion_claims to an empty array.`));
  }

  const pageRefs = pageEventRefs.get(eventId) ?? [];
  for (const page of pageRefs) {
    verdicts.push(
      shapeViolation(
        event,
        `${eventId} audit-only event must not be used as ${page.node_id}.input.resolved_event_id.`,
        { page: page.node_id, page_file: page.file_path }
      )
    );
  }

  return verdicts;
}

function pageResolvedEventRefs(records: readonly IndexedRecord[]): Map<string, IndexedRecord[]> {
  const refs = new Map<string, IndexedRecord[]>();
  for (const page of records.filter((record) => record.node_type === "page_record")) {
    const input = asPlainRecord(asPlainRecord(page.parsed).input);
    const eventId = stringValue(input.resolved_event_id);
    if (eventId === undefined) {
      continue;
    }
    const pages = refs.get(eventId) ?? [];
    pages.push(page);
    refs.set(eventId, pages);
  }
  return refs;
}

function isEmptyPlainRecord(value: unknown): boolean {
  const record = asPlainRecord(value);
  return Object.keys(record).length === 0;
}

function shapeViolation(event: IndexedRecord, message: string, detail?: unknown): Verdict {
  return {
    validator: "audit_only_se_shape",
    severity: "fail",
    code: "audit_only_se_shape_violation",
    message,
    location: locationFor(event),
    detail,
    suggested_fix: "Conform audit-only SE records to story-state contract §4.3a."
  };
}
