// Shared types for the Manual Studio prompt module — consumed by
// compose/sections/translators/lint/write. Authoring these up front keeps
// downstream modules free of circular imports.

import type {
  ManualCharacterRecord,
  ManualRecord,
  ManualRecordClass,
  ManualStoryMetadata,
  PromptVisibility,
  RecordImportance,
} from "../schema/manual-story.js";

export interface PromptComposeInput {
  manualStoryRoot: string;
  repoRoot: string;
  moment_directive: string;
  included_cast: string[];
  included_records: string[];
  included_template_path?: string;
}

export interface SectionEmitterInput {
  metadata: ManualStoryMetadata;
  cast: ManualCharacterRecord[];
  records: ManualRecord[];
  included_cast_ids: string[];
  moment_directive: string;
  included_template_body: string | null;
  // SPEC-104: template-level forbidden_inventions[] (when a beat template
  // is selected). Threaded by compose stage 5 into section 12 alongside
  // the existing per-cast prose_constraints.forbidden_inventions.
  template_forbidden_inventions?: string[];
  handoff_summary?: string | null;
  pov_holder?: string | null;
  must_not_reveal?: string[];
  active_secrets_questions?: string[];
  recent_segment_last_paragraph: string | null;
  content_policy_body: string;
  prose_craft_contract_body: string;
}

export interface SectionEmitResult {
  body: string;
  consumed: string[];
}

export interface SectionAssemblyResult {
  markdown: string;
  section_map: Record<string, string[]>;
}

export type PromptLintTier = "hard" | "soft";

export interface PromptLintFinding {
  rule: string;
  tier: PromptLintTier;
  message: string;
  section?: string;
  snippet?: string;
}

export interface PromptLintResult {
  findings: PromptLintFinding[];
  cleanForCopy: boolean;
  blockingForCopy: boolean;
}

export interface PromptRunSidecarDraft {
  manual_story_slug: string;
  included_cast: string[];
  included_records: string[];
  included_template_path: string | null;
  moment_directive: string;
}

export interface PromptRunSidecar extends PromptRunSidecarDraft {
  id: string;
  created_at: string;
  prompt_sha256: string;
  /** @deprecated SPEC-106: write-omitted; read-tolerant for legacy sidecars only. */
  lint_override?: {
    findings: PromptLintFinding[];
    copied_anyway_at: string;
  };
}

export type PromptIncludedReason =
  | "explicitly_selected"
  | "pinned"
  | "active_secret_question"
  | "current_cast";

export type PromptExcludedReason =
  | "inactive"
  | "working_set_excluded"
  | "never_prompt";

export interface PromptIncludedRecord {
  id: string;
  title: string;
  class: ManualRecordClass;
  summary: string;
  importance: RecordImportance;
  prompt_visibility: PromptVisibility;
  involved_cast: string[];
  tags: string[];
  reason: PromptIncludedReason;
  section: string | null;
}

export interface PromptExcludedRecord {
  id: string;
  title: string;
  class: ManualRecordClass;
  summary: string;
  importance: RecordImportance;
  prompt_visibility: PromptVisibility;
  involved_cast: string[];
  tags: string[];
  reason: PromptExcludedReason;
}

export interface PromptSuppressedRecord {
  id: string;
  title: string;
  class: ManualRecordClass;
  summary: string;
  importance: RecordImportance;
  prompt_visibility: PromptVisibility;
  involved_cast: string[];
  tags: string[];
  reason: "must_not_reveal";
}

export interface PromptBlockedInput {
  ref: string;
  reason: string;
}

export interface PromptResolution {
  included: PromptIncludedRecord[];
  excluded: PromptExcludedRecord[];
  suppressed: PromptSuppressedRecord[];
  blocked: PromptBlockedInput[];
  section_map: Record<string, string[]>;
}

export interface PromptComposeResult {
  markdown: string;
  lint: PromptLintResult;
  sidecar_draft: PromptRunSidecarDraft;
  resolution: PromptResolution;
}
