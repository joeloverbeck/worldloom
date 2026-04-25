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
