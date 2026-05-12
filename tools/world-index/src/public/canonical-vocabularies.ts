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

export const COMMITMENT_FAMILIES = [
  "presence_attention",
  "inquiry_discovery",
  "disclosure_expression",
  "secrecy_deception",
  "care_help_protection",
  "acceptance_alignment",
  "boundary_delay_withdrawal",
  "negotiation_exchange",
  "pressure_coercion",
  "conflict_force_evasion",
  "movement_exploration",
  "coordination_authority",
  "creation_study_worldwork",
  "moral_accounting",
  "intimacy_performance_ritual",
  "risk_survival_sacrifice"
] as const;

export type CommitmentFamily = (typeof COMMITMENT_FAMILIES)[number];

export const COMMITMENT_CLASSES = [
  "stay_available_without_pressure",
  "bear_witness",
  "mirror_acknowledgment",
  "listen_patiently",
  "observe_without_intervening",
  "ask_one_bounded_question",
  "ask_open_probe",
  "search_for_evidence",
  "verify_claim",
  "test_or_experiment",
  "confess_one_thing",
  "share_private_feeling",
  "reveal_secret",
  "warn_or_alert",
  "make_public_commitment",
  "conceal_under_pressure",
  "lie_or_fabricate",
  "misdirect_attention",
  "perform_false_identity",
  "private_betrayal",
  "offer_practical_help",
  "provide_comfort",
  "protect_from_harm",
  "rescue_or_extract",
  "teach_or_mentor",
  "heal_or_tend",
  "accept_offered_help",
  "accept_obligation",
  "join_or_ally",
  "trust_another",
  "submit_or_yield",
  "refuse_with_grace",
  "set_boundary",
  "withdraw_without_abandoning",
  "defer_decision",
  "break_contact",
  "request_favor",
  "bargain_or_trade",
  "offer_compromise",
  "ask_for_consent",
  "spend_resource",
  "release_pressure",
  "tighten_pressure",
  "make_demand",
  "issue_ultimatum",
  "force_disclosure",
  "escalate_to_confrontation",
  "attack_directly",
  "defend_against_attack",
  "pursue_or_chase",
  "flee_or_evade",
  "change_venue",
  "travel_toward_goal",
  "explore_environment",
  "infiltrate_location",
  "retreat_to_safety",
  "seek_third_party",
  "delegate_task",
  "lead_group_action",
  "enforce_rule",
  "defy_rule_or_order",
  "craft_or_build",
  "repair_or_restore",
  "alter_environment",
  "prepare_tool_or_plan",
  "study_or_train",
  "apologize_or_admit_fault",
  "forgive_or_grant_mercy",
  "punish_or_retribute",
  "make_restitution",
  "expose_wrongdoing",
  "intimacy_advance",
  "flirt_or_seduce",
  "perform_social_role",
  "conduct_ritual",
  "celebrate_or_play",
  "accept_risk",
  "sacrifice_resource_or_self_interest",
  "endure_hardship",
  "survive_by_improvising",
  "prioritize_self_preservation"
] as const;

export type CommitmentClass = (typeof COMMITMENT_CLASSES)[number];

export const COMMITMENT_CLASS_TO_FAMILY = {
  stay_available_without_pressure: "presence_attention",
  bear_witness: "presence_attention",
  mirror_acknowledgment: "presence_attention",
  listen_patiently: "presence_attention",
  observe_without_intervening: "presence_attention",
  ask_one_bounded_question: "inquiry_discovery",
  ask_open_probe: "inquiry_discovery",
  search_for_evidence: "inquiry_discovery",
  verify_claim: "inquiry_discovery",
  test_or_experiment: "inquiry_discovery",
  confess_one_thing: "disclosure_expression",
  share_private_feeling: "disclosure_expression",
  reveal_secret: "disclosure_expression",
  warn_or_alert: "disclosure_expression",
  make_public_commitment: "disclosure_expression",
  conceal_under_pressure: "secrecy_deception",
  lie_or_fabricate: "secrecy_deception",
  misdirect_attention: "secrecy_deception",
  perform_false_identity: "secrecy_deception",
  private_betrayal: "secrecy_deception",
  offer_practical_help: "care_help_protection",
  provide_comfort: "care_help_protection",
  protect_from_harm: "care_help_protection",
  rescue_or_extract: "care_help_protection",
  teach_or_mentor: "care_help_protection",
  heal_or_tend: "care_help_protection",
  accept_offered_help: "acceptance_alignment",
  accept_obligation: "acceptance_alignment",
  join_or_ally: "acceptance_alignment",
  trust_another: "acceptance_alignment",
  submit_or_yield: "acceptance_alignment",
  refuse_with_grace: "boundary_delay_withdrawal",
  set_boundary: "boundary_delay_withdrawal",
  withdraw_without_abandoning: "boundary_delay_withdrawal",
  defer_decision: "boundary_delay_withdrawal",
  break_contact: "boundary_delay_withdrawal",
  request_favor: "negotiation_exchange",
  bargain_or_trade: "negotiation_exchange",
  offer_compromise: "negotiation_exchange",
  ask_for_consent: "negotiation_exchange",
  spend_resource: "negotiation_exchange",
  release_pressure: "pressure_coercion",
  tighten_pressure: "pressure_coercion",
  make_demand: "pressure_coercion",
  issue_ultimatum: "pressure_coercion",
  force_disclosure: "pressure_coercion",
  escalate_to_confrontation: "conflict_force_evasion",
  attack_directly: "conflict_force_evasion",
  defend_against_attack: "conflict_force_evasion",
  pursue_or_chase: "conflict_force_evasion",
  flee_or_evade: "conflict_force_evasion",
  change_venue: "movement_exploration",
  travel_toward_goal: "movement_exploration",
  explore_environment: "movement_exploration",
  infiltrate_location: "movement_exploration",
  retreat_to_safety: "movement_exploration",
  seek_third_party: "coordination_authority",
  delegate_task: "coordination_authority",
  lead_group_action: "coordination_authority",
  enforce_rule: "coordination_authority",
  defy_rule_or_order: "coordination_authority",
  craft_or_build: "creation_study_worldwork",
  repair_or_restore: "creation_study_worldwork",
  alter_environment: "creation_study_worldwork",
  prepare_tool_or_plan: "creation_study_worldwork",
  study_or_train: "creation_study_worldwork",
  apologize_or_admit_fault: "moral_accounting",
  forgive_or_grant_mercy: "moral_accounting",
  punish_or_retribute: "moral_accounting",
  make_restitution: "moral_accounting",
  expose_wrongdoing: "moral_accounting",
  intimacy_advance: "intimacy_performance_ritual",
  flirt_or_seduce: "intimacy_performance_ritual",
  perform_social_role: "intimacy_performance_ritual",
  conduct_ritual: "intimacy_performance_ritual",
  celebrate_or_play: "intimacy_performance_ritual",
  accept_risk: "risk_survival_sacrifice",
  sacrifice_resource_or_self_interest: "risk_survival_sacrifice",
  endure_hardship: "risk_survival_sacrifice",
  survive_by_improvising: "risk_survival_sacrifice",
  prioritize_self_preservation: "risk_survival_sacrifice"
} as const satisfies Record<CommitmentClass, CommitmentFamily>;

export type CommitmentClassToFamily = typeof COMMITMENT_CLASS_TO_FAMILY;

export function commitmentFamilyForClass(value: CommitmentClass): CommitmentFamily {
  return COMMITMENT_CLASS_TO_FAMILY[value];
}

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
