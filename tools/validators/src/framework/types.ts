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
  suggested_fix?: string;
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
  file_path: string;
  parsed: IndexedRecordValue;
}

export interface WorldIndexReadSurface {
  query(args: {
    record_type?: NodeType | string;
    world_slug: string;
  }): Promise<IndexedRecord[]>;
}

export type PatchPlanEnvelope = Record<string, unknown>;

export interface Context {
  run_mode: RunMode;
  world_slug: string;
  index: WorldIndexReadSurface;
  touched_files: string[];
  patch_plan?: PatchPlanEnvelope;
}

export interface Validator<TInput = unknown> {
  name: string;
  severity_mode: VerdictSeverity;
  applies_to: (ctx: Context) => boolean;
  run: (input: TInput, ctx: Context) => Promise<Verdict[]>;
  skip_reason?: string;
}
