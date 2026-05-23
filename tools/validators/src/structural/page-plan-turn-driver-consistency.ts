import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "./utils.js";
import { markdownSection, pagePlanTargets, type PagePlanTarget } from "./page-plan-section-parser.js";
import {
  hasActivePressureDispositionTable,
  highUrgencyActiveRecords
} from "./page-plan-active-pressure.js";
import { allStorySlugs, recordId, storyMaps } from "./stchar-utils.js";

const VALIDATOR = "page_plan_turn_driver_consistency";
const TURN_DRIVER_SECTION_HEADING = /^##\s+7a\.\s+Turn driver \/ initiative trace\s*$/m;

export const pagePlanTurnDriverConsistency: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some(isStoryEventOrPagePatch)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/(?:_source\/(?:events\/SE-\d+|pages\/PG-\d+)\.yaml|pages-prose-plans\/PG-\d+\.md)$/)),
  skip_reason: "turn-driver page-plan consistency story surfaces only",
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
  const turnDriver = asPlainRecord(eventParsed.turn_driver);
  if (Object.keys(turnDriver).length === 0) {
    return [];
  }

  const plan = plansByPage.get(recordId(page));
  if (plan === undefined) {
    return [];
  }
  const section = markdownSection(plan.content, TURN_DRIVER_SECTION_HEADING);
  if (section === null) {
    return [planVerdict(
      page,
      plan.path,
      "page_plan_driver_section_missing",
      `${recordId(page)} resolves ${recordId(event)}, but its page plan omits section 7a Turn driver / initiative trace.`,
      { page_id: recordId(page), event_id: recordId(event) },
      `Add page-plan section 7a projecting ${recordId(event)}.turn_driver.`
    )];
  }

  const parsedSection = parseTurnDriverSection(section);
  const verdicts: Verdict[] = [];
  const driverKind = stringValue(turnDriver.kind);

  if (parsedSection.driverKind !== driverKind) {
    verdicts.push(planVerdict(
      page,
      plan.path,
      "page_plan_driver_kind_mismatch",
      `${plan.path} declares Driver kind ${parsedSection.driverKind ?? "<missing>"}, but ${recordId(event)}.turn_driver.kind is ${driverKind ?? "<missing>"}.`,
      { page_id: recordId(page), event_id: recordId(event), plan_driver_kind: parsedSection.driverKind, event_driver_kind: driverKind },
      `Set the 7a Driver kind line to ${driverKind ?? "<event turn_driver.kind>"}.`
    ));
  }

  for (const driverRecord of stringArray(turnDriver.driver_records)) {
    if (!parsedSection.driverRecords.includes(driverRecord)) {
      verdicts.push(planVerdict(
        page,
        plan.path,
        "page_plan_driver_record_omitted",
        `${plan.path} omits ${driverRecord} from the 7a Driver records line for ${recordId(event)}.`,
        { page_id: recordId(page), event_id: recordId(event), driver_record: driverRecord },
        `Add ${driverRecord} to the 7a Driver records line.`
      ));
    }
  }

  const parentPage = maps.byId.get(stringValue(eventParsed.parent_page_id) ?? "");
  if (parentPage !== undefined && hasHighUrgencyActiveRecord(parentPage, maps) && !parsedSection.hasActivePressureTable) {
    verdicts.push(planVerdict(
      page,
      plan.path,
      "page_plan_active_pressure_table_missing",
      `${plan.path} omits the 7a Active-pressure disposition table while ${recordId(parentPage)} has high-urgency active records.`,
      { page_id: recordId(page), event_id: recordId(event), parent_page_id: recordId(parentPage) },
      "Add the Active-pressure disposition table to section 7a."
    ));
  }

  return verdicts;
}

interface ParsedTurnDriverSection {
  driverKind: string | undefined;
  driverRecords: string[];
  hasActivePressureTable: boolean;
}

function parseTurnDriverSection(section: string): ParsedTurnDriverSection {
  return {
    driverKind: section.match(/^\s*-\s*Driver kind:\s*(.+?)\s*$/im)?.[1]?.trim(),
    driverRecords: splitDriverRecords(section.match(/^\s*-\s*Driver records:\s*(.+?)\s*$/im)?.[1]),
    hasActivePressureTable: hasActivePressureDispositionTable(section)
  };
}

function splitDriverRecords(value: string | undefined): string[] {
  if (value === undefined || /^none$/i.test(value.trim())) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function hasHighUrgencyActiveRecord(page: IndexedRecord, maps: ReturnType<typeof storyMaps>): boolean {
  return highUrgencyActiveRecords(page, maps).length > 0;
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
