export const CANONICAL_DOMAINS: readonly string[] = [
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
  "economy",
  "settlement_life",
  "memory_and_myth",
  "magic",
  "medicine",
  "status_order",
  "warfare",
  "taboo_and_pollution"
] as const;

const CANONICAL_DOMAIN_SET = new Set(CANONICAL_DOMAINS);

export function isCanonicalDomain(value: string): boolean {
  return CANONICAL_DOMAIN_SET.has(value);
}
