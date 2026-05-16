import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

const ACCESSIBLE_BEL_VISIBILITIES = new Set(["public", "rumored", "shared"]);
const PRIVATE_BEL_VISIBILITIES = new Set(["private", "suppressed", "concealed"]);
const STATIC_ACCESS_RECORD_ID = /^(?:STENT|STLOC|STOBJ|DA|BEL|SF|SE)-\d+$/;

export const observerFirewall: Validator = {
  name: "observer_firewall",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_se_record" || patch.op === "create_slt_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:events|storylets)\/(?:SE|SLT)-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];
    const storySlugs = new Set(records.map((record) => record.story_slug).filter((slug): slug is string => typeof slug === "string"));

    for (const storySlug of storySlugs) {
      const maps = recordMapsForStory(records, storySlug);

      for (const event of maps.byType.get("story_event_record") ?? []) {
        const parsed = asPlainRecord(event.parsed);
        const eventKind = stringValue(parsed.event_kind);
        if (eventKind !== "selected_choice" && eventKind !== "write_in_attempt") {
          continue;
        }

        const actor = actorForEvent(parsed);
        if (actor === undefined) {
          continue;
        }

        const selectedChoice = selectedChoiceForEvent(parsed, maps);
        if (selectedChoice === undefined) {
          continue;
        }

        const groundedRecords = stringArray(asPlainRecord(asPlainRecord(selectedChoice.parsed).grounded_in).records);
        groundedRecords.forEach((referenceId, index) => {
          if (/^BEL-\d+$/.test(referenceId)) {
            const belief = maps.byId.get(referenceId);
            if (belief !== undefined) {
              const verdict = beliefAccessVerdict(event, parsed, actor, selectedChoice, belief, index);
              if (verdict !== undefined) {
                verdicts.push(verdict);
              }
            }
            return;
          }

          if (/^SF-\d+$/.test(referenceId) && !actorHasAccessRecord(actor, referenceId, maps)) {
            verdicts.push(noAccessRoute(event, parsed, actor, selectedChoice, referenceId, index));
          }
        });
      }

      for (const storylet of maps.byType.get("storylet_record") ?? []) {
        const parsed = asPlainRecord(storylet.parsed);
        for (const reference of beliefRecordPredicates(parsed)) {
          const belief = maps.byId.get(reference.beliefId);
          if (belief === undefined) {
            continue;
          }
          const actualHolder = stringValue(asPlainRecord(belief.parsed).holder);
          const expectedHolder = resolvedPredicateHolder(reference.holder, storylet, maps) ?? reference.holder;
          if (actualHolder !== undefined && actualHolder !== expectedHolder) {
            verdicts.push(predicateHolderMismatch(storylet, reference, expectedHolder, actualHolder));
          }
        }
      }
    }

    return verdicts;
  }
};

interface RecordMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

interface BeliefPredicateReference {
  holder: string;
  beliefId: string;
  path: string;
}

function recordMapsForStory(records: readonly IndexedRecord[], storySlug: string): RecordMaps {
  const byId = new Map<string, IndexedRecord>();
  const byType = new Map<string, IndexedRecord[]>();

  for (const record of records) {
    if (record.story_slug !== storySlug) {
      continue;
    }
    const parsed = asPlainRecord(record.parsed);
    const id = stringValue(parsed.id);
    byId.set(record.node_id, record);
    if (id !== undefined) {
      byId.set(id, record);
    }
    const typed = byType.get(record.node_type) ?? [];
    typed.push(record);
    byType.set(record.node_type, typed);
  }

  return { byId, byType };
}

function actorForEvent(event: Record<string, unknown>): string | undefined {
  const actor = stringValue(event.actor);
  if (actor !== undefined && /^STENT-\d+$/.test(actor)) {
    return actor;
  }
  if (actor?.startsWith("bound:")) {
    return aliasBinding(event, actor.slice("bound:".length));
  }
  if (actor !== undefined) {
    return aliasBinding(event, actor);
  }
  return undefined;
}

function aliasBinding(event: Record<string, unknown>, alias: string): string | undefined {
  const bound = stringValue(asPlainRecord(asPlainRecord(event.commitment).alias_bindings)[alias]);
  return bound !== undefined && /^STENT-\d+$/.test(bound) ? bound : undefined;
}

function selectedChoiceForEvent(event: Record<string, unknown>, maps: RecordMaps): IndexedRecord | undefined {
  const childPage = pageResolvedByEvent(event, maps);
  const choiceId = stringValue(asPlainRecord(asPlainRecord(childPage?.parsed).input).choice_id);
  if (choiceId === undefined) {
    return undefined;
  }
  const choice = maps.byId.get(choiceId);
  return choice?.node_type === "choice_record" ? choice : undefined;
}

function pageResolvedByEvent(event: Record<string, unknown>, maps: RecordMaps): IndexedRecord | undefined {
  const eventIdValue = stringValue(event.id);
  if (eventIdValue === undefined) {
    return undefined;
  }
  return (maps.byType.get("page_record") ?? []).find((page) => {
    const input = asPlainRecord(asPlainRecord(page.parsed).input);
    return stringValue(input.resolved_event_id) === eventIdValue;
  });
}

function beliefAccessVerdict(
  event: IndexedRecord,
  parsedEvent: Record<string, unknown>,
  actor: string,
  choice: IndexedRecord,
  belief: IndexedRecord,
  index: number
): Verdict | undefined {
  const parsedBelief = asPlainRecord(belief.parsed);
  const holder = stringValue(parsedBelief.holder);
  if (holder === actor || ACCESSIBLE_BEL_VISIBILITIES.has(stringValue(parsedBelief.visibility) ?? "")) {
    return undefined;
  }

  if (PRIVATE_BEL_VISIBILITIES.has(stringValue(parsedBelief.visibility) ?? "")) {
    return privateBeliefLeak(event, parsedEvent, actor, choice, belief, holder, index);
  }

  return actorLacksAccess(event, parsedEvent, actor, choice, belief, index);
}

function actorHasAccessRecord(actor: string, referenceId: string, maps: RecordMaps): boolean {
  for (const belief of maps.byType.get("belief_record") ?? []) {
    const parsed = asPlainRecord(belief.parsed);
    if (stringValue(parsed.holder) !== actor) {
      continue;
    }
    const accessRecords = stringArray(asPlainRecord(parsed.basis).access_records);
    if (accessRecords.some((id) => STATIC_ACCESS_RECORD_ID.test(id) && id === referenceId)) {
      return true;
    }
  }
  return false;
}

function beliefRecordPredicates(storylet: Record<string, unknown>): BeliefPredicateReference[] {
  const references: BeliefPredicateReference[] = [];
  const preconditions = asPlainRecord(storylet.preconditions);
  collectBeliefRecordPredicates(preconditions.hard, "preconditions.hard", references);
  collectBeliefRecordPredicates(preconditions.soft, "preconditions.soft", references);
  return references;
}

function collectBeliefRecordPredicates(
  value: unknown,
  path: string,
  references: BeliefPredicateReference[]
): void {
  if (typeof value === "string") {
    const match = value.match(/\bbelief_record\(\s*([^,\s)]+)\s*,\s*(BEL-\d+)/);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      references.push({ holder: match[1], beliefId: match[2], path });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectBeliefRecordPredicates(item, `${path}[${index}]`, references));
    return;
  }

  const record = asPlainRecord(value);
  for (const [key, nested] of Object.entries(record)) {
    collectBeliefRecordPredicates(nested, `${path}.${key}`, references);
  }
}

function resolvedPredicateHolder(holder: string, storylet: IndexedRecord, maps: RecordMaps): string | undefined {
  if (/^STENT-\d+$/.test(holder)) {
    return holder;
  }

  const storyletId = stringValue(asPlainRecord(storylet.parsed).id) ?? storylet.node_id;
  for (const event of maps.byType.get("story_event_record") ?? []) {
    const parsed = asPlainRecord(event.parsed);
    if (stringValue(asPlainRecord(parsed.commitment).selected_slt_id) !== storyletId) {
      continue;
    }
    const bound = stringValue(asPlainRecord(asPlainRecord(parsed.commitment).alias_bindings)[holder]);
    if (bound !== undefined) {
      return bound;
    }
  }

  return undefined;
}

function eventId(event: Record<string, unknown>): string {
  return stringValue(event.id) ?? "<unknown-event>";
}

function choiceId(choice: IndexedRecord): string {
  return stringValue(asPlainRecord(choice.parsed).id) ?? choice.node_id;
}

function recordId(record: IndexedRecord): string {
  return stringValue(asPlainRecord(record.parsed).id) ?? record.node_id;
}

function actorLacksAccess(
  event: IndexedRecord,
  parsedEvent: Record<string, unknown>,
  actor: string,
  choice: IndexedRecord,
  belief: IndexedRecord,
  index: number
): Verdict {
  return {
    validator: "observer_firewall",
    severity: "fail",
    code: "observer_firewall_violation_actor_lacks_access",
    message: `${eventId(parsedEvent)} actor ${actor} lacks recorded access to ${recordId(belief)} grounded in ${choiceId(choice)}`,
    location: locationFor(event),
    detail: {
      event_id: eventId(parsedEvent),
      actor,
      choice_id: choiceId(choice),
      reference_id: recordId(belief),
      reference_path: `grounded_in.records[${index}]`
    }
  };
}

function privateBeliefLeak(
  event: IndexedRecord,
  parsedEvent: Record<string, unknown>,
  actor: string,
  choice: IndexedRecord,
  belief: IndexedRecord,
  holder: string | undefined,
  index: number
): Verdict {
  return {
    validator: "observer_firewall",
    severity: "fail",
    code: "observer_firewall_violation_private_belief_leak",
    message: `${eventId(parsedEvent)} actor ${actor} grounds ${choiceId(choice)} in private belief ${recordId(belief)} held by ${holder ?? "<unknown-holder>"}`,
    location: locationFor(event),
    detail: {
      event_id: eventId(parsedEvent),
      actor,
      choice_id: choiceId(choice),
      belief_id: recordId(belief),
      belief_holder: holder,
      reference_path: `grounded_in.records[${index}]`
    }
  };
}

function noAccessRoute(
  event: IndexedRecord,
  parsedEvent: Record<string, unknown>,
  actor: string,
  choice: IndexedRecord,
  referenceId: string,
  index: number
): Verdict {
  return {
    validator: "observer_firewall",
    severity: "fail",
    code: "observer_firewall_violation_no_access_route",
    message: `${eventId(parsedEvent)} actor ${actor} lacks BEL.basis.access_records route to ${referenceId} grounded in ${choiceId(choice)}`,
    location: locationFor(event),
    detail: {
      event_id: eventId(parsedEvent),
      actor,
      choice_id: choiceId(choice),
      reference_id: referenceId,
      reference_path: `grounded_in.records[${index}]`
    }
  };
}

function predicateHolderMismatch(
  storylet: IndexedRecord,
  reference: BeliefPredicateReference,
  expectedHolder: string,
  actualHolder: string
): Verdict {
  const storyletId = stringValue(asPlainRecord(storylet.parsed).id) ?? storylet.node_id;
  return {
    validator: "observer_firewall",
    severity: "fail",
    code: "observer_firewall_violation_predicate_holder_mismatch",
    message: `${storyletId} predicate ${reference.path} expects ${expectedHolder} but ${reference.beliefId} is held by ${actualHolder}`,
    location: locationFor(storylet),
    detail: {
      storylet_id: storyletId,
      reference_path: reference.path,
      predicate_holder: reference.holder,
      expected_holder: expectedHolder,
      belief_id: reference.beliefId,
      belief_holder: actualHolder
    }
  };
}
