import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "introduction_observer_firewall";
const INTRO_RECORD_ID = /^(?:CLK|STSEC|STQ|THR|STENT|SREL)-\d+$/;
const INTRO_CREATE_OPS = new Set([
  "create_se_record",
  "create_pg_record",
  "create_chc_record",
  "create_clk_record",
  "create_stsec_record",
  "create_stq_record",
  "create_thr_record",
  "create_stent_record",
  "create_srel_record"
]);
const PUBLIC_BEL_VISIBILITIES = new Set(["public", "rumored", "shared", "faction"]);

export const introductionObserverFirewall: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => INTRO_CREATE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(
      ctx,
      /^stories\/[^/]+\/_source\/(?:events|pages|choices|clocks|secrets|story-questions|threads|entities|relationships)\/(?:SE|PG|CHC|CLK|STSEC|STQ|THR|STENT|SREL)-\d+\.yaml$/
    ),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];
    const storySlugs = new Set(records.map((record) => record.story_slug).filter((slug): slug is string => typeof slug === "string"));

    for (const storySlug of storySlugs) {
      const maps = recordMapsForStory(records, storySlug);
      for (const event of maps.byType.get("story_event_record") ?? []) {
        verdicts.push(...validateEvent(event, maps));
      }
    }

    return verdicts;
  }
};

interface RecordMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

function validateEvent(event: IndexedRecord, maps: RecordMaps): Verdict[] {
  const parsed = asPlainRecord(event.parsed);
  const freshIds = new Set(stringArray(asPlainRecord(parsed.state_delta).create).filter((id) => INTRO_RECORD_ID.test(id)));
  if (freshIds.size === 0) {
    return [];
  }

  const eventId = recordId(event);
  const childPageId = stringValue(parsed.created_at_page);
  const childPage = childPageForEvent(eventId, childPageId, maps);
  const emittedChoiceIds = new Set(stringArray(asPlainRecord(childPage?.parsed).emitted_choices));
  const choices = choicesForChildPage(childPageId, emittedChoiceIds, maps);
  const verdicts: Verdict[] = [];

  for (const choice of choices) {
    const choiceParsed = asPlainRecord(choice.parsed);
    const actor = actorForChoice(choiceParsed) ?? actorForEvent(parsed);
    if (actor === undefined) {
      continue;
    }

    for (const [index, groundedId] of stringArray(asPlainRecord(choiceParsed.grounded_in).records).entries()) {
      if (!freshIds.has(groundedId)) {
        continue;
      }
      if (!actorHasExplicitAccess(actor, groundedId, event, maps)) {
        verdicts.push(noAccessRoute(event, actor, choice, groundedId, index));
      }
    }
  }

  return verdicts;
}

function recordMapsForStory(records: readonly IndexedRecord[], storySlug: string): RecordMaps {
  const byId = new Map<string, IndexedRecord>();
  const byType = new Map<string, IndexedRecord[]>();

  for (const record of records) {
    if (record.story_slug !== storySlug) {
      continue;
    }
    byId.set(record.node_id, record);
    byId.set(recordId(record), record);
    const typed = byType.get(record.node_type) ?? [];
    typed.push(record);
    byType.set(record.node_type, typed);
  }

  return { byId, byType };
}

function childPageForEvent(eventId: string, childPageId: string | undefined, maps: RecordMaps): IndexedRecord | undefined {
  const pages = maps.byType.get("page_record") ?? [];
  return pages.find((page) => stringValue(asPlainRecord(asPlainRecord(page.parsed).input).resolved_event_id) === eventId) ??
    (childPageId === undefined ? undefined : pages.find((page) => recordId(page) === childPageId));
}

function choicesForChildPage(
  childPageId: string | undefined,
  emittedChoiceIds: ReadonlySet<string>,
  maps: RecordMaps
): IndexedRecord[] {
  const choices = maps.byType.get("choice_record") ?? [];
  return choices.filter((choice) => {
    const id = recordId(choice);
    const createdAtPage = stringValue(asPlainRecord(choice.parsed).created_at_page);
    return emittedChoiceIds.has(id) || (childPageId !== undefined && createdAtPage === childPageId);
  });
}

function actorForChoice(choice: Record<string, unknown>): string | undefined {
  const actor = stringValue(choice.actor);
  if (actor !== undefined && /^STENT-\d+$/.test(actor)) {
    return actor;
  }
  const availableTo = stringArray(choice.available_to);
  return availableTo.length === 1 && /^STENT-\d+$/.test(availableTo[0] ?? "") ? availableTo[0] : undefined;
}

function actorForEvent(event: Record<string, unknown>): string | undefined {
  const actor = stringValue(event.actor);
  if (actor !== undefined && /^STENT-\d+$/.test(actor)) {
    return actor;
  }
  return undefined;
}

function actorHasExplicitAccess(actor: string, freshId: string, event: IndexedRecord, maps: RecordMaps): boolean {
  const freshRecord = maps.byId.get(freshId);
  if (freshRecord === undefined) {
    return false;
  }

  if (actorHasRecordIntrinsicAccess(actor, freshRecord)) {
    return true;
  }

  if (stringArray(asPlainRecord(event.parsed).expected_witnesses).includes(actor)) {
    return true;
  }

  return actorHasBelAccessRecord(actor, freshId, maps);
}

function actorHasRecordIntrinsicAccess(actor: string, record: IndexedRecord): boolean {
  const parsed = asPlainRecord(record.parsed);
  if (record.node_type === "story_entity_record") {
    return recordId(record) === actor;
  }
  if (record.node_type === "relationship_record_story") {
    return stringArray(parsed.participants).includes(actor);
  }
  if (record.node_type === "pressure_clock_record") {
    return stringValue(parsed.visibility) === "public" || stringValue(parsed.driver) === actor;
  }
  if (record.node_type === "story_secret_record") {
    const holders = stringArray(parsed.holders);
    return holders.includes(actor) || holders.includes("public") || ["revealed", "disproven"].includes(stringValue(parsed.status) ?? "");
  }
  if (record.node_type === "story_question_record") {
    return stringValue(parsed.audience_visibility) !== "hidden";
  }
  return false;
}

function actorHasBelAccessRecord(actor: string, freshId: string, maps: RecordMaps): boolean {
  for (const belief of maps.byType.get("belief_record") ?? []) {
    const parsed = asPlainRecord(belief.parsed);
    const holder = stringValue(parsed.holder);
    const visibility = stringValue(parsed.visibility);
    if (holder !== actor && !PUBLIC_BEL_VISIBILITIES.has(visibility ?? "")) {
      continue;
    }
    const basis = asPlainRecord(parsed.basis);
    if (stringArray(basis.access_records).includes(freshId)) {
      return true;
    }
    if (stringValue(parsed.subject) === freshId) {
      return true;
    }
  }
  return false;
}

function noAccessRoute(event: IndexedRecord, actor: string, choice: IndexedRecord, freshId: string, index: number): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "intro_observer_no_access_route",
    message: `${recordId(choice)} grounds actor ${actor} in freshly-introduced ${freshId} without an explicit access route.`,
    location: locationFor(choice),
    detail: {
      event_id: recordId(event),
      actor,
      choice_id: recordId(choice),
      fresh_record_id: freshId,
      reference_path: `grounded_in.records[${index}]`
    },
    suggested_fix: `Add an explicit BEL/access route for ${actor} to ${freshId}, change ${recordId(choice)} grounding, or defer the choice until access is established.`
  };
}

function recordId(record: IndexedRecord): string {
  const parsedId = stringValue(asPlainRecord(record.parsed).id);
  if (parsedId !== undefined) {
    return parsedId;
  }
  const parts = record.node_id.split(":");
  return parts.at(-1) ?? record.node_id;
}
