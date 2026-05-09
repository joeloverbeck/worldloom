export const CANONICAL_DOMAINS = [
  "labor",
  "embodiment",
  "social_norms",
  "architecture",
  "mobility",
  "law",
  "trade",
  "war",
  "kinship",
  "religion",
  "language",
  "status_signaling",
  "ecology",
  "daily_routine",
  "institutions",
  "everyday_life",
  "economy",
  "settlement_life",
  "memory_and_myth",
  "magic",
  "technology",
  "medicine",
  "status_order",
  "warfare",
  "geography",
  "taboo_and_pollution"
] as const;

export type CanonicalDomain = (typeof CANONICAL_DOMAINS)[number];

export const VERDICT_ENUM = [
  "ACCEPT",
  "ACCEPT_WITH_REQUIRED_UPDATES",
  "ACCEPT_AS_LOCAL_EXCEPTION",
  "ACCEPT_AS_CONTESTED_BELIEF",
  "REVISE_AND_RESUBMIT",
  "REJECT"
] as const;

export type VerdictEnumValue = (typeof VERDICT_ENUM)[number];

export const MYSTERY_STATUS_ENUM = ["active", "passive", "passive_depth", "forbidden"] as const;

export type MysteryStatusEnumValue = (typeof MYSTERY_STATUS_ENUM)[number];

export const MYSTERY_RESOLUTION_SAFETY_ENUM = ["none", "low", "medium", "high"] as const;

export type MysteryResolutionSafetyEnumValue = (typeof MYSTERY_RESOLUTION_SAFETY_ENUM)[number];

export const INVARIANT_CATEGORY_VALUES = [
  "ontological",
  "causal",
  "distribution",
  "social",
  "aesthetic_thematic"
] as const;

export type InvariantCategoryValue = (typeof INVARIANT_CATEGORY_VALUES)[number];

export const ENTITY_KIND_VALUES = [
  "entity",
  "species",
  "person",
  "faction",
  "institution",
  "polity",
  "place",
  "region",
  "route",
  "resource",
  "craft",
  "technology",
  "magic_practice",
  "belief",
  "ritual",
  "law",
  "taboo",
  "artifact",
  "hazard",
  "event",
  "historical_process",
  "social_role",
  "text_tradition",
  "ecological_system",
  "bodily_condition",
  "metaphysical_rule"
] as const;

export type EntityKindValue = (typeof ENTITY_KIND_VALUES)[number];

export const SEC_FILE_CLASS_VALUES = [
  "GEOGRAPHY",
  "PEOPLES_AND_SPECIES",
  "INSTITUTIONS",
  "ECONOMY_AND_RESOURCES",
  "MAGIC_OR_TECH_SYSTEMS",
  "EVERYDAY_LIFE",
  "TIMELINE"
] as const;

export type SecFileClassValue = (typeof SEC_FILE_CLASS_VALUES)[number];

export const CHANGE_TYPE_VALUES = [
  "addition",
  "addition_with_qualification",
  "scope_retcon",
  "cost_retcon",
  "perspective_retcon",
  "chronology_retcon",
  "ontology_retcon",
  "clarification",
  "de_canonization"
] as const;

export type ChangeTypeValue = (typeof CHANGE_TYPE_VALUES)[number];

export const REVISION_DIFFICULTY_VALUES = ["low", "medium", "high"] as const;

export type RevisionDifficultyValue = (typeof REVISION_DIFFICULTY_VALUES)[number];

export const COMMITMENT_CLASSES = [
  "stay_available_without_pressure",
  "offer_practical_help",
  "ask_one_bounded_question",
  "withdraw_without_abandoning",
  "confess_one_thing",
  "accept_offered_help",
  "refuse_with_grace",
  "escalate_to_confrontation",
  "conceal_under_pressure",
  "seek_third_party",
  "change_venue",
  "make_public_commitment",
  "private_betrayal",
  "bear_witness",
  "release_pressure",
  "tighten_pressure",
  "defer_decision",
  "force_disclosure",
  "mirror_acknowledgment",
  "intimacy_advance"
] as const;

export type CommitmentClass = (typeof COMMITMENT_CLASSES)[number];

export const ARC_ARCHETYPES = [
  "fragile_offer",
  "bounded_question",
  "confession_received",
  "refusal_and_aftercare",
  "practical_aid_attempt",
  "withdrawal_without_abandonment",
  "escalation_to_confrontation",
  "concealment_under_pressure",
  "third_party_intervention",
  "investigation_followup",
  "aftermath_processing",
  "route_change",
  "public_commitment",
  "private_betrayal",
  "intimacy_negotiation",
  "boundary_setting",
  "restitution_offered",
  "silent_witness",
  "forced_disclosure",
  "pressure_release"
] as const;

export type ArcArchetype = (typeof ARC_ARCHETYPES)[number];

export const NARRATIVE_POINTS = [
  "CONTINUE_ARC",
  "NATURAL_COMMITMENT_HINGE",
  "INTERRUPT_HINGE",
  "CONTINUE_ONLY_PAUSE",
  "TERMINAL_OR_CHAPTER_CLOSE"
] as const;

export type NarrativePoint = (typeof NARRATIVE_POINTS)[number];

export const STRONG_AXES = [
  "relationship_trajectory",
  "obligation_state",
  "information_posture",
  "risk_cost_exposure",
  "route_or_scene_type",
  "thread_pressure",
  "irreversibility",
  "character_intention"
] as const;

export type StrongAxis = (typeof STRONG_AXES)[number];

export const STRONG_OUTCOMES = [
  "succeeds",
  "partially_succeeds",
  "fails_with_consequence",
  "backfires",
  "accepted_with_limits",
  "refused_without_break",
  "partially_deflected",
  "interrupted_before_resolution"
] as const;

export type StrongOutcome = (typeof STRONG_OUTCOMES)[number];

export const STOP_PREDICATES = [
  "commitment_satisfied",
  "commitment_blocked",
  "commitment_overturned",
  "npc_makes_demand",
  "npc_makes_disclosure",
  "participant_exits",
  "scene_goal_resolves",
  "scene_goal_changes",
  "new_obligation_created",
  "open_thread_reprioritized",
  "time_or_location_changes",
  "irreversible_cost_imminent",
  "consent_boundary_imminent",
  "violence_or_harm_imminent",
  "forbidden_mystery_resolution_risk",
  "protagonist_goal_change_required",
  "selected_commitment_would_be_violated",
  "user_write_in_conflicts_with_envelope",
  "only_next_action_would_create_major_state_change"
] as const;

export type StopPredicate = (typeof STOP_PREDICATES)[number];

export const CF_TYPE_COMMON_VALUES = [
  "capability",
  "artifact",
  "law",
  "belief",
  "event",
  "institution",
  "species",
  "ritual",
  "taboo",
  "technology",
  "resource_distribution",
  "hidden_truth",
  "local_anomaly",
  "metaphysical_rule",
  "historical_process",
  "text_tradition",
  "hazard",
  "craft",
  "place",
  "polity",
  "route",
  "social_role",
  "ecological_system"
] as const;

export type CfTypeCommonValue = (typeof CF_TYPE_COMMON_VALUES)[number];

export const CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED = [
  "capability",
  "bloodline",
  "magic_practice",
  "technology",
  "divine_action",
  "artifact_dependent_truth",
  "exception_introducing_fact"
] as const;

export type CfTypeExceptionGovernanceRequiredValue = (typeof CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED)[number];

export const CF_TYPE_EPISTEMIC_PROFILE_REQUIRED = [
  ...CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED,
  "institution_with_secrecy",
  "knowledge_asymmetric_fact"
] as const;

export type CfTypeEpistemicProfileRequiredValue = (typeof CF_TYPE_EPISTEMIC_PROFILE_REQUIRED)[number];

export const CF_TYPE_VALUES = [
  "capability",
  "artifact",
  "law",
  "belief",
  "event",
  "institution",
  "species",
  "ritual",
  "taboo",
  "technology",
  "resource_distribution",
  "hidden_truth",
  "local_anomaly",
  "metaphysical_rule",
  "historical_process",
  "text_tradition",
  "hazard",
  "craft",
  "place",
  "polity",
  "route",
  "social_role",
  "ecological_system",
  "bloodline",
  "magic_practice",
  "divine_action",
  "artifact_dependent_truth",
  "exception_introducing_fact",
  "institution_with_secrecy",
  "knowledge_asymmetric_fact"
] as const;

export type CfTypeValue = (typeof CF_TYPE_VALUES)[number];

const CANONICAL_DOMAIN_SET = new Set<string>(CANONICAL_DOMAINS);

export function isCanonicalDomain(value: string): value is CanonicalDomain {
  return CANONICAL_DOMAIN_SET.has(value);
}

export function mysteryResolutionSafetyForStatus(status: string): readonly MysteryResolutionSafetyEnumValue[] {
  if (status === "forbidden") {
    return ["none"];
  }

  return ["low", "medium", "high"];
}
