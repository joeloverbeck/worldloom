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
