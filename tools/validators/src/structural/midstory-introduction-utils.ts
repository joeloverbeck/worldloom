import type { IndexedRecord } from "../framework/types.js";
import { asPlainRecord, stringArray, stringValue } from "./utils.js";

export type MidstoryIntroductionClass =
  "CLK" | "STSEC" | "STQ" | "THR" | "STENT" | "STCHAR" | "SREL" | "STPLAN" | "STEMO";
export type PlanRelation = typeof PLAN_RELATIONS[number];
export type NonPropagationReason = typeof NON_PROPAGATION_REASONS[number];

const CLK_TRIGGERS = [
  "deadline_declared",
  "pursuit_started",
  "exposure_accumulation_started",
  "faction_mobilized",
  "environmental_degradation_started",
  "mission_or_race_started",
  "staged_danger_became_trackable"
] as const;

const STSEC_TRIGGERS = [
  "lie_made_hidden_truth_branch_relevant",
  "hidden_truth_constrains_action",
  "clue_carrier_enters_play",
  "holder_access_changed",
  "protected_mystery_story_secret_needed"
] as const;

const STQ_TRIGGERS = [
  "promise_made",
  "explicit_question_raised",
  "unexplained_evidence_introduced",
  "affordance_setup_introduced",
  "open_decision_created"
] as const;

const THR_TRIGGERS = [
  "new_ongoing_causal_concern",
  "investigation_line_opened",
  "recovery_line_opened",
  "negotiation_line_opened",
  "mission_line_opened",
  "social_fallout_line_opened"
] as const;

const STENT_TRIGGERS = [
  "actor_enters_branch",
  "witness_needed",
  "information_source_enters",
  "pressure_driver_enters",
  "counterparty_enters",
  "choice_target_enters"
] as const;

const STCHAR_TRIGGERS = [
  "story_character_authority_distilled",
  "story_character_authority_regenerated",
  "story_local_character_authority_created"
] as const;

const SREL_TRIGGERS = [
  "alliance_forms",
  "rivalry_forms",
  "debt_relation_forms",
  "authority_relation_forms",
  "trust_axis_becomes_relevant",
  "fear_axis_becomes_relevant",
  "desire_axis_becomes_relevant",
  "intimacy_axis_becomes_relevant",
  "loyalty_axis_becomes_relevant",
  "resentment_axis_becomes_relevant",
  "power_imbalance_axis_becomes_relevant",
  "attention_axis_becomes_relevant",
  "familiarity_axis_becomes_relevant",
  "approval_axis_becomes_relevant",
  "respect_axis_becomes_relevant",
  "obligation_axis_becomes_relevant",
  "hostility_axis_becomes_relevant"
] as const;

const STPLAN_TRIGGERS = [
  "tactical_approach_committed",
  "resource_gained_enables_plan",
  "blocker_requires_plan",
  "pressure_forces_plan",
  "opportunity_recognized",
  "counterparty_plan_observed"
] as const;

const STEMO_TRIGGERS = [
  "event_revealed_truth_to_actor",
  "event_threatened_actor_or_charge",
  "event_harmed_actor_or_charge",
  "event_relieved_pressure_on_actor",
  "event_violated_actor_principle_or_value",
  "event_changed_relationship_with_other",
  "accumulated_pressure_crossed_threshold"
] as const;

export const PLAN_RELATIONS = [
  "advances",
  "tests",
  "blocks",
  "revises",
  "fulfills",
  "abandons",
  "ignores"
] as const;

export const NON_PROPAGATION_REASONS = [
  "no_witness",
  "witness_incapacitated",
  "evidence_concealed",
  "institution_suppresses_report",
  "event_leaves_no_accessible_trace"
] as const;

export const MIDSTORY_TRIGGERS_CLK = CLK_TRIGGERS;
export const MIDSTORY_TRIGGERS_STSEC = STSEC_TRIGGERS;
export const MIDSTORY_TRIGGERS_STQ = STQ_TRIGGERS;
export const MIDSTORY_TRIGGERS_THR = THR_TRIGGERS;
export const MIDSTORY_TRIGGERS_STENT = STENT_TRIGGERS;
export const MIDSTORY_TRIGGERS_STCHAR = STCHAR_TRIGGERS;
export const MIDSTORY_TRIGGERS_SREL = SREL_TRIGGERS;
export const MIDSTORY_TRIGGERS_STPLAN = STPLAN_TRIGGERS;
export const MIDSTORY_TRIGGERS_STEMO = STEMO_TRIGGERS;

export const MIDSTORY_TRIGGERS_BY_CLASS: Readonly<Record<MidstoryIntroductionClass, readonly string[]>> = {
  CLK: CLK_TRIGGERS,
  STSEC: STSEC_TRIGGERS,
  STQ: STQ_TRIGGERS,
  THR: THR_TRIGGERS,
  STENT: STENT_TRIGGERS,
  STCHAR: STCHAR_TRIGGERS,
  SREL: SREL_TRIGGERS,
  STPLAN: STPLAN_TRIGGERS,
  STEMO: STEMO_TRIGGERS
};

export interface ParsedIntroduction {
  class: MidstoryIntroductionClass;
  recordId: string;
  trigger: string;
  evidence: string[];
  distinctFrom: string[];
  rationale?: string;
}

export interface ParsedStateRelation {
  relation: PlanRelation;
  targetRecord: string;
}

export interface ParsedNonPropagationFact {
  reason: NonPropagationReason;
  group: string;
  records: string[];
}

export function readSeIntroductions(event: IndexedRecord): ParsedIntroduction[] {
  const parsed = asPlainRecord(event.parsed);
  const introductions = parsed.record_introductions;
  if (!Array.isArray(introductions)) {
    return [];
  }

  const result: ParsedIntroduction[] = [];
  for (const entry of introductions) {
    const intro = asPlainRecord(entry);
    const recordId = stringValue(intro.record_id);
    const recordClass = stringValue(intro.class);
    const trigger = stringValue(intro.trigger);
    if (recordId === undefined || !isMidstoryIntroductionClass(recordClass) || trigger === undefined) {
      continue;
    }

    const rationale = stringValue(intro.rationale);
    result.push({
      class: recordClass,
      recordId,
      trigger,
      evidence: stringArray(intro.evidence),
      distinctFrom: stringArray(intro.distinct_from),
      ...(rationale === undefined ? {} : { rationale })
    });
  }
  return result;
}

export function readSeStateRelations(event: IndexedRecord): ParsedStateRelation[] {
  const parsed = asPlainRecord(event.parsed);
  const relations = parsed.state_relations;
  if (!Array.isArray(relations)) {
    return [];
  }

  const result: ParsedStateRelation[] = [];
  for (const entry of relations) {
    const relationRecord = asPlainRecord(entry);
    const relation = stringValue(relationRecord.relation);
    const targetRecord = stringValue(relationRecord.target_record);
    if (!isPlanRelation(relation) || targetRecord === undefined) {
      continue;
    }
    result.push({ relation, targetRecord });
  }
  return result;
}

export function readSeNonPropagationFacts(event: IndexedRecord): ParsedNonPropagationFact[] {
  const parsed = asPlainRecord(event.parsed);
  const facts = parsed.non_propagation_facts;
  if (!Array.isArray(facts)) {
    return [];
  }

  const result: ParsedNonPropagationFact[] = [];
  for (const entry of facts) {
    const fact = asPlainRecord(entry);
    const reason = stringValue(fact.reason);
    const group = stringValue(fact.group);
    if (!isNonPropagationReason(reason) || group === undefined) {
      continue;
    }
    result.push({
      reason,
      group,
      records: stringArray(fact.records)
    });
  }
  return result;
}

function isMidstoryIntroductionClass(value: unknown): value is MidstoryIntroductionClass {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MIDSTORY_TRIGGERS_BY_CLASS, value);
}

function isPlanRelation(value: unknown): value is PlanRelation {
  return typeof value === "string" && PLAN_RELATIONS.includes(value as PlanRelation);
}

function isNonPropagationReason(value: unknown): value is NonPropagationReason {
  return typeof value === "string" && NON_PROPAGATION_REASONS.includes(value as NonPropagationReason);
}
