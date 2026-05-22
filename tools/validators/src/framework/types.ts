import type {
  CanonFactRecord,
  ChangeLogEntry,
  CharacterDossier,
  DiegeticArtifactFrontmatter,
  InvariantRecord,
  MysteryRecord,
  NamedEntityRecord,
  NodeType,
  OpenQuestionRecord,
  SectionRecord
} from "@worldloom/world-index/public/types";
import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
export type { PatchPlanEnvelope } from "@worldloom/patch-engine";

export type RunMode = "pre-apply" | "full-world" | "incremental";

export type VerdictSeverity = "fail" | "warn" | "info";

export interface Verdict {
  validator: string;
  severity: "fail" | "warn" | "info";
  code: string;
  message: string;
  location: {
    file: string;
    line_range?: [number, number];
    node_id?: string;
  };
  detail?: unknown;
  suggested_fix?: string;
}

export interface ValidatorExecution {
  name: string;
  status: "pass" | "fail" | "skipped";
  duration_ms: number;
  detail?: string;
}

export interface ValidatorRun {
  run_mode: RunMode;
  world_slug: string;
  started_at: string;
  finished_at: string;
  verdicts: Verdict[];
  summary: {
    fail_count: number;
    warn_count: number;
    info_count: number;
    validators_run: string[];
    validators_skipped: Array<{ name: string; reason: string }>;
    executions: ValidatorExecution[];
  };
}

export type IndexedRecordValue =
  | CanonFactRecord
  | ChangeLogEntry
  | InvariantRecord
  | MysteryRecord
  | OpenQuestionRecord
  | NamedEntityRecord
  | SectionRecord
  | CharacterDossier
  | DiegeticArtifactFrontmatter
  | Record<string, unknown>;

export interface IndexedRecord {
  node_id: string;
  node_type: NodeType | string;
  world_slug: string;
  story_slug?: string | null;
  file_path: string;
  content_hash?: string;
  parsed: IndexedRecordValue;
}

export interface WorldIndexReadSurface {
  query(args: {
    record_type?: NodeType | string;
    world_slug: string;
    story_slug?: string | null;
  }): Promise<IndexedRecord[]>;
  queryEdges?(args: {
    edge_type?: string;
    world_slug: string;
    story_slug?: string | null;
  }): Promise<IndexedEdge[]>;
}

export interface IndexedEdge {
  source_node_id: string;
  target_node_id: string | null;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug?: string | null;
}

export interface Context {
  run_mode: RunMode;
  world_slug: string;
  story_slug?: string;
  index: WorldIndexReadSurface;
  touched_files: string[];
  patch_plan?: PatchPlanEnvelope;
  pre_apply_existing_files?: readonly string[];
}

export interface Validator<TInput = unknown> {
  name: string;
  severity_mode: VerdictSeverity;
  applies_to: (ctx: Context) => boolean;
  run: (input: TInput, ctx: Context) => Promise<Verdict[]>;
  skip_reason?: string;
}
