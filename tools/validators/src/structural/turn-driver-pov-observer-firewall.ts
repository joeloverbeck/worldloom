import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  fileInputsFrom,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

const VALIDATOR = "turn_driver_pov_observer_firewall";
const NON_PLAYER_DRIVER_KINDS = new Set([
  "npc_action",
  "offstage_action",
  "world_pressure",
  "clock_fire",
  "secret_reveal",
  "multi_actor_collision"
]);
const VISIBILITIES_REQUIRING_ACCESS_ROUTE = new Set(["inferred_from_trace", "reported"]);
const BEL_VISIBILITIES_GRANTING_ACCESS = new Set(["public", "shared", "factional", "rumored"]);
const HIDDEN_SECRET_STATUSES = new Set(["hidden", "unrevealed", "concealed"]);
const OFFSTAGE_VISIBILITIES = new Set(["offstage", "hidden", "concealed"]);
const PLAN_PATH_PATTERN = /^stories\/([^/]+)\/pages-prose-plans\/(PG-(0|[1-9][0-9]*))\.md$/;
const INTERIORITY_PATTERN = /\b(?:thought|felt|knew|believed|intended|wanted|hoped|feared|planned)\b|\bbecause\s+(?:he|she|they|[A-Z][A-Za-z0-9_-]*)\s+(?:knew|thought|felt|believed|wanted|intended|hoped|feared)\b/i;

export const turnDriverPovObserverFirewall: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some(isStoryEventOrPagePatch)) ||
    (ctx.run_mode === "incremental" &&
      (touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/_source\/(?:events\/SE-\d+|pages\/PG-\d+|beliefs\/BEL-\d+|secrets\/STSEC-\d+|plans\/STPLAN-\d+)\.yaml$|(?:^|\/)_source\/(?:events\/SE-\d+|pages\/PG-\d+|beliefs\/BEL-\d+|secrets\/STSEC-\d+|plans\/STPLAN-\d+)\.yaml$/) ||
        touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/pages-prose-plans\/PG-\d+\.md$/))),
  skip_reason: "turn-driver POV observer-firewall story surfaces only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const plans = pagePlansByStoryAndPage(input, ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of storySlugs(records)) {
      const maps = recordMapsForStory(records, storySlug);
      const plansByPage = plans.get(storySlug) ?? new Map<string, PlanTarget>();

      for (const event of maps.byType.get("story_event_record") ?? []) {
        verdicts.push(...validateEvent(event, maps, plansByPage));
      }
    }

    return verdicts;
  }
};

interface RecordMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

interface PlanTarget {
  path: string;
  content: string;
}

function isStoryEventOrPagePatch(patch: { op: string }): boolean {
  return patch.op === "create_se_record" || patch.op === "create_pg_record";
}

function storySlugs(records: readonly IndexedRecord[]): Set<string> {
  return new Set(records.map((record) => record.story_slug).filter((slug): slug is string => typeof slug === "string"));
}

function recordMapsForStory(records: readonly IndexedRecord[], storySlug: string): RecordMaps {
  const byId = new Map<string, IndexedRecord>();
  const byType = new Map<string, IndexedRecord[]>();

  for (const record of records) {
    if (record.story_slug !== storySlug) {
      continue;
    }
    const id = recordId(record);
    byId.set(record.node_id, record);
    byId.set(id, record);
    byType.set(record.node_type, [...(byType.get(record.node_type) ?? []), record]);
  }

  return { byId, byType };
}

function pagePlansByStoryAndPage(input: unknown, ctx: Context): Map<string, Map<string, PlanTarget>> {
  const grouped = new Map<string, Map<string, PlanTarget>>();
  for (const file of fileInputsFrom(input, ctx)) {
    const match = file.path.match(PLAN_PATH_PATTERN);
    if (!match) {
      continue;
    }
    const storySlug = match[1];
    const pageId = match[2];
    if (!storySlug || !pageId) {
      continue;
    }
    const storyPlans = grouped.get(storySlug) ?? new Map<string, PlanTarget>();
    storyPlans.set(pageId, { path: file.path, content: file.content });
    grouped.set(storySlug, storyPlans);
  }
  return grouped;
}

function validateEvent(event: IndexedRecord, maps: RecordMaps, plansByPage: Map<string, PlanTarget>): Verdict[] {
  const parsed = asPlainRecord(event.parsed);
  if (stringValue(parsed.event_kind) !== "turn_resolution") {
    return [];
  }
  const turnDriver = asPlainRecord(parsed.turn_driver);
  const kind = stringValue(turnDriver.kind);
  if (kind === undefined || !NON_PLAYER_DRIVER_KINDS.has(kind)) {
    return [];
  }

  const actor = eventActor(parsed, turnDriver);
  const parentPage = maps.byId.get(stringValue(parsed.parent_page_id) ?? "");
  const childPage = pageResolvedByEvent(parsed, maps);
  const plan = childPage !== undefined ? plansByPage.get(recordId(childPage)) : undefined;
  const driverRecords = stringArray(turnDriver.driver_records);
  const povVisibility = stringValue(turnDriver.pov_visibility);
  const verdicts: Verdict[] = [];

  if (povVisibility === "perceived_directly") {
    const hiddenRecords = driverRecords.filter((driverRecord) => isHiddenDriverRecord(driverRecord, maps, actor, parentPage));
    if (hiddenRecords.length > 0) {
      verdicts.push(eventVerdict(
        event,
        "turn_driver_hidden_state_leak",
        `${recordId(event)} declares pov_visibility perceived_directly for hidden or offstage driver record(s): ${hiddenRecords.join(", ")}.`,
        { event_id: recordId(event), driver_records: hiddenRecords, pov_visibility: povVisibility }
      ));
    }
  }

  if (povVisibility !== undefined && VISIBILITIES_REQUIRING_ACCESS_ROUTE.has(povVisibility)) {
    const missingRoutes = driverRecords.filter((driverRecord) => !hasAccessRoute(actor, driverRecord, parentPage, maps));
    if (missingRoutes.length > 0) {
      verdicts.push(eventVerdict(
        event,
        "turn_driver_missing_access_route",
        `${recordId(event)} declares ${povVisibility} visibility without an active BEL access route for driver record(s): ${missingRoutes.join(", ")}.`,
        { event_id: recordId(event), driver_records: missingRoutes, pov_visibility: povVisibility, actor }
      ));
    }
  }

  if (kind === "offstage_action" && plan !== undefined && INTERIORITY_PATTERN.test(offstageDriverText(plan.content))) {
    verdicts.push({
      validator: VALIDATOR,
      severity: "fail",
      code: "turn_driver_offstage_direct_mind_access",
      message: `${plan.path} narrates offstage driver interiority for ${recordId(event)}.`,
      location: { file: plan.path, node_id: recordId(event) },
      detail: { event_id: recordId(event), plan_path: plan.path }
    });
  }

  return verdicts;
}

function eventActor(event: Record<string, unknown>, turnDriver: Record<string, unknown>): string | undefined {
  return stringValue(event.actor) ?? stringValue(turnDriver.initiator);
}

function pageResolvedByEvent(event: Record<string, unknown>, maps: RecordMaps): IndexedRecord | undefined {
  const eventId = stringValue(event.id);
  if (eventId === undefined) {
    return undefined;
  }
  return (maps.byType.get("page_record") ?? []).find((page) => {
    const input = asPlainRecord(asPlainRecord(page.parsed).input);
    return stringValue(input.resolved_event_id) === eventId;
  });
}

function isHiddenDriverRecord(recordIdValue: string, maps: RecordMaps, actor: string | undefined, parentPage: IndexedRecord | undefined): boolean {
  const record = maps.byId.get(recordIdValue);
  if (record?.node_type === "story_secret_record") {
    const parsed = asPlainRecord(record.parsed);
    const status = stringValue(parsed.status);
    const visibility = stringValue(parsed.audience_visibility);
    return (status !== undefined && HIDDEN_SECRET_STATUSES.has(status)) || visibility === "hidden";
  }
  if (record?.node_type === "story_plan_record") {
    const parsed = asPlainRecord(record.parsed);
    const visibility = stringValue(asPlainRecord(parsed.scope).visibility) ?? stringValue(parsed.visibility);
    return visibility !== undefined && OFFSTAGE_VISIBILITIES.has(visibility) && !hasAccessRoute(actor, recordIdValue, parentPage, maps);
  }
  return false;
}

function hasAccessRoute(
  actor: string | undefined,
  recordIdValue: string,
  parentPage: IndexedRecord | undefined,
  maps: RecordMaps
): boolean {
  if (actor === undefined || parentPage === undefined) {
    return false;
  }
  const activeBelIds = activeRecordIds(parentPage, "BEL");
  for (const belId of activeBelIds) {
    const belief = maps.byId.get(belId);
    if (belief?.node_type !== "belief_record") {
      continue;
    }
    const parsed = asPlainRecord(belief.parsed);
    const holder = stringValue(parsed.holder);
    const visibility = stringValue(parsed.visibility);
    const accessRecords = stringArray(asPlainRecord(parsed.basis).access_records);
    const holderCanUse = holder === actor || holder === "public" || holder === "group:direct_witnesses";
    const publicAccess = visibility !== undefined && BEL_VISIBILITIES_GRANTING_ACCESS.has(visibility);
    if ((holderCanUse || publicAccess) && accessRecords.includes(recordIdValue)) {
      return true;
    }
  }
  return false;
}

function activeRecordIds(page: IndexedRecord, className: string): string[] {
  const activeRecords = asPlainRecord(asPlainRecord(page.parsed).state_snapshot).active_records;
  return stringArray(asPlainRecord(activeRecords)[className]);
}

function offstageDriverText(content: string): string {
  const turnDriverSection = content.match(/^##\s+7a\.\s+Turn driver \/ initiative trace\s*$(.*?)(?=^##\s+|$)/ms)?.[1] ?? "";
  const stcharSection = content.match(/^##\s+16a\.\s+STCHAR-derived character authority packets\s*$(.*?)(?=^##\s+|$)/ms)?.[1] ?? "";
  return `${turnDriverSection}\n${stcharSection}\n${content}`;
}

function recordId(record: IndexedRecord): string {
  return stringValue(asPlainRecord(record.parsed).id) ?? record.node_id.split(":").at(-1) ?? record.node_id;
}

function eventVerdict(event: IndexedRecord, code: string, message: string, detail: unknown): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(event),
    detail
  };
}
