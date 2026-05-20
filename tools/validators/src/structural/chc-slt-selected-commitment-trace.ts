import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { aliasBindingsFor, resolveAliasBinding } from "./alias-binding-utils.js";
import { isBranchLocal, rootPageIdsForStory, type BranchRecordMaps } from "./branch-locality-utils.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

const VALIDATOR = "chc_slt_selected_commitment_trace";
const RECORD_ID = /^(?:STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO)-\d+$/;
const RECORD_ID_GLOBAL = /\b(?:STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO)-\d+\b/g;
const BOUND_EFFECT = /^bound:([A-Za-z][A-Za-z0-9_-]*)$/;
const BACKGROUND_MARKER = /eligibility_background_only\s*:\s*([^.;\n]+)/i;

const EXISTENTIAL_CLASS_BY_PREDICATE: ReadonlyMap<string, string> = new Map([
  ["any_plan_active", "STPLAN"],
  ["any_emotion_active", "STEMO"],
  ["any_obligation_open", "OBL"],
  ["any_consequence_pending", "CNSQ"],
  ["any_thread_active", "THR"],
  ["any_clock_active", "CLK"],
  ["any_secret_unrevealed", "STSEC"],
  ["any_story_question_open", "STQ"],
  ["any_relationship_axis", "SREL"],
  ["any_belief", "BEL"],
  ["any_intention", "STINT"]
]);

export const chcSltSelectedCommitmentTrace: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some(isStoryPageChoiceStoryletOrEventPatch)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/_source\/(?:pages\/PG-\d+|choices\/CHC-\d+|storylets\/SLT-\d+|events\/SE-\d+)\.yaml$|(?:^|\/)_source\/(?:pages\/PG-\d+|choices\/CHC-\d+|storylets\/SLT-\d+|events\/SE-\d+)\.yaml$/)),
  skip_reason: "selected CHC/SLT commitment trace only",
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of storySlugs(records)) {
      const maps = recordMapsForStory(records, storySlug);
      const rootPageIds = rootPageIdsForStory(maps);
      const events = maps.byType.get("story_event_record") ?? [];

      for (const event of events) {
        verdicts.push(...validateEvent(event, maps, rootPageIds));
      }
    }

    return verdicts;
  }
};

interface RecordMaps extends BranchRecordMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

interface PredicateBinding {
  pred: string;
  alias: string;
  expectedClass: string;
}

interface StaticPredicateRecord {
  id: string;
}

function isStoryPageChoiceStoryletOrEventPatch(patch: { op: string }): boolean {
  return patch.op === "create_pg_record" || patch.op === "create_chc_record" || patch.op === "create_slt_record" || patch.op === "create_se_record";
}

function validateEvent(
  event: IndexedRecord,
  maps: RecordMaps,
  rootPageIds: ReadonlySet<string>
): Verdict[] {
  const parsedEvent = asPlainRecord(event.parsed);
  const eventId = recordId(event);
  const selectedSltId = stringValue(asPlainRecord(parsedEvent.commitment).selected_slt_id);
  if (selectedSltId === undefined) {
    return [];
  }

  const storylet = maps.byId.get(selectedSltId);
  if (storylet === undefined) {
    return [eventVerdict(event, "fail", "selected_storylet_missing", `${eventId} selects missing ${selectedSltId}.`, { event_id: eventId, selected_slt_id: selectedSltId })];
  }

  const parentPage = maps.byId.get(stringValue(parsedEvent.parent_page_id) ?? "");
  const activeRecords = activeRecordIds(parentPage);
  const predicates = predicatesFor(storylet);
  const staticPredicates = staticPredicateRecords(predicates);
  const existentialPredicates = existentialBindings(predicates);
  const selectingRecordIds = new Set<string>(staticPredicates.map((predicate) => predicate.id));
  const verdicts: Verdict[] = [];

  for (const predicate of staticPredicates) {
    if (!activeRecords.has(predicate.id)) {
      verdicts.push(eventVerdict(event, "fail", "static_predicate_inactive", `${eventId} selects ${selectedSltId}, but static predicate record ${predicate.id} is not active in the parent page snapshot.`, {
        event_id: eventId,
        selected_slt_id: selectedSltId,
        record_id: predicate.id
      }));
    }
  }

  for (const predicate of existentialPredicates) {
    const bound = resolveAliasBinding(event, predicate.alias);
    if (bound === undefined) {
      verdicts.push(eventVerdict(event, "fail", "alias_binding_missing", `${eventId} selects ${selectedSltId}, but ${predicate.pred} alias ${predicate.alias} has no commitment.alias_bindings entry.`, {
        event_id: eventId,
        selected_slt_id: selectedSltId,
        predicate: predicate.pred,
        alias: predicate.alias
      }));
      continue;
    }
    selectingRecordIds.add(bound);
    if (recordClass(bound) !== predicate.expectedClass) {
      verdicts.push(eventVerdict(event, "fail", "alias_binding_wrong_class", `${eventId} binds ${predicate.alias} to ${bound}, but ${predicate.pred} requires ${predicate.expectedClass}.`, {
        event_id: eventId,
        selected_slt_id: selectedSltId,
        predicate: predicate.pred,
        alias: predicate.alias,
        bound_record: bound,
        expected_class: predicate.expectedClass
      }));
    }
    if (!activeRecords.has(bound)) {
      verdicts.push(eventVerdict(event, "fail", "alias_binding_not_active", `${eventId} binds ${predicate.alias} to ${bound}, but it is not active in the parent page snapshot.`, {
        event_id: eventId,
        selected_slt_id: selectedSltId,
        predicate: predicate.pred,
        alias: predicate.alias,
        bound_record: bound
      }));
    }
  }

  verdicts.push(...validateEffects(event, storylet));
  verdicts.push(...validateGrounding(event, storylet, maps, selectingRecordIds));
  verdicts.push(...validateAliasHygiene(event, storylet, maps, rootPageIds, existentialPredicates));

  return verdicts;
}

function validateEffects(event: IndexedRecord, storylet: IndexedRecord): Verdict[] {
  const parsedStorylet = asPlainRecord(storylet.parsed);
  const parsedEvent = asPlainRecord(event.parsed);
  const effects = asPlainRecord(parsedStorylet.effects);
  const stateDelta = asPlainRecord(parsedEvent.state_delta);
  const eventId = recordId(event);
  const storyletId = recordId(storylet);
  const verdicts: Verdict[] = [];

  for (const key of ["create", "supersede", "close"] as const) {
    const deltaIds = new Set(stringArray(stateDelta[key]));
    for (const effect of stringArray(effects[key])) {
      const resolved = resolveEffectReference(event, effect);
      if (resolved === undefined) {
        verdicts.push(eventVerdict(event, "fail", "bound_effect_unresolved", `${eventId} selects ${storyletId}, but SLT.effects.${key} references unresolved ${effect}.`, {
          event_id: eventId,
          selected_slt_id: storyletId,
          state_delta_key: key,
          effect
        }));
        continue;
      }
      if (!deltaIds.has(resolved)) {
        verdicts.push(eventVerdict(event, "fail", "effect_missing_from_state_delta", `${eventId} selects ${storyletId}, but SLT.effects.${key} ${effect} does not appear as ${resolved} in SE.state_delta.${key}.`, {
          event_id: eventId,
          selected_slt_id: storyletId,
          state_delta_key: key,
          effect,
          resolved_record: resolved
        }));
      }
    }

    for (const delta of stringArray(stateDelta[key])) {
      if (BOUND_EFFECT.test(delta) && resolveAliasBinding(event, delta) === undefined) {
        verdicts.push(eventVerdict(event, "fail", "state_delta_bound_alias_unresolved", `${eventId} state_delta.${key} references unresolved ${delta}.`, {
          event_id: eventId,
          state_delta_key: key,
          effect: delta
        }));
      }
    }
  }

  return verdicts;
}

function validateGrounding(
  event: IndexedRecord,
  storylet: IndexedRecord,
  maps: RecordMaps,
  selectingRecordIds: ReadonlySet<string>
): Verdict[] {
  const parsedEvent = asPlainRecord(event.parsed);
  if (stringValue(asPlainRecord(parsedEvent.commitment).selection_source) !== "emitted_choice" || selectingRecordIds.size === 0) {
    return [];
  }

  const selectedChoice = selectedChoiceForEvent(event, maps);
  if (selectedChoice === "ambiguous" || selectedChoice === undefined) {
    return [eventVerdict(event, "warn", "selected_choice_unresolvable", `${recordId(event)} selected ${recordId(storylet)}, but the emitted CHC cannot be uniquely resolved for grounding validation.`, {
      event_id: recordId(event),
      selected_slt_id: recordId(storylet),
      selecting_records: [...selectingRecordIds].sort()
    })];
  }

  const parsedChoice = asPlainRecord(selectedChoice.parsed);
  const groundedIds = new Set(stringArray(asPlainRecord(parsedChoice.grounded_in).records));
  if (hasIntersection(groundedIds, selectingRecordIds) || hasBackgroundRationale(parsedChoice, selectingRecordIds)) {
    return [];
  }

  if (hasClassOverlap(groundedIds, selectingRecordIds)) {
    return [choiceVerdict(selectedChoice, storylet, "warn", "weak_incidental_grounding", `${recordId(selectedChoice)} grounds in the same record class as a selecting predicate, but not the exact selected record.`, groundedIds, selectingRecordIds)];
  }
  return [choiceVerdict(selectedChoice, storylet, "fail", "missing_eligibility_source", `${recordId(selectedChoice)} is associated with ${recordId(storylet)} but grounds in no selecting predicate record and carries no eligibility_background_only rationale.`, groundedIds, selectingRecordIds)];
}

function validateAliasHygiene(
  event: IndexedRecord,
  storylet: IndexedRecord,
  maps: RecordMaps,
  rootPageIds: ReadonlySet<string>,
  existentialPredicates: readonly PredicateBinding[]
): Verdict[] {
  const eventId = recordId(event);
  const storyletId = recordId(storylet);
  const usedAliases = new Set(existentialPredicates.map((predicate) => predicate.alias));
  const effects = asPlainRecord(asPlainRecord(storylet.parsed).effects);
  for (const key of ["create", "supersede", "close"] as const) {
    for (const effect of stringArray(effects[key])) {
      const match = BOUND_EFFECT.exec(effect);
      if (match !== null) {
        usedAliases.add(match[1] ?? "");
      }
    }
  }

  const verdicts: Verdict[] = [];
  const branchId = eventBranchId(event, maps);
  const canCheckBranchLocality = branchId !== undefined && maps.byId.has(branchId);
  for (const [alias, bound] of aliasBindingsFor(event)) {
    if (!usedAliases.has(alias)) {
      verdicts.push(eventVerdict(event, "warn", "orphan_alias_binding", `${eventId} binds ${alias} to ${bound}, but ${storyletId} uses no matching existential predicate or bound effect.`, {
        event_id: eventId,
        selected_slt_id: storyletId,
        alias,
        bound_record: bound
      }));
    }
    if (canCheckBranchLocality && !isBranchLocal(bound, { branchId, maps, rootPageIds })) {
      verdicts.push(eventVerdict(event, "fail", "alias_binding_cross_branch", `${eventId} binds ${alias} to ${bound}, but that record is not branch-local to ${branchId}.`, {
        event_id: eventId,
        selected_slt_id: storyletId,
        alias,
        bound_record: bound,
        branch_id: branchId
      }));
    }
  }

  return verdicts;
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
    byId.set(record.node_id, record);
    const id = stringValue(asPlainRecord(record.parsed).id);
    if (id !== undefined) {
      byId.set(id, record);
    }
    const typed = byType.get(record.node_type) ?? [];
    typed.push(record);
    byType.set(record.node_type, typed);
  }

  return { byId, byType };
}

function predicatesFor(storylet: IndexedRecord): unknown[] {
  const preconditions = asPlainRecord(asPlainRecord(storylet.parsed).preconditions);
  return [...arrayValue(preconditions.hard), ...arrayValue(preconditions.soft)];
}

function staticPredicateRecords(predicates: readonly unknown[]): StaticPredicateRecord[] {
  const ids = new Set<string>();
  for (const predicate of predicates) {
    collectRecordIds(predicate, ids);
  }
  return [...ids].map((id) => ({ id }));
}

function existentialBindings(predicates: readonly unknown[]): PredicateBinding[] {
  const bindings: PredicateBinding[] = [];
  for (const predicate of predicates) {
    collectExistentialBindings(predicate, bindings);
  }
  return bindings;
}

function collectExistentialBindings(value: unknown, bindings: PredicateBinding[]): void {
  const record = asPlainRecord(value);
  const pred = stringValue(record.pred);
  const alias = stringValue(record.alias);
  const expectedClass = pred === undefined ? undefined : EXISTENTIAL_CLASS_BY_PREDICATE.get(pred);
  if (pred !== undefined && alias !== undefined && expectedClass !== undefined) {
    bindings.push({ pred, alias, expectedClass });
  }
  for (const nested of Object.values(record)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        collectExistentialBindings(item, bindings);
      }
    } else if (typeof nested === "object" && nested !== null) {
      collectExistentialBindings(nested, bindings);
    }
  }
}

function collectRecordIds(value: unknown, ids: Set<string>): void {
  if (typeof value === "string") {
    if (RECORD_ID.test(value)) {
      ids.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecordIds(item, ids);
    }
    return;
  }
  const record = asPlainRecord(value);
  for (const [key, item] of Object.entries(record)) {
    if (key === "alias" || key === "bind" || key === "bound_alias") {
      continue;
    }
    collectRecordIds(item, ids);
  }
}

function activeRecordIds(page: IndexedRecord | undefined): Set<string> {
  const activeRecords = asPlainRecord(asPlainRecord(asPlainRecord(page?.parsed).state_snapshot).active_records);
  const ids = new Set<string>();
  for (const value of Object.values(activeRecords)) {
    for (const id of stringArray(value)) {
      ids.add(id);
    }
  }
  return ids;
}

function selectedChoiceForEvent(event: IndexedRecord, maps: RecordMaps): IndexedRecord | "ambiguous" | undefined {
  const parsedEvent = asPlainRecord(event.parsed);
  const selectedSltId = stringValue(asPlainRecord(parsedEvent.commitment).selected_slt_id);
  if (selectedSltId === undefined) {
    return undefined;
  }

  const createdPage = maps.byId.get(stringValue(parsedEvent.created_at_page) ?? "");
  const inputChoiceId = stringValue(asPlainRecord(asPlainRecord(createdPage?.parsed).input).choice_id);
  if (inputChoiceId !== undefined) {
    const inputChoice = maps.byId.get(inputChoiceId);
    if (inputChoice !== undefined && stringValue(asPlainRecord(inputChoice.parsed).associated_commitment_block) === selectedSltId) {
      return inputChoice;
    }
  }

  const parentPage = maps.byId.get(stringValue(parsedEvent.parent_page_id) ?? "");
  const emittedChoices = stringArray(asPlainRecord(parentPage?.parsed).emitted_choices)
    .map((id) => maps.byId.get(id))
    .filter((choice): choice is IndexedRecord => choice !== undefined)
    .filter((choice) => stringValue(asPlainRecord(choice.parsed).associated_commitment_block) === selectedSltId);

  if (emittedChoices.length === 1) {
    return emittedChoices[0];
  }
  return emittedChoices.length > 1 ? "ambiguous" : undefined;
}

function eventBranchId(event: IndexedRecord, maps: RecordMaps): string | undefined {
  const parsedEvent = asPlainRecord(event.parsed);
  const createdPage = maps.byId.get(stringValue(parsedEvent.created_at_page) ?? "");
  return stringValue(asPlainRecord(createdPage?.parsed).branch_id);
}

function resolveEffectReference(event: IndexedRecord, effect: string): string | undefined {
  if (BOUND_EFFECT.test(effect)) {
    return resolveAliasBinding(event, effect);
  }
  return RECORD_ID.test(effect) ? effect : undefined;
}

function hasBackgroundRationale(choice: Record<string, unknown>, eligibilityIds: ReadonlySet<string>): boolean {
  const pressure = stringValue(choice.likely_state_pressure);
  if (pressure === undefined) {
    return false;
  }
  const marker = BACKGROUND_MARKER.exec(pressure);
  if (marker === null) {
    return false;
  }
  const value = marker[1]?.trim() ?? "";
  if (/\ball\b/i.test(value)) {
    return true;
  }
  const citedIds = new Set(value.match(RECORD_ID_GLOBAL) ?? []);
  return hasIntersection(citedIds, eligibilityIds);
}

function hasIntersection(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  for (const value of left) {
    if (right.has(value)) {
      return true;
    }
  }
  return false;
}

function hasClassOverlap(groundedIds: ReadonlySet<string>, eligibilityIds: ReadonlySet<string>): boolean {
  const groundedClasses = new Set([...groundedIds].map(recordClass));
  for (const id of eligibilityIds) {
    if (groundedClasses.has(recordClass(id))) {
      return true;
    }
  }
  return false;
}

function recordClass(id: string): string {
  return id.split("-")[0] ?? id;
}

function recordId(record: IndexedRecord): string {
  return stringValue(asPlainRecord(record.parsed).id) ?? record.node_id.split(":").pop() ?? record.node_id;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function eventVerdict(
  event: IndexedRecord,
  severity: "fail" | "warn",
  code: string,
  message: string,
  detail: Record<string, unknown>
): Verdict {
  return {
    validator: VALIDATOR,
    severity,
    code: `${VALIDATOR}.${code}`,
    message,
    location: locationFor(event),
    detail,
    suggested_fix: "Align SE.commitment.alias_bindings, SLT effects, CHC grounding, and the parent PG state snapshot so the selected commitment trace is deterministic."
  };
}

function choiceVerdict(
  choice: IndexedRecord,
  storylet: IndexedRecord,
  severity: "fail" | "warn",
  code: string,
  message: string,
  groundedIds: ReadonlySet<string>,
  eligibilityIds: ReadonlySet<string>
): Verdict {
  return {
    validator: VALIDATOR,
    severity,
    code: `${VALIDATOR}.${code}`,
    message,
    location: locationFor(choice),
    detail: {
      choice_id: recordId(choice),
      associated_commitment_block: recordId(storylet),
      grounded_records: [...groundedIds].sort(),
      selecting_records: [...eligibilityIds].sort()
    },
    suggested_fix: `Ground ${recordId(choice)} in the exact selected predicate record, or add an eligibility_background_only rationale to likely_state_pressure.`
  };
}
