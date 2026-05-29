import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { readSeIntroductions } from "./midstory-introduction-utils.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "introduction_observer_firewall";
const INTRO_RECORD_ID = /^(?:CLK|STSEC|STQ|THR|STENT|SREL|STPLAN|STEMO)-\d+$/;
const INTRO_CREATE_OPS = new Set([
  "create_se_record",
  "create_pg_record",
  "create_chc_record",
  "create_clk_record",
  "create_stsec_record",
  "create_stq_record",
  "create_thr_record",
  "create_stent_record",
  "create_srel_record",
  "create_stplan_record",
  "create_stemo_record"
]);
const PUBLIC_BEL_VISIBILITIES = new Set(["public", "rumored", "shared", "faction"]);
const PLAYER_PROXY_ROLE = "player_proxy";
const TURN_RESOLUTION_EVENT_KIND = "turn_resolution";

export const introductionObserverFirewall: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => INTRO_CREATE_OPS.has(patch.op)) === true ||
    touchedFilesInclude(
      ctx,
      /^stories\/[^/]+\/_source\/(?:events|pages|choices|clocks|secrets|story-questions|threads|entities|relationships|plans|emotions)\/(?:SE|PG|CHC|CLK|STSEC|STQ|THR|STENT|SREL|STPLAN|STEMO)-\d+\.yaml$/
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
  const freshIds = new Set(readSeIntroductions(event).map((intro) => intro.recordId).filter((id) => INTRO_RECORD_ID.test(id)));
  if (freshIds.size === 0) {
    return [];
  }

  const eventId = recordId(event);
  const childPageId = stringValue(parsed.created_at_page);
  const childPage = childPageForEvent(eventId, childPageId, maps);
  const emittedChoiceIds = new Set(stringArray(asPlainRecord(childPage?.parsed).emitted_choices));
  const choices = choicesForChildPage(childPageId, emittedChoiceIds, maps);
  const verdicts: Verdict[] = [];

  // Emitted choices are the player's response side (story-state-contract §11a), performed by the
  // player-proxy acting entity (FOUNDATIONS §Story Bundles §6b) — not necessarily SE.actor, which on a
  // non-player-driven turn_resolution is the NPC/world initiator. Resolve access against the proxy.
  const actors = resolveChoiceActors(parsed, maps);
  if (actors.length === 0) {
    return [];
  }

  for (const choice of choices) {
    const choiceParsed = asPlainRecord(choice.parsed);

    for (const [index, groundedId] of stringArray(asPlainRecord(choiceParsed.grounded_in).records).entries()) {
      if (!freshIds.has(groundedId)) {
        continue;
      }
      if (!actors.some((actor) => actorHasExplicitAccess(actor, groundedId, event, maps))) {
        verdicts.push(noAccessRoute(event, actors, choice, groundedId, index));
      }
    }
  }

  return verdicts;
}

// For a turn_resolution event, the emitted-choice acting entity is the bundle's player-proxy (the
// active STENT whose role_in_story includes "player_proxy"). More than one proxy resolves to a
// permissive disjunction: a choice passes if any proxy has an access route. Falls back to SE.actor
// when no player-proxy is resolvable, and for non-turn_resolution events (e.g. system_repair).
function resolveChoiceActors(event: Record<string, unknown>, maps: RecordMaps): string[] {
  const eventActor = actorForEvent(event);
  if (stringValue(event.event_kind) === TURN_RESOLUTION_EVENT_KIND) {
    const proxies = activePlayerProxies(maps);
    if (proxies.length > 0) {
      return proxies;
    }
  }
  return eventActor === undefined ? [] : [eventActor];
}

function activePlayerProxies(maps: RecordMaps): string[] {
  const entities = maps.byType.get("story_entity_record") ?? [];
  const superseded = new Set(
    entities
      .map((entity) => stringValue(asPlainRecord(entity.parsed).supersedes))
      .filter((id): id is string => id !== undefined)
  );
  const proxies: string[] = [];
  for (const entity of entities) {
    const id = recordId(entity);
    if (superseded.has(id)) {
      continue;
    }
    if (stringArray(asPlainRecord(entity.parsed).role_in_story).includes(PLAYER_PROXY_ROLE)) {
      proxies.push(id);
    }
  }
  return proxies;
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
  if (record.node_type === "story_emotion_record") {
    // An entity always has access to its own interior emotion (FOUNDATIONS §6b: the acting entity's
    // own affective state is observable to it). STEMO.holder names that entity.
    return stringValue(parsed.holder) === actor;
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

function noAccessRoute(event: IndexedRecord, actors: readonly string[], choice: IndexedRecord, freshId: string, index: number): Verdict {
  const actorLabel = actors.join(", ");
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: "intro_observer_no_access_route",
    message: `${recordId(choice)} grounds acting entity ${actorLabel} in freshly-introduced ${freshId} without an explicit access route.`,
    location: locationFor(choice),
    detail: {
      event_id: recordId(event),
      actor: actorLabel,
      choice_id: recordId(choice),
      fresh_record_id: freshId,
      reference_path: `grounded_in.records[${index}]`
    },
    suggested_fix: `Add an explicit BEL/access route for ${actorLabel} to ${freshId}, change ${recordId(choice)} grounding, or defer the choice until access is established.`
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
