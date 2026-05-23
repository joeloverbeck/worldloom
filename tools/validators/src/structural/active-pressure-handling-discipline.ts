import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringValue,
  touchedFilesInclude
} from "./utils.js";
import { markdownSection, pagePlanTargets, type PagePlanTarget } from "./page-plan-section-parser.js";
import {
  highUrgencyActiveRecords,
  parseActivePressureDispositionRows,
  type ActivePressureRow,
  type HighUrgencyActiveRecord
} from "./page-plan-active-pressure.js";
import { allStorySlugs, recordId, storyMaps } from "./stchar-utils.js";

const VALIDATOR = "active_pressure_handling_discipline";
const TURN_DRIVER_SECTION_HEADING = /^##\s+7a\.\s+Turn driver \/ initiative trace\s*$/m;
const VALID_DISPOSITIONS = new Set(["selected", "deferred", "rejected"]);

// SPEC-76 §9 defers medium-tier criteria; warn severity is unreachable until that table is enumerated.
export const activePressureHandlingDiscipline: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some(isStoryEventOrPagePatch)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/(?:_source\/(?:events\/SE-\d+|pages\/PG-\d+|plans\/STPLAN-\d+|emotions\/STEMO-\d+|pressure-clocks\/CLK-\d+|threads\/THR-\d+|secrets\/STSEC-\d+|questions\/STQ-\d+|obligations\/OBL-\d+|consequences\/CNSQ-\d+)\.yaml|pages-prose-plans\/PG-\d+\.md)$/)),
  skip_reason: "active-pressure page-plan story surfaces only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const plans = pagePlanTargets(input, ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of allStorySlugs(records)) {
      const maps = storyMaps(records, storySlug);
      const plansByPage = new Map(
        plans
          .filter((plan) => plan.storySlug === storySlug)
          .map((plan) => [plan.pageId, plan])
      );

      for (const page of maps.byType.get("page_record") ?? []) {
        verdicts.push(...validatePage(page, maps, plansByPage));
      }
    }

    return verdicts;
  }
};

function isStoryEventOrPagePatch(patch: { op: string }): boolean {
  return patch.op === "create_se_record" || patch.op === "create_pg_record";
}

function validatePage(
  page: IndexedRecord,
  maps: ReturnType<typeof storyMaps>,
  plansByPage: Map<string, PagePlanTarget>
): Verdict[] {
  const input = asPlainRecord(asPlainRecord(page.parsed).input);
  const eventId = stringValue(input.resolved_event_id);
  const event = eventId !== undefined ? maps.byId.get(eventId) : undefined;
  const eventParsed = asPlainRecord(event?.parsed);
  if (event === undefined || stringValue(eventParsed.event_kind) !== "turn_resolution") {
    return [];
  }

  const parentPage = maps.byId.get(stringValue(eventParsed.parent_page_id) ?? "");
  if (parentPage === undefined) {
    return [];
  }
  const highUrgency = highUrgencyActiveRecords(parentPage, maps);
  if (highUrgency.length === 0) {
    return [];
  }

  const plan = plansByPage.get(recordId(page));
  if (plan === undefined) {
    return [];
  }
  const section = markdownSection(plan.content, TURN_DRIVER_SECTION_HEADING) ?? "";
  const rows = parseActivePressureDispositionRows(section);
  return [
    ...missingHighUrgencyVerdicts(page, plan, parentPage, highUrgency, rows),
    ...rowShapeVerdicts(page, plan, rows)
  ];
}

function missingHighUrgencyVerdicts(
  page: IndexedRecord,
  plan: PagePlanTarget,
  parentPage: IndexedRecord,
  highUrgency: HighUrgencyActiveRecord[],
  rows: ActivePressureRow[]
): Verdict[] {
  const handled = new Set(rows.map((row) => row.recordId));
  return highUrgency
    .filter((record) => !handled.has(record.id))
    .map((record) => planVerdict(
      page,
      plan.path,
      "high_urgency_active_record_unhandled",
      `${plan.path} omits high-urgency active ${record.id} from the 7a Active-pressure disposition table.`,
      { page_id: recordId(page), parent_page_id: recordId(parentPage), record_id: record.id, record_class: record.recordClass },
      `Add an Active-pressure disposition row for ${record.id}.`
    ));
}

function rowShapeVerdicts(page: IndexedRecord, plan: PagePlanTarget, rows: ActivePressureRow[]): Verdict[] {
  const verdicts: Verdict[] = [];
  for (const row of rows) {
    if (!VALID_DISPOSITIONS.has(row.disposition)) {
      verdicts.push(planVerdict(
        page,
        plan.path,
        "active_pressure_disposition_unknown",
        `${plan.path} gives ${row.recordId} unknown active-pressure disposition ${row.disposition || "<missing>"}.`,
        { page_id: recordId(page), record_id: row.recordId, disposition: row.disposition },
        "Use one of selected, deferred, or rejected."
      ));
    }
    if (row.disposition === "rejected" && row.reasonExpiry.length === 0) {
      verdicts.push(planVerdict(
        page,
        plan.path,
        "active_pressure_rejection_reason_missing",
        `${plan.path} rejects ${row.recordId} without a reason.`,
        { page_id: recordId(page), record_id: row.recordId },
        `Add a rejection reason for ${row.recordId}.`
      ));
    }
    if (row.disposition === "deferred" && !hasDeferredExpiry(row.reasonExpiry)) {
      verdicts.push(planVerdict(
        page,
        plan.path,
        "active_pressure_deferred_without_expiry",
        `${plan.path} defers ${row.recordId} without a PG expiry or condition.`,
        { page_id: recordId(page), record_id: row.recordId, reason_expiry: row.reasonExpiry },
        `Add a PG expiry or explicit condition for ${row.recordId}.`
      ));
    }
  }
  return verdicts;
}

function hasDeferredExpiry(value: string): boolean {
  return /\bPG-(0|[1-9][0-9]*)\b/.test(value) || /\b(after|before|if|once|until|when)\b/i.test(value);
}

function planVerdict(
  page: IndexedRecord,
  planPath: string,
  code: string,
  message: string,
  detail: unknown,
  suggested_fix: string
): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: { ...locationFor(page), file: planPath, node_id: recordId(page) },
    detail,
    suggested_fix
  };
}
