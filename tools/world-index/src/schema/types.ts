// Authoritative source: docs/FOUNDATIONS.md §Canon Fact Record Schema + specs/SPEC-01-world-index.md
// §Node types + §Edge types, with Change Log / modification-history structure taken from the
// canon-addition templates. Drift between these interfaces and those contracts is an indexer bug,
// not a ledger bug. The open object posture preserves unknown fields for future schema additions.

export const NODE_TYPES = [
  "canon_fact_record",
  "change_log_entry",
  "mystery_reserve_entry",
  "open_question_entry",
  "domain_file",
  "adjudication_record",
  "invariant",
  "ontology_category",
  "section",
  "subsection",
  "bullet_cluster",
  "character_record",
  "diegetic_artifact_record",
  "proposal_card",
  "proposal_batch",
  "character_proposal_card",
  "character_proposal_batch",
  "retcon_proposal_card",
  "audit_record",
  "named_entity",
  "scoped_reference"
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export const YAML_EDGE_TYPES = [
  "derived_from",
  "required_world_update",
  "affected_fact",
  "modified_by",
  "originates_in",
  "pre_figured_by",
  "applies_to",
  "pressures",
  "resolves",
  "firewall_for"
] as const;

export type YamlEdgeType = (typeof YAML_EDGE_TYPES)[number];

export const ATTRIBUTION_EDGE_TYPES = ["patched_by", "clarified_by"] as const;

export type AttributionEdgeType = (typeof ATTRIBUTION_EDGE_TYPES)[number];

export const ENTITY_EDGE_TYPES = ["mentions_entity"] as const;

export type EntityEdgeType = (typeof ENTITY_EDGE_TYPES)[number];

export const SCOPED_EDGE_TYPES = ["references_scoped_name", "references_record"] as const;

export type ScopedEdgeType = (typeof SCOPED_EDGE_TYPES)[number];

export const EDGE_TYPES = [
  ...YAML_EDGE_TYPES,
  ...ATTRIBUTION_EDGE_TYPES,
  ...ENTITY_EDGE_TYPES,
  ...SCOPED_EDGE_TYPES
] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

export type CanonFactStatus =
  | "hard_canon"
  | "soft_canon"
  | "contested_canon"
  | "mystery_reserve";

export type CanonScopeGeographic = "local" | "regional" | "global" | "cosmic";
export type CanonScopeTemporal = "ancient" | "historical" | "current" | "future" | "cyclical";
export type CanonScopeSocial =
  | "restricted_group"
  | "public"
  | "elite"
  | "secret"
  | "rumor";

export interface CanonScope {
  geographic: CanonScopeGeographic;
  temporal: CanonScopeTemporal;
  social: CanonScopeSocial;
  [key: string]: unknown;
}

export type CanonTruthWorldLevel = true | false | "uncertain";
export type CanonTruthDiegeticStatus =
  | "objective"
  | "believed"
  | "disputed"
  | "propagandistic"
  | "legendary";

export interface CanonTruthScope {
  world_level: CanonTruthWorldLevel;
  diegetic_status: CanonTruthDiegeticStatus;
  [key: string]: unknown;
}

export interface CanonDistribution {
  who_can_do_it?: string[];
  who_cannot_easily_do_it?: string[];
  why_not_universal?: string[];
  [key: string]: unknown;
}

export interface CanonSourceBasis {
  direct_user_approval: boolean;
  derived_from?: string[];
  [key: string]: unknown;
}

export interface CanonContradictionRisk {
  hard: boolean;
  soft: boolean;
  [key: string]: unknown;
}

export interface ModificationHistoryEntry {
  change_id: string;
  originating_cf: string;
  date: string;
  summary: string;
  [key: string]: unknown;
}

export interface CanonFactRecord {
  id: string;
  title: string;
  status: CanonFactStatus;
  type: string;
  statement: string;
  scope: CanonScope;
  truth_scope: CanonTruthScope;
  domains_affected: string[];
  prerequisites?: string[];
  distribution?: CanonDistribution;
  costs_and_limits?: string[];
  visible_consequences?: string[];
  required_world_updates: string[];
  source_basis: CanonSourceBasis;
  contradiction_risk?: CanonContradictionRisk;
  notes?: string;
  modification_history?: ModificationHistoryEntry[];
  pre_figured_by?: string[];
  [key: string]: unknown;
}

export type ChangeType =
  | "addition"
  | "scope_retcon"
  | "cost_retcon"
  | "perspective_retcon"
  | "chronology_retcon"
  | "ontology_retcon"
  | "clarification"
  | "de_canonization";

export interface ChangeLogScope {
  local_or_global: "local" | "global";
  changes_ordinary_life: boolean;
  creates_new_story_engines: boolean;
  mystery_reserve_effect: "unchanged" | "expands" | "narrows";
  [key: string]: unknown;
}

export interface RetconPolicyChecks {
  no_silent_edit: boolean;
  replacement_noted: boolean;
  no_stealth_diegetic_rewrite: boolean;
  net_contradictions_not_increased: boolean;
  world_identity_preserved: boolean;
  [key: string]: unknown;
}

export interface ChangeLogEntry {
  change_id: string;
  date: string;
  change_type: ChangeType;
  affected_fact_ids: string[];
  summary: string;
  reason: string[];
  scope: ChangeLogScope;
  downstream_updates: string[];
  impact_on_existing_texts: string[];
  severity_before_fix: number;
  severity_after_fix: number;
  retcon_policy_checks: RetconPolicyChecks;
  latent_burdens_introduced?: string[];
  notes?: string;
  [key: string]: unknown;
}

export interface NodeRow {
  node_id: string;
  world_slug: string;
  file_path: string;
  heading_path: string | null;
  byte_start: number;
  byte_end: number;
  line_start: number;
  line_end: number;
  node_type: NodeType;
  body: string;
  content_hash: string;
  anchor_checksum: string;
  summary: string | null;
  created_at_index_version: number;
}

export interface EdgeRow {
  edge_id: number;
  source_node_id: string;
  target_node_id: string | null;
  target_unresolved_ref: string | null;
  edge_type: EdgeType;
}

export interface EntityMentionRow {
  mention_id: number;
  node_id: string;
  surface_text: string;
  resolved_entity_id: string | null;
  resolution_kind: "canonical" | "alias" | "unresolved";
  extraction_method: "exact_canonical" | "exact_alias" | "heuristic_phrase";
}

export interface EntityRow {
  entity_id: string;
  world_slug: string;
  canonical_name: string;
  entity_kind: string | null;
  provenance_scope: "world" | "proposal" | "diegetic" | "audit";
  authority_level: "structured_anchor" | "explicit_assertion";
  source_node_id: string;
  source_field: string | null;
}

export interface EntityAliasRow {
  alias_id: number;
  entity_id: string;
  alias_text: string;
  alias_kind: "exact_structured" | "explicit_alias" | "normalized_form";
  source_node_id: string;
}

export interface FileVersionRow {
  world_slug: string;
  file_path: string;
  content_hash: string;
  last_indexed_at: string;
}

export interface AnchorChecksumRow {
  node_id: string;
  anchor_form: string;
  checksum: string;
}

export type ValidationSeverity = "fail" | "warn" | "info";

export interface ValidationResultRow {
  result_id: number;
  world_slug: string;
  validator_name: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  node_id: string | null;
  file_path: string | null;
  line_range_start: number | null;
  line_range_end: number | null;
  created_at: string;
}
