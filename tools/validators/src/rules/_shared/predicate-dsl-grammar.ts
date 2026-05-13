// Structural constants derived from .claude/skills/_shared-templates/story-state-contract.md section 5.
// Keep this helper limited to closed runtime grammar; story/world-local labels stay open typed strings.

export const PRED_TYPES = [
  "fact_true",
  "belief",
  "entity_status",
  "relationship_axis",
  "obligation_open",
  "consequence_pending",
  "thread_active",
  "location",
  "has_affordance",
  "record_active",
  "intention_active",
  "object_accessible",
  "artifact_accessible",
  "affordance_available_to",
  "not",
  "all",
  "any"
] as const;

export const RELATIONSHIP_AXES = [
  "trust",
  "fear",
  "desire",
  "debt",
  "intimacy",
  "loyalty",
  "resentment",
  "power_imbalance",
  "attention",
  "familiarity",
  "approval",
  "respect",
  "obligation",
  "hostility"
] as const;

export const ACTION_FAMILIES = [
  "move",
  "evade",
  "pursue",
  "perceive",
  "investigate",
  "communicate",
  "persuade",
  "negotiate",
  "bond",
  "oppose",
  "harm",
  "protect",
  "control",
  "transfer",
  "use",
  "make_change",
  "ritual_protocol",
  "recover",
  "wait",
  "decide"
] as const;

export const BELIEF_MODES = [
  "knows",
  "believes",
  "suspects",
  "doubts",
  "denies",
  "reports",
  "claims",
  "deceives",
  "misremembers",
  "interprets"
] as const;

export const CONFIDENCE_LEVELS = ["certain", "high", "medium", "low", "uncommitted"] as const;

export const PREDICATE_ARG_SCHEMAS = {
  fact_true: { required: ["fact"] },
  belief: { required: ["holder", "claim"] },
  entity_status: { required: ["entity", "axis", "value"] },
  relationship_axis: { required: ["from", "to", "axis"] },
  obligation_open: { required: ["obligation"] },
  consequence_pending: { required: ["consequence"] },
  thread_active: { required: ["thread"] },
  location: { required: ["entity", "location"] },
  has_affordance: { required: ["action_family"] },
  record_active: { required: ["record"] },
  intention_active: { required: ["intention"] },
  object_accessible: { required: ["entity", "object"] },
  artifact_accessible: { required: ["entity", "artifact"] },
  affordance_available_to: { required: ["entity", "action_family"] },
  not: { required: ["predicate"] },
  all: { required: ["predicates"] },
  any: { required: ["predicates"] }
} as const satisfies Record<(typeof PRED_TYPES)[number], { required: readonly string[] }>;
